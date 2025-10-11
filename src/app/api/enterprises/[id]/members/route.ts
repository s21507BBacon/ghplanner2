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

  const membership = await db.collection<EnterpriseMembership>('enterpriseMemberships').findOne({
    userId,
    enterpriseId,
    status: 'active'
  } as any);

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this enterprise' }, { status: 403 });
  }

  const memberships = await db.collection<EnterpriseMembership>('enterpriseMemberships').find({
    enterpriseId
  } as any).toArray();

  const userIds = memberships.map(m => m.userId);
  const users = await db.collection<AppUser>('users').find({
    id: { $in: userIds }
  } as any).toArray();

  const userMap = new Map(users.map(u => [u.id, u]));

  // Get all companies in this enterprise
  const companies = await db.collection<Company>('companies').find({
    enterpriseId
  } as any).toArray();

  const companyIds = companies.map(c => c.id);
  const companyMap = new Map(companies.map(c => [c.id, c]));

  // Get all assignments for users in this enterprise for companies in this enterprise
  const assignments = await db.collection<Assignment>('assignments').find({
    userId: { $in: userIds },
    companyId: { $in: companyIds }
  } as any).toArray();

  // Get all projects for these companies
  const projectIds = [...new Set(assignments.map(a => a.projectId))];
  const projects = await db.collection<Project>('projects').find({
    id: { $in: projectIds }
  } as any).toArray();

  const projectMap = new Map(projects.map(p => [p.id, p]));

  // Group assignments by userId
  const assignmentsByUser = new Map<string, any[]>();
  for (const assignment of assignments) {
    if (!assignmentsByUser.has(assignment.userId)) {
      assignmentsByUser.set(assignment.userId, []);
    }
    const company = companyMap.get(assignment.companyId);
    const project = projectMap.get(assignment.projectId);
    if (company && project) {
      assignmentsByUser.get(assignment.userId)!.push({
        assignmentId: assignment.id,
        companyName: company.name,
        projectName: project.name,
        companyId: assignment.companyId,
        projectId: assignment.projectId
      });
    }
  }

  const members = memberships.map(m => {
    const user = userMap.get(m.userId);
    return {
      id: m.userId,
      userId: m.userId,
      name: user?.name || user?.email || 'Unknown',
      email: user?.email,
      userName: user?.name,
      userEmail: user?.email,
      role: m.role,
      status: m.status,
      assignments: assignmentsByUser.get(m.userId) || []
    };
  });

  // Get available companies and projects for assignment
  const availableCompanies = companies.map(c => ({ id: c.id, name: c.name }));
  const allProjects = await db.collection<Project>('projects').find({
    companyId: { $in: companyIds }
  } as any).toArray();
  const availableProjects = allProjects.map(p => ({ 
    id: p.id, 
    name: p.name, 
    companyId: p.companyId 
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

  const membership = await db.collection<EnterpriseMembership>('enterpriseMemberships').findOne({
    userId: currentUserId,
    enterpriseId,
    status: 'active'
  } as any);

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return NextResponse.json({ error: 'Not authorised to manage members' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, companyId, projectId } = body;

  if (!userId || !companyId || !projectId) {
    return NextResponse.json({ error: 'userId, companyId and projectId required' }, { status: 400 });
  }

  const company = await db.collection<Company>('companies').findOne({
    id: companyId,
    enterpriseId
  } as any);

  if (!company) {
    return NextResponse.json({ error: 'Company not found in this enterprise' }, { status: 404 });
  }

  const project = await db.collection<Project>('projects').findOne({
    id: projectId,
    companyId
  } as any);

  if (!project) {
    return NextResponse.json({ error: 'Project not found in this company' }, { status: 404 });
  }

  const existingAssignment = await db.collection<Assignment>('assignments').findOne({
    userId,
    companyId,
    projectId
  } as any);

  if (existingAssignment) {
    return NextResponse.json({ error: 'User already assigned to this project' }, { status: 409 });
  }

  const assignment: Assignment = {
    id: crypto.randomUUID(),
    userId,
    companyId,
    projectId,
    assignedAt: new Date(),
    assignedByUserId: currentUserId
  };

  await db.collection<Assignment>('assignments').insertOne(assignment as any);

  return NextResponse.json({ success: true, assignmentId: assignment.id });
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

  const membership = await db.collection<EnterpriseMembership>('enterpriseMemberships').findOne({
    userId: currentUserId,
    enterpriseId,
    status: 'active'
  } as any);

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return NextResponse.json({ error: 'Not authorised to manage members' }, { status: 403 });
  }

  const assignmentId = request.nextUrl.searchParams.get('assignmentId');

  if (!assignmentId) {
    return NextResponse.json({ error: 'assignmentId required' }, { status: 400 });
  }

  const assignment = await db.collection<Assignment>('assignments').findOne({
    id: assignmentId
  } as any);

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const company = await db.collection<Company>('companies').findOne({
    id: assignment.companyId,
    enterpriseId
  } as any);

  if (!company) {
    return NextResponse.json({ error: 'Assignment not in this enterprise' }, { status: 403 });
  }

  await db.collection<Assignment>('assignments').deleteOne({ id: assignmentId } as any);

  return NextResponse.json({ success: true });
}
