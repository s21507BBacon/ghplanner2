import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
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
  const db = getDatabase();
  const helpers = new DbHelpers(db);
  
  // Get enterprises where user is a member OR owner
  const memberships = await helpers.findMany<any>('enterprise_memberships', { user_id: userId, status: 'active' });
  const enterpriseIds = memberships.map((m: any) => m.enterprise_id);
  
  // Also get enterprises owned by the user
  const ownedEnterprises = await helpers.findMany<any>('enterprises', { owner_user_id: userId });
  const ownedEnterpriseIds = ownedEnterprises.map((e: any) => e.id);
  
  // Combine both lists (using Set to avoid duplicates)
  const allEnterpriseIds = [...new Set([...enterpriseIds, ...ownedEnterpriseIds])];
  
  if (allEnterpriseIds.length === 0) {
    return NextResponse.json({ enterprises: [] });
  }
  
  const enterprises = await helpers.findWhereIn<any>('enterprises', 'id', allEnterpriseIds);
  
  return NextResponse.json({ 
    enterprises: enterprises.map((e: any) => ({ 
      id: e.id, 
      name: e.name, 
      inviteCode: e.invite_code, 
      ownerUserId: e.owner_user_id,
      allocationMode: e.allocation_mode || 'auto'
    })) 
  });
}

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
  const { name, allocationMode } = body;
  
  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }
  
  const now = new Date();
  const enterpriseId = crypto.randomUUID();
  const inviteCode = randomCode(8);
  
  // Insert enterprise with snake_case column names
  await helpers.insert('enterprises', {
    id: enterpriseId,
    name: name.trim(),
    slug: slugify(name),
    owner_user_id: userId,
    allocation_mode: allocationMode || 'auto',
    invite_code: inviteCode,
    invite_link_salt: crypto.randomUUID(),
    domain_allowlist: stringifyJsonField([]),
    created_at: dateToTimestamp(now),
    updated_at: dateToTimestamp(now),
  });
  
  // Create owner membership with snake_case column names
  await helpers.insert('enterprise_memberships', {
    id: crypto.randomUUID(),
    user_id: userId,
    enterprise_id: enterpriseId,
    role: 'owner',
    status: 'active',
    created_at: dateToTimestamp(now),
    updated_at: dateToTimestamp(now),
  });
  
  return NextResponse.json({ id: enterpriseId, name: name.trim(), inviteCode, allocationMode: allocationMode || 'auto' });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const db = getDatabase();
  const helpers = new DbHelpers(db);
  const body = await request.json();
  const { id, allocationMode } = body;
  
  if (!id || !allocationMode) {
    return NextResponse.json({ error: 'id and allocationMode required' }, { status: 400 });
  }
  
  // Check if user is owner or admin
  const enterprise: any = await helpers.findOne('enterprises', { id });
  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }
  
  const isOwner = enterprise.owner_user_id === userId;
  const membership: any = await helpers.findOne('enterprise_memberships', { 
    user_id: userId, 
    enterprise_id: id 
  });
  const isAdmin = membership && (membership.role === 'owner' || membership.role === 'admin');
  
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden - Only owners/admins can update allocation mode' }, { status: 403 });
  }
  
  const now = new Date();
  await helpers.update('enterprises', { id }, {
    allocation_mode: allocationMode,
    updated_at: dateToTimestamp(now)
  });
  
  return NextResponse.json({ 
    id, 
    allocationMode 
  });
}
