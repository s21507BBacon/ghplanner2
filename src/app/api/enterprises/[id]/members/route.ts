import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { EnterpriseMembership, AppUser, Assignment, Company, Project } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const userId = s.userId as string;
  const enterpriseId = params.id;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  const membership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: userId,
    enterprise_id: enterpriseId,
    status: 'active'
  });

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this enterprise' }, { status: 403 });
  }

  const memberships = await helpers.findMany<any>('enterprise_memberships', {
    enterprise_id: enterpriseId
  });

  const userIds = memberships.map((m: any) => m.user_id);
  const users = userIds.length > 0 
    ? await helpers.findWhereIn<any>('users', 'id', userIds)
    : [];

  const userMap = new Map(users.map((u: any) => [u.id, u]));

  // Get all companies in this enterprise
  const companies = await helpers.findMany<any>('companies', {
    enterprise_id: enterpriseId
  });

  const companyIds = companies.map((c: any) => c.id);
  const companyMap = new Map(companies.map((c: any) => [c.id, c]));

  // Get all assignments for users in this enterprise for companies in this enterprise
  let assignments: any[] = [];
  if (userIds.length > 0 && companyIds.length > 0) {
    const userPlaceholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    const companyPlaceholders = companyIds.map((_, i) => `$${userIds.length + i + 1}`).join(',');
    assignments = await helpers.execute<any>(
      `SELECT * FROM assignments WHERE user_id IN (${userPlaceholders}) AND company_id IN (${companyPlaceholders})`,
      ...userIds, ...companyIds
    );
  }

  // Get all projects for these companies
  const projectIds = [...new Set(assignments.map((a: any) => a.project_id))];
  const projects = projectIds.length > 0
    ? await helpers.findWhereIn<any>('projects', 'id', projectIds)
    : [];

  const projectMap = new Map(projects.map((p: any) => [p.id, p]));

  // Group assignments by userId
  const assignmentsByUser = new Map<string, any[]>();
  for (const assignment of assignments) {
    if (!assignmentsByUser.has(assignment.user_id)) {
      assignmentsByUser.set(assignment.user_id, []);
    }
    const company = companyMap.get(assignment.company_id);
    const project = projectMap.get(assignment.project_id);
    if (company && project) {
      assignmentsByUser.get(assignment.user_id)!.push({
        assignmentId: assignment.id,
        companyName: company.name,
        projectName: project.name,
        companyId: assignment.company_id,
        projectId: assignment.project_id
      });
    }
  }

  const members = memberships.map((m: any) => {
    const user = userMap.get(m.user_id);
    return {
      id: m.user_id,
      userId: m.user_id,
      name: user?.name || user?.email || 'Unknown',
      email: user?.email,
      userName: user?.name,
      userEmail: user?.email,
      role: m.role,
      status: m.status,
      assignments: assignmentsByUser.get(m.user_id) || []
    };
  });

  // Get available companies and projects for assignment
  const availableCompanies = companies.map((c: any) => ({ id: c.id, name: c.name }));
  const allProjects = companyIds.length > 0
    ? await helpers.findWhereIn<any>('projects', 'company_id', companyIds)
    : [];
  const availableProjects = allProjects.map((p: any) => ({ 
    id: p.id, 
    name: p.name, 
    companyId: p.company_id 
  }));

  return NextResponse.json({ 
    members,
    companies: availableCompanies,
    projects: availableProjects
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const currentUserId = s.userId as string;
  const enterpriseId = params.id;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  const membership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: currentUserId,
    enterprise_id: enterpriseId,
    status: 'active'
  });

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return NextResponse.json({ error: 'Not authorised to manage members' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, companyId, projectId } = body;

  if (!userId || !companyId || !projectId) {
    return NextResponse.json({ error: 'userId, companyId and projectId required' }, { status: 400 });
  }

  const company = await helpers.findOne<any>('companies', {
    id: companyId,
    enterprise_id: enterpriseId
  });

  if (!company) {
    return NextResponse.json({ error: 'Company not found in this enterprise' }, { status: 404 });
  }

  const project = await helpers.findOne<any>('projects', {
    id: projectId,
    company_id: companyId
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found in this company' }, { status: 404 });
  }

  const existingAssignment = await helpers.findOne<any>('assignments', {
    user_id: userId,
    company_id: companyId,
    project_id: projectId
  });

  if (existingAssignment) {
    return NextResponse.json({ error: 'User already assigned to this project' }, { status: 409 });
  }

  const now = new Date();
  
  // Ensure user has enterprise membership
  const userMembership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: userId,
    enterprise_id: enterpriseId
  });

  if (!userMembership) {
    // Create enterprise membership for the user
    await helpers.insert('enterprise_memberships', {
      id: crypto.randomUUID(),
      user_id: userId,
      enterprise_id: enterpriseId,
      role: 'member',
      status: 'active',
      created_at: dateToTimestamp(now),
      updated_at: dateToTimestamp(now)
    });
  } else if (userMembership.status !== 'active') {
    // Reactivate membership if it exists but is inactive
    await helpers.update('enterprise_memberships',
      { id: userMembership.id },
      { status: 'active', updated_at: dateToTimestamp(now) }
    );
  }
  
  // Create project assignment
  const assignmentId = crypto.randomUUID();
  await helpers.insert('assignments', {
    id: assignmentId,
    user_id: userId,
    company_id: companyId,
    project_id: projectId,
    assigned_at: dateToTimestamp(now),
    assigned_by_user_id: currentUserId
  });

  return NextResponse.json({ success: true, assignmentId });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const currentUserId = s.userId as string;
  const enterpriseId = params.id;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  const membership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: currentUserId,
    enterprise_id: enterpriseId,
    status: 'active'
  });

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return NextResponse.json({ error: 'Not authorised to manage members' }, { status: 403 });
  }

  const assignmentId = request.nextUrl.searchParams.get('assignmentId');

  if (!assignmentId) {
    return NextResponse.json({ error: 'assignmentId required' }, { status: 400 });
  }

  const assignment = await helpers.findOne<any>('assignments', {
    id: assignmentId
  });

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const company = await helpers.findOne<any>('companies', {
    id: assignment.company_id,
    enterprise_id: enterpriseId
  });

  if (!company) {
    return NextResponse.json({ error: 'Assignment not in this enterprise' }, { status: 403 });
  }

  await helpers.delete('assignments', { id: assignmentId });

  return NextResponse.json({ success: true });
}
