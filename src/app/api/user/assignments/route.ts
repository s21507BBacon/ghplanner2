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
  
  // Raw rows are snake_case from DB; normalize where needed
  const rawAssignments = await helpers.findMany<any>('assignments', { user_id: userId });
  
  const companyIds = [...new Set(rawAssignments.map((a: any) => a.company_id))];
  const projectIds = rawAssignments.map((a: any) => a.project_id);
  
  const rawCompanies = await helpers.findWhereIn<any>('companies', 'id', companyIds);
  const rawProjects = await helpers.findWhereIn<any>('projects', 'id', projectIds);
  
  const memberships = await helpers.findWhereIn<Membership>('memberships', 'company_id', companyIds, { user_id: userId });
  
  const enterpriseIds = [...new Set(rawCompanies.filter((c: any) => c.enterprise_id).map((c: any) => c.enterprise_id as string))];
  const enterpriseMemberships = await helpers.findWhereIn<EnterpriseMembership>('enterprise_memberships', 'enterprise_id', enterpriseIds, { user_id: userId });

  // Check if user created any enterprises
  const createdEnterprises = await helpers.findMany<Enterprise>('enterprises', { owner_user_id: userId });
  
  const isOwnerOrAdmin = memberships.some((m: any) => m.role === 'owner' || m.role === 'admin' || m.role === 'company_admin') ||
                         enterpriseMemberships.some((m: any) => m.role === 'owner' || m.role === 'admin') ||
                         createdEnterprises.length > 0; // User created an enterprise

  const hasCreatedEnterprise = createdEnterprises.length > 0;
  
  // Build response using camelCase fields
  const companiesWithProjects = rawCompanies.map((company: any) => ({
    id: company.id,
    name: company.name,
    enterpriseId: company.enterprise_id || undefined,
    projects: rawProjects
      .filter((p: any) => p.company_id === company.id)
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        maxSeats: p.max_seats,
        isActive: p.is_active,
      }))
  }));

  // Assigned projects only (joined from assignments)
  const companyNameById = new Map<string, string>(rawCompanies.map((c: any) => [c.id, c.name]));
  const projectById = new Map<string, any>(rawProjects.map((p: any) => [p.id, p]));
  const seenProjectIds = new Set<string>();
  const assignedProjects = rawAssignments.reduce((acc: any[], a: any) => {
    const p = projectById.get(a.project_id);
    if (!p) return acc;
    if (seenProjectIds.has(p.id)) return acc;
    seenProjectIds.add(p.id);
    acc.push({
      id: p.id,
      name: p.name,
      companyId: p.company_id,
      companyName: companyNameById.get(p.company_id) || '',
      maxSeats: p.max_seats,
      isActive: p.is_active,
    });
    return acc;
  }, [] as any[]);
  
  return NextResponse.json({
    assignments: companiesWithProjects,
    isOwnerOrAdmin,
    hasAssignments: rawAssignments.length > 0,
    hasCreatedEnterprise,
    assignedProjects,
  });
}

