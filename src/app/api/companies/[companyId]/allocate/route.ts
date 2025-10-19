import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST: Allocate user to project (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const adminUserId = s.userId as string;
  const { companyId } = params;
  const body = await request.json();
  const { userId, projectId } = body as { userId: string; projectId: string };

  if (!userId || !projectId) {
    return NextResponse.json({ error: 'userId and projectId required' }, { status: 400 });
  }

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  // Check company exists
  const company = await helpers.findOne<any>('companies', { id: companyId });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Check admin access (company admin or enterprise admin)
  const adminMembership = await helpers.findOne<any>('memberships', { 
    user_id: adminUserId, 
    company_id: companyId 
  });

  const adminRoles = ['owner', 'admin', 'company_admin'];
  const isCompanyAdmin = !!adminMembership && adminRoles.includes(adminMembership.role);

  let isEnterpriseAdmin = false;
  if (company.enterprise_id) {
    const entMembership = await helpers.findOne<any>('enterprise_memberships', {
      user_id: adminUserId,
      enterprise_id: company.enterprise_id,
      status: 'active'
    });
    if (entMembership && adminRoles.includes(entMembership.role)) {
      isEnterpriseAdmin = true;
    }
  }

  if (!isCompanyAdmin && !isEnterpriseAdmin) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  // Check if project exists and belongs to company
  const project = await helpers.findOne<any>('projects', { 
    id: projectId,
    company_id: companyId 
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Check if project has capacity
  const currentAssignments = await helpers.findMany<any>('assignments', { 
    project_id: projectId 
  });

  if (currentAssignments.length >= project.max_seats) {
    return NextResponse.json({ error: 'Project is full' }, { status: 400 });
  }

  // Check if user is already assigned to this project
  const existingAssignment = await helpers.findOne<any>('assignments', {
    user_id: userId,
    project_id: projectId
  });

  if (existingAssignment) {
    return NextResponse.json({ error: 'User already assigned to this project' }, { status: 400 });
  }

  // Create assignment
  const now = Date.now();
  await helpers.insert('assignments', {
    id: crypto.randomUUID(),
    user_id: userId,
    company_id: companyId,
    project_id: projectId,
    assigned_at: now,
    assigned_by_user_id: adminUserId
  });

  // Update membership allocation status (if column exists)
  try {
    const hasAllocCol = await helpers.executeOne<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'allocation_status'`
    );
    if (hasAllocCol) {
      await helpers.update(
        'memberships',
        { user_id: userId, company_id: companyId },
        { allocation_status: 'allocated' }
      );
    }
  } catch (err) {
    console.error('[allocate][POST] membership allocation_status update skipped', err);
  }

  // Update preferences if status column exists (migration 017)
  try {
    const hasStatus = await helpers.executeOne<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'project_preferences' AND column_name = 'status'`
    );
    const hasUpdatedAt = await helpers.executeOne<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'project_preferences' AND column_name = 'updated_at'`
    );

    if (hasStatus) {
      if (hasUpdatedAt) {
        await helpers.execute(
          `UPDATE project_preferences SET status = 'allocated', updated_at = $1 WHERE user_id = $2 AND company_id = $3 AND project_id = $4`,
          now, userId, companyId, projectId
        );
        await helpers.execute(
          `UPDATE project_preferences SET status = 'rejected', updated_at = $1 WHERE user_id = $2 AND company_id = $3 AND project_id != $4 AND status = 'pending'`,
          now, userId, companyId, projectId
        );
      } else {
        await helpers.execute(
          `UPDATE project_preferences SET status = 'allocated' WHERE user_id = $1 AND company_id = $2 AND project_id = $3`,
          userId, companyId, projectId
        );
        await helpers.execute(
          `UPDATE project_preferences SET status = 'rejected' WHERE user_id = $1 AND company_id = $2 AND project_id != $3 AND status = 'pending'`,
          userId, companyId, projectId
        );
      }
    }
  } catch (err) {
    console.error('[allocate][POST] preference status update skipped', err);
  }

  return NextResponse.json({ success: true });
}

// DELETE: Remove user from project (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const adminUserId = s.userId as string;
  const { companyId } = params;
  
  const userId = request.nextUrl.searchParams.get('userId');
  const projectId = request.nextUrl.searchParams.get('projectId');

  if (!userId || !projectId) {
    return NextResponse.json({ error: 'userId and projectId required' }, { status: 400 });
  }

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  // Check admin access
  const adminMembership = await helpers.findOne<any>('memberships', { 
    user_id: adminUserId, 
    company_id: companyId 
  });

  if (!adminMembership || (adminMembership.role !== 'owner' && adminMembership.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  // Delete assignment
  await helpers.delete('assignments', {
    user_id: userId,
    company_id: companyId,
    project_id: projectId
  });

  // Check if user has any other assignments in this company
  const otherAssignments = await helpers.findMany<any>('assignments', {
    user_id: userId,
    company_id: companyId
  });

  // Update allocation status if no other assignments
  if (otherAssignments.length === 0) {
    await helpers.update(
      'memberships',
      { user_id: userId, company_id: companyId },
      { allocation_status: 'unallocated' }
    );
  }

  return NextResponse.json({ success: true });
}
