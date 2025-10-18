import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Company, EnterpriseMembership } from '@/lib/types';

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

  // Check membership - allow if user is a member OR if they have any pending/active membership
  const membership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: userId,
    enterprise_id: enterpriseId
  });

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this enterprise' }, { status: 403 });
  }

  // Get all companies in enterprise
  const allCompanies = await helpers.findMany<any>('companies', { 
    enterprise_id: enterpriseId 
  });
  const companyIds = allCompanies.map((c: any) => c.id);

  // For owners and admins, return all companies
  const isOwnerOrAdmin = membership.role === 'owner' || membership.role === 'admin' || membership.role === 'company_admin';
  
  if (isOwnerOrAdmin) {
    return NextResponse.json({ 
      companies: allCompanies.map((c: any) => ({ 
        id: c.id, 
        name: c.name,
        description: c.description 
      })) 
    });
  }

  // For regular members, only return companies they're assigned to
  const assignments = await helpers.findMany<any>('assignments', {
    user_id: userId
  });

  const assignedCompanyIds = Array.from(new Set(assignments.map((a: any) => a.company_id)));
  // Only consider assignments that belong to this enterprise's companies
  const assignedInThisEnterprise = assignedCompanyIds.filter((id: string) => companyIds.includes(id));
  
  // Onboarding fallback: if the member has no assignments yet, show all companies
  const visibleCompanies = assignedInThisEnterprise.length === 0
    ? allCompanies
    : allCompanies.filter((c: any) => assignedInThisEnterprise.includes(c.id));

  return NextResponse.json({ 
    companies: visibleCompanies.map((c: any) => ({ 
      id: c.id, 
      name: c.name,
      description: c.description 
    })) 
  });
}
