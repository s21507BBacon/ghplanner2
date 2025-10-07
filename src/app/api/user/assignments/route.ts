import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Assignment, Company, Project, Membership, EnterpriseMembership, Enterprise } from '@/lib/types';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const userId = s.userId as string;
  const db = await connectToDatabase();
  
  const assignments = await db.collection<Assignment>('assignments')
    .find({ userId } as any)
    .toArray();
  
  const companyIds = [...new Set(assignments.map(a => a.companyId))];
  const projectIds = assignments.map(a => a.projectId);
  
  const companies = await db.collection<Company>('companies')
    .find({ id: { $in: companyIds } } as any)
    .toArray();
  
  const projects = await db.collection<Project>('projects')
    .find({ id: { $in: projectIds } } as any)
    .toArray();
  
  const memberships = await db.collection<Membership>('memberships')
    .find({ userId, companyId: { $in: companyIds } } as any)
    .toArray();
  
  const enterpriseIds = [...new Set(companies.filter(c => c.enterpriseId).map(c => c.enterpriseId!))];
  const enterpriseMemberships = await db.collection<EnterpriseMembership>('enterpriseMemberships')
    .find({ userId, enterpriseId: { $in: enterpriseIds } } as any)
    .toArray();

  // Check if user created any enterprises
  const createdEnterprises = await db.collection<Enterprise>('enterprises')
    .find({ ownerUserId: userId } as any)
    .toArray();
  
  const isOwnerOrAdmin = memberships.some(m => m.role === 'owner' || m.role === 'admin') ||
                         enterpriseMemberships.some(m => m.role === 'owner' || m.role === 'admin') ||
                         createdEnterprises.length > 0; // User created an enterprise

  const hasCreatedEnterprise = createdEnterprises.length > 0;
  
  const companiesWithProjects = companies.map(company => ({
    id: company.id,
    name: company.name,
    enterpriseId: company.enterpriseId,
    projects: projects
      .filter(p => p.companyId === company.id)
      .map(p => ({
        id: p.id,
        name: p.name,
        maxSeats: p.maxSeats,
        isActive: p.isActive,
      }))
  }));
  
  return NextResponse.json({
    assignments: companiesWithProjects,
    isOwnerOrAdmin,
    hasAssignments: assignments.length > 0,
    hasCreatedEnterprise,
  });
}

