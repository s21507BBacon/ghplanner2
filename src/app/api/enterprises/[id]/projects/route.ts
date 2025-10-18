import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

  // Verify user is a member of this enterprise (any status for onboarding flow)
  const membership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: userId,
    enterprise_id: enterpriseId
  });

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this enterprise' }, { status: 403 });
  }

  // Get all companies in this enterprise
  const companies = await helpers.findMany<any>('companies', { 
    enterprise_id: enterpriseId 
  });

  const companyIds = companies.map(c => c.id);

  // Get all projects for these companies
  let projects: any[] = [];
  if (companyIds.length > 0) {
    projects = await helpers.findWhereIn<any>('projects', 'company_id', companyIds);
  }

  return NextResponse.json({ 
    projects: projects.map((p: any) => ({ 
      id: p.id, 
      name: p.name,
      description: p.description,
      companyId: p.company_id
    })) 
  });
}
