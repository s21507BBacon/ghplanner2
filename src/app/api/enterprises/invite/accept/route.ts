import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Enterprise, EnterpriseInvite, EnterpriseMembership } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const userId = s.userId as string;

  const body = await request.json();
  const { token } = body;

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  const invite = await helpers.findOne<any>('enterprise_invites', { 
    token,
    status: 'pending'
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 });
  }

  const now = new Date();
  const expiresAt = timestampToDate(invite.expires_at);
  if (expiresAt && expiresAt < now) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
  }

  const enterprise = await helpers.findOne<any>('enterprises', { 
    id: invite.enterprise_id 
  });

  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }

  const existingMembership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: userId,
    enterprise_id: enterprise.id
  });

  if (existingMembership) {
    if (existingMembership.status === 'active') {
      await helpers.update('enterprise_invites',
        { id: invite.id },
        { status: 'accepted', accepted_at: dateToTimestamp(now) }
      );
      return NextResponse.json({ 
        enterpriseId: enterprise.id, 
        message: 'Already a member' 
      });
    }
    
    await helpers.update('enterprise_memberships',
      { id: existingMembership.id },
      { status: 'active', updated_at: dateToTimestamp(now) }
    );
  } else {
    await helpers.insert('enterprise_memberships', {
      id: crypto.randomUUID(),
      user_id: userId,
      enterprise_id: enterprise.id,
      role: 'member',
      status: 'active',
      created_at: dateToTimestamp(now),
      updated_at: dateToTimestamp(now),
    });
  }

  await helpers.update('enterprise_invites',
    { id: invite.id },
    { status: 'accepted', accepted_at: dateToTimestamp(now) }
  );

  return NextResponse.json({ 
    enterpriseId: enterprise.id,
    message: 'Successfully joined enterprise'
  });
}

