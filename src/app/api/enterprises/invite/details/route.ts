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

  const invite = await helpers.findOne<any>('enterprise_invites', { 
    token,
    status: 'pending'
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  const enterprise = await helpers.findOne<any>('enterprises', { 
    id: invite.enterprise_id 
  });

  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }

  const inviter = await helpers.findOne<any>('users', { 
    id: invite.invited_by_user_id 
  });

  const now = new Date();
  const expiresAt = timestampToDate(invite.expires_at);
  const expired = expiresAt ? expiresAt < now : false;

  return NextResponse.json({
    enterpriseName: enterprise.name,
    inviterName: inviter?.name || inviter?.email || 'Someone',
    expired
  });
}

