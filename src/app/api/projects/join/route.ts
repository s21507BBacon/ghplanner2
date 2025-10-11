import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Project, Membership, Company, Assignment } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const db = getDatabase();
    const helpers = new DbHelpers(db);
  const { code } = await request.json();
  
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
  }
  
  const project = await db.collection<Project>('projects').findOne({ inviteCode: code.trim().toUpperCase() } as any);
  
  if (!project) {
    return NextResponse.json({ error: 'Invalid join code' }, { status: 404 });
  }
  
  const assignments = await db.collection<Assignment>('assignments')
    .find({ projectId: project.id } as any)
    .toArray();
  
  if (assignments.length >= project.maxSeats) {
    return NextResponse.json({ error: 'Project is full' }, { status: 409 });
  }
  
  const existingAssignment = assignments.find(a => a.userId === userId);
  if (existingAssignment) {
    return NextResponse.json({ error: 'Already assigned to this project' }, { status: 409 });
  }
  
  const companyId = project.companyId;
  const company = await db.collection<Company>('companies').findOne({ id: companyId } as any);
  
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  
  const existingMembership = await db.collection<Membership>('memberships').findOne({ 
    companyId, 
    userId 
  } as any);
  
  if (!existingMembership) {
    const membership: Membership = {
      id: crypto.randomUUID(),
      userId,
      companyId,
      role: 'member',
      status: 'active',
      created_at: new Date(),
    };
    await db.collection<Membership>('memberships').insertOne(membership as any);
  }
  
  const assignment: Assignment = {
    id: crypto.randomUUID(),
    userId,
    companyId,
    projectId: project.id,
    assignedAt: new Date(),
    assignedByUserId: 'self',
  };
  await db.collection<Assignment>('assignments').insertOne(assignment as any);
  
  return NextResponse.json({ 
    ok: true, 
    companyId, 
    projectId: project.id,
    companyName: company.name,
    projectName: project.name
  });
}

