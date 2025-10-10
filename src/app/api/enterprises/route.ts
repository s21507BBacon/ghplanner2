import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Enterprise, EnterpriseMembership } from '@/lib/types';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function randomCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function GET() {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const db = await connectToDatabase();
  
  // Get enterprises where user is a member OR owner
  const memberships = await db.collection<EnterpriseMembership>('enterpriseMemberships').find({ userId, status: 'active' }).toArray();
  const enterpriseIds = memberships.map(m => m.enterpriseId);
  
  // Also get enterprises owned by the user
  const ownedEnterprises = await db.collection<Enterprise>('enterprises').find({ ownerUserId: userId } as any).toArray();
  const ownedEnterpriseIds = ownedEnterprises.map(e => e.id);
  
  // Combine both lists (using Set to avoid duplicates)
  const allEnterpriseIds = [...new Set([...enterpriseIds, ...ownedEnterpriseIds])];
  const enterprises = await db.collection<Enterprise>('enterprises').find({ id: { $in: allEnterpriseIds } } as any).toArray();
  
  return NextResponse.json({ enterprises: enterprises.map(e => ({ id: e.id, name: e.name, inviteCode: e.inviteCode, ownerUserId: e.ownerUserId })) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const db = await connectToDatabase();
  const body = await request.json();
  const { name } = body;
  
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }
  
  const now = new Date();
  const enterprise: Enterprise = {
    id: crypto.randomUUID(),
    name: name.trim(),
    slug: slugify(name),
    ownerUserId: userId,
    inviteCode: randomCode(8),
    inviteLinkSalt: crypto.randomUUID(),
    domainAllowlist: [],
    createdAt: now,
    updatedAt: now,
  };
  
  await db.collection<Enterprise>('enterprises').insertOne(enterprise as any);
  
  // Create owner membership
  const membership: EnterpriseMembership = {
    id: crypto.randomUUID(),
    userId,
    enterpriseId: enterprise.id,
    role: 'owner',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  
  await db.collection<EnterpriseMembership>('enterpriseMemberships').insertOne(membership as any);
  
  return NextResponse.json({ id: enterprise.id, name: enterprise.name, inviteCode: enterprise.inviteCode });
}
