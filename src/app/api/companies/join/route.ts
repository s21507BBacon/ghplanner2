import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Company, Membership } from '@/lib/types';

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
  const company = await db.collection<Company>('companies').findOne({ inviteCode: code.trim().toUpperCase() } as any);
  if (!company) {
    return NextResponse.json({ error: 'Invalid join code' }, { status: 404 });
  }
  const existing = await db.collection<Membership>('memberships').findOne({ companyId: company.id, userId } as any);
  if (existing) {
    return NextResponse.json({ error: 'Already a member' }, { status: 409 });
  }
  const membership: Membership = {
    id: crypto.randomUUID(),
    userId,
    companyId: company.id,
    role: 'member',
    status: 'active',
    created_at: new Date(),
  };
  await db.collection<Membership>('memberships').insertOne(membership as any);
  return NextResponse.json({ ok: true });
}
