import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
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
  const db = getDatabase();
  const helpers = new DbHelpers(db);
  
  const assignments = await helpers.findMany<Assignment>('assignments', { user_id: userId });
  
  const companyIds = [...new Set(assignments.map(a => a.companyId))];
  const projectIds = assignments.map(a => a.projectId);
  
  const companies = await helpers.findWhereIn<Company>('companies', 'id', companyIds);
  
  const projects = await helpers.findWhereIn<Project>('projects', 'id', projectIds);
  
  const memberships = await helpers.findWhereIn<Membership>('memberships', 'company_id', companyIds, { user_id: userId });
  
  const enterpriseIds = [...new Set(companies.filter(c => c.enterpriseId).map(c => c.enterpriseId!))];
  const enterpriseMemberships = await helpers.findWhereIn<EnterpriseMembership>('enterprise_memberships', 'enterprise_id', enterpriseIds, { user_id: userId });

  // Check if user created any enterprises
  const createdEnterprises = await helpers.findMany<Enterprise>('enterprises', { owner_user_id: userId });
  
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

