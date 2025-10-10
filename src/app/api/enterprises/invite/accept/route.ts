import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
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

  const db = await connectToDatabase();

  const invite = await db.collection<EnterpriseInvite>('enterpriseInvites').findOne({ 
    token,
    status: 'pending'
  } as any);

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 });
  }

  const now = new Date();
  if (invite.expiresAt < now) {
    return NextResponse.json({ error: 'Invite has expired' }, { status: 410 });
  }

  const enterprise = await db.collection<Enterprise>('enterprises').findOne({ 
    id: invite.enterpriseId 
  } as any);

  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }

  const existingMembership = await db.collection<EnterpriseMembership>('enterpriseMemberships').findOne({
    userId,
    enterpriseId: enterprise.id
  } as any);

  if (existingMembership) {
    if (existingMembership.status === 'active') {
      await db.collection<EnterpriseInvite>('enterpriseInvites').updateOne(
        { id: invite.id } as any,
        { $set: { status: 'accepted', acceptedAt: now } }
      );
      return NextResponse.json({ 
        enterpriseId: enterprise.id, 
        message: 'Already a member' 
      });
    }
    
    await db.collection<EnterpriseMembership>('enterpriseMemberships').updateOne(
      { id: existingMembership.id } as any,
      { $set: { status: 'active', updatedAt: now } }
    );
  } else {
    const membership: EnterpriseMembership = {
      id: crypto.randomUUID(),
      userId,
      enterpriseId: enterprise.id,
      role: 'member',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<EnterpriseMembership>('enterpriseMemberships').insertOne(membership as any);
  }

  await db.collection<EnterpriseInvite>('enterpriseInvites').updateOne(
    { id: invite.id } as any,
    { $set: { status: 'accepted', acceptedAt: now } }
  );

  return NextResponse.json({ 
    enterpriseId: enterprise.id,
    message: 'Successfully joined enterprise'
  });
}

