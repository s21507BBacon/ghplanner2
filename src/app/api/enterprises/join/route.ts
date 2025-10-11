import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Enterprise, EnterpriseMembership } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const db = getDatabase();
    const helpers = new DbHelpers(db);
  const body = await request.json();
  const { inviteCode } = body;

  if (!inviteCode || typeof inviteCode !== 'string') {
    return NextResponse.json({ error: 'Invite code required' }, { status: 400 });
  }

  const enterprise = await db.collection<Enterprise>('enterprises').findOne({ inviteCode });
  if (!enterprise) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
  }

  // Check if user is already a member
  const existingMembership = await db.collection<EnterpriseMembership>('enterpriseMemberships').findOne({
    userId,
    enterpriseId: enterprise.id
  });

  if (existingMembership) {
    if (existingMembership.status === 'active') {
      return NextResponse.json({ error: 'Already a member' }, { status: 409 });
    }
    // Reactivate pending membership
    await db.collection<EnterpriseMembership>('enterpriseMemberships').updateOne(
      { id: existingMembership.id },
      { $set: { status: 'active', updated_at: new Date() } }
    );
    return NextResponse.json({ id: enterprise.id, name: enterprise.name });
  }

  // Create new membership
  const membership: EnterpriseMembership = {
    id: crypto.randomUUID(),
    userId,
    enterpriseId: enterprise.id,
    role: 'member',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db.collection<EnterpriseMembership>('enterpriseMemberships').insertOne(membership as any);
  return NextResponse.json({ id: enterprise.id, name: enterprise.name });
}
