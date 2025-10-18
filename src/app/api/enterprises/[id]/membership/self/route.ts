import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
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

  // Ensure enterprise exists
  const enterprise = await helpers.findOne<any>('enterprises', { id: enterpriseId });
  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }

  const now = new Date();

  const existing = await helpers.findOne<any>('enterprise_memberships', {
    user_id: userId,
    enterprise_id: enterpriseId,
  });

  if (existing) {
    // Reactivate if needed
    if (existing.status !== 'active') {
      await helpers.update('enterprise_memberships', { id: existing.id }, {
        status: 'active',
        updated_at: dateToTimestamp(now)
      });
    }
    return NextResponse.json({ ensured: true, membershipId: existing.id, status: 'active' });
  }

  const membershipId = crypto.randomUUID();
  await helpers.insert('enterprise_memberships', {
    id: membershipId,
    user_id: userId,
    enterprise_id: enterpriseId,
    role: 'member',
    status: 'active',
    created_at: dateToTimestamp(now),
    updated_at: dateToTimestamp(now),
  });

  return NextResponse.json({ ensured: true, membershipId, status: 'active' });
}
