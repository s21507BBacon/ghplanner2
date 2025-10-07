import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const enterpriseId = params.id;
  const userId = s.userId as string;
  const db = await connectToDatabase();
  
  const entMember = await db.collection<EnterpriseMembership>('enterpriseMemberships').findOne({ 
    userId, 
    enterpriseId 
  } as any);
  
  if (!entMember || (entMember.role !== 'owner' && entMember.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const memberships = await db.collection<EnterpriseMembership>('enterpriseMemberships')
    .find({ enterpriseId, status: 'active' } as any)
    .toArray();
  
  const userIds = memberships.map(m => m.userId);
  const users = await db.collection<AppUser>('users')
    .find({ id: { $in: userIds } } as any)
    .toArray();
  
  const assignments = await db.collection<Assignment>('assignments')
    .find({ userId: { $in: userIds } } as any)
    .toArray();
  
  const companies = await db.collection<Company>('companies')
    .find({ enterpriseId } as any)
    .toArray();
  
  const companyIds = companies.map(c => c.id);
  const projects = await db.collection<Project>('projects')
    .find({ companyId: { $in: companyIds } } as any)
    .toArray();
  
  const members = users.map(user => {
    const userAssignments = assignments.filter(a => a.userId === user.id);
    return {
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      assignments: userAssignments.map(a => {
        const project = projects.find(p => p.id === a.projectId);
        const company = companies.find(c => c.id === a.companyId);
        return {
          assignmentId: a.id,
          companyId: a.companyId,
          companyName: company?.name || 'Unknown',
          projectId: a.projectId,
          projectName: project?.name || 'Unknown',
          assignedAt: a.assignedAt,
        };
      }),
    };
  });
  
  return NextResponse.json({ 
    members, 
    companies: companies.map(c => ({ id: c.id, name: c.name })),
    projects: projects.map(p => ({ id: p.id, name: p.name, companyId: p.companyId, maxSeats: p.maxSeats }))
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const enterpriseId = params.id;
  const adminUserId = s.userId as string;
  const db = await connectToDatabase();
  const body = await request.json();
  const { userId, companyId, projectId } = body;
  
  const entMember = await db.collection<EnterpriseMembership>('enterpriseMemberships').findOne({ 
    userId: adminUserId, 
    enterpriseId 
  } as any);
  
  if (!entMember || (entMember.role !== 'owner' && entMember.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const project = await db.collection<Project>('projects').findOne({ id: projectId } as any);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  
  const assignments = await db.collection<Assignment>('assignments')
    .find({ projectId } as any)
    .toArray();
  
  if (assignments.length >= project.maxSeats) {
    return NextResponse.json({ error: 'Project is full' }, { status: 409 });
  }
  
  const existingAssignment = assignments.find(a => a.userId === userId);
  if (existingAssignment) {
    return NextResponse.json({ error: 'User already assigned to this project' }, { status: 409 });
  }
  
  const assignment: Assignment = {
    id: crypto.randomUUID(),
    userId,
    companyId,
    projectId,
    assignedAt: new Date(),
    assignedByUserId: adminUserId,
  };
  
  await db.collection<Assignment>('assignments').insertOne(assignment as any);
  
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const enterpriseId = params.id;
  const adminUserId = s.userId as string;
  const assignmentId = request.nextUrl.searchParams.get('assignmentId');
  
  if (!assignmentId) {
    return NextResponse.json({ error: 'assignmentId required' }, { status: 400 });
  }
  
  const db = await connectToDatabase();
  
  const entMember = await db.collection<EnterpriseMembership>('enterpriseMemberships').findOne({ 
    userId: adminUserId, 
    enterpriseId 
  } as any);
  
  if (!entMember || (entMember.role !== 'owner' && entMember.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  const result = await db.collection<Assignment>('assignments').deleteOne({ id: assignmentId } as any);
  
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }
  
  return NextResponse.json({ ok: true });
}

