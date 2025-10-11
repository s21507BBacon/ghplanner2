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

  const membership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: userId,
    enterprise_id: enterpriseId,
    status: 'active'
  });

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this enterprise' }, { status: 403 });
  }

  const companies = await helpers.findMany<any>('companies', { 
    enterprise_id: enterpriseId 
  });

  return NextResponse.json({ 
    companies: companies.map((c: any) => ({ id: c.id, name: c.name })) 
  });
}
