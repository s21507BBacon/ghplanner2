import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import type { Enterprise, EnterpriseInvite, AppUser } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const db = getDatabase();
    const helpers = new DbHelpers(db);

  const invite = await db.collection<EnterpriseInvite>('enterpriseInvites').findOne({ 
    token,
    status: 'pending'
  } as any);

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  const enterprise = await db.collection<Enterprise>('enterprises').findOne({ 
    id: invite.enterpriseId 
  } as any);

  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }

  const inviter = await db.collection<AppUser>('users').findOne({ 
    id: invite.invitedByUserId 
  } as any);

  const now = new Date();
  const expired = invite.expiresAt < now;

  return NextResponse.json({
    enterpriseName: enterprise.name,
    inviterName: inviter?.name || inviter?.email || 'Someone',
    expired
  });
}

