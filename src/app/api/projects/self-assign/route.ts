import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Project, Membership, Company, Assignment, EnterpriseMembership } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = s.userId as string;
  const db = getDatabase();
  const helpers = new DbHelpers(db);
  
  const { projectId, companyId } = await request.json();
  
  if (!projectId || !companyId) {
    return NextResponse.json({ error: 'Project ID and Company ID are required' }, { status: 400 });
  }
  
  // Verify project exists
  const project = await helpers.findOne<Project>('projects', { id: projectId });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  
  // Verify company exists
  const company = await helpers.findOne<Company>('companies', { id: companyId });
  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }
  
  // Verify user is a member of the enterprise
  if (company.enterpriseId) {
    const enterpriseMemberships = await helpers.findMany<EnterpriseMembership>('enterprise_memberships', {
      enterprise_id: company.enterpriseId,
      user_id: userId
    });
    
    if (enterpriseMemberships.length === 0) {
      return NextResponse.json({ error: 'You are not a member of this enterprise' }, { status: 403 });
    }
  }
  
  // Check if project is full
  const assignments = await helpers.findMany<Assignment>('assignments', { projectId });
  if (assignments.length >= project.maxSeats) {
    return NextResponse.json({ error: 'Project is full' }, { status: 409 });
  }
  
  // Check if already assigned
  const existingAssignment = assignments.find(a => a.userId === userId);
  if (existingAssignment) {
    return NextResponse.json({ error: 'Already assigned to this project' }, { status: 409 });
  }
  
  // Create company membership if doesn't exist
  const existingMembership = await helpers.findOne<Membership>('memberships', { 
    company_id: companyId, 
    user_id: userId 
  });
  
  if (!existingMembership) {
    const membership: Membership = {
      id: crypto.randomUUID(),
      userId,
      companyId,
      role: 'member',
      status: 'active',
      createdAt: new Date(),
    };
    await helpers.insert('memberships', membership);
  }
  
  // Create assignment
  const assignment: Assignment = {
    id: crypto.randomUUID(),
    userId,
    companyId,
    projectId: project.id,
    assignedAt: new Date(),
    assignedByUserId: 'self',
  };
  await helpers.insert('assignments', assignment);
  
  return NextResponse.json({ 
    ok: true, 
    companyId, 
    projectId: project.id,
    companyName: company.name,
    projectName: project.name
  });
}
