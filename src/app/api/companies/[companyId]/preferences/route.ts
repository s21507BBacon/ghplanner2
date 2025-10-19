import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Fetch user's preferences or all preferences (for admins)
export async function GET(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const { companyId } = params;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  // Resolve company and memberships
  const membership = await helpers.findOne<any>('memberships', { 
    user_id: userId, 
    company_id: companyId 
  });

  const company = await helpers.findOne<any>('companies', { id: companyId });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  // Determine admin privileges
  const adminRoles = ['owner', 'admin', 'company_admin'];
  const isCompanyAdmin = !!membership && adminRoles.includes(membership.role);

  let isEnterpriseAdmin = false;
  if (company?.enterprise_id) {
    const entMembership = await helpers.findOne<any>('enterprise_memberships', {
      user_id: userId,
      enterprise_id: company.enterprise_id,
      status: 'active'
    });
    if (entMembership && adminRoles.includes(entMembership.role)) {
      isEnterpriseAdmin = true;
    }
  }

  const isAdmin = isCompanyAdmin || isEnterpriseAdmin;

  if (isAdmin) {
    try {
      // Detect optional columns (migration 017)
      const statusCol = await helpers.executeOne<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'project_preferences' AND column_name = 'status'`
      );
      const updatedAtCol = await helpers.executeOne<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'project_preferences' AND column_name = 'updated_at'`
      );

      const statusSelect = statusCol ? 'pp.status' : `'pending' as status`;
      const updatedAtSelect = updatedAtCol ? 'pp.updated_at' : 'NULL as updated_at';

      // Return all preferences for the company with user details
      const rows = await helpers.execute<any>(
        `SELECT 
          pp.id,
          pp.user_id,
          pp.project_id,
          pp.rank,
          ${statusSelect},
          pp.created_at,
          ${updatedAtSelect},
          u.name as user_name,
          u.email as user_email,
          p.name as project_name
        FROM project_preferences pp
        JOIN users u ON pp.user_id = u.id
        JOIN projects p ON pp.project_id = p.id
        WHERE pp.company_id = $1
        ORDER BY u.name, pp.rank`,
        companyId
      );

      return NextResponse.json({ preferences: rows });
    } catch (err: any) {
      console.error('[preferences][GET] query failed', { companyId, err });
      return NextResponse.json({ error: 'Failed to load preferences', detail: String(err?.message || err) }, { status: 500 });
    }
  } else {
    // Non-admins must be company members to see their own preferences
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const preferences = await helpers.findMany<any>('project_preferences', {
      user_id: userId,
      company_id: companyId
    });

    // Fetch project details for each preference
    const enrichedPreferences = await Promise.all(
      preferences.map(async (pref) => {
        const project = await helpers.findOne<any>('projects', { id: pref.project_id });
        return {
          ...pref,
          projectName: project?.name,
        };
      })
    );

    return NextResponse.json({ preferences: enrichedPreferences });
  }
}

// POST: Submit user preferences
export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const { companyId } = params;
  const body = await request.json();
  const { preferences } = body as { preferences: Array<{ projectId: string; rank: number }> };

  if (!preferences || !Array.isArray(preferences) || preferences.length === 0) {
    return NextResponse.json({ error: 'Preferences array required' }, { status: 400 });
  }

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  // Check user access to company, create membership if doesn't exist
  let membership = await helpers.findOne<any>('memberships', { 
    user_id: userId, 
    company_id: companyId 
  });

  if (!membership) {
    // Check if user is in the enterprise that owns this company
    const company = await helpers.findOne<any>('companies', { id: companyId });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company.enterprise_id) {
      // Check if user is member of the enterprise
      const enterpriseMembership = await helpers.findOne<any>('enterprise_memberships', {
        user_id: userId,
        enterprise_id: company.enterprise_id,
        status: 'active'
      });

      if (enterpriseMembership) {
        // Auto-create company membership for enterprise members
        const now = Date.now();
        membership = {
          id: crypto.randomUUID(),
          user_id: userId,
          company_id: companyId,
          role: 'member',
          status: 'active',
          allocation_status: 'unallocated',
          created_at: now
        };
        await helpers.insert('memberships', membership);
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Delete existing preferences for this user and company
  await helpers.delete('project_preferences', {
    user_id: userId,
    company_id: companyId
  });

  // Insert new preferences
  const now = Date.now();
  for (const pref of preferences) {
    await helpers.insert('project_preferences', {
      id: crypto.randomUUID(),
      user_id: userId,
      company_id: companyId,
      project_id: pref.projectId,
      rank: pref.rank,
      status: 'pending',
      created_at: now,
      updated_at: now
    });
  }

  // Update membership allocation status
  await helpers.update(
    'memberships',
    { user_id: userId, company_id: companyId },
    { allocation_status: 'preference-submitted' }
  );

  return NextResponse.json({ success: true });
}

// DELETE: Clear user preferences
export async function DELETE(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const { companyId } = params;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  // Check user access to company
  const membership = await helpers.findOne<any>('memberships', { 
    user_id: userId, 
    company_id: companyId 
  });

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete preferences
  await helpers.delete('project_preferences', {
    user_id: userId,
    company_id: companyId
  });

  // Update membership allocation status
  await helpers.update(
    'memberships',
    { user_id: userId, company_id: companyId },
    { allocation_status: 'unallocated' }
  );

  return NextResponse.json({ success: true });
}
