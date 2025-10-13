import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Membership, Project } from '@/lib/types';
import { encrypt } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const companyId = request.nextUrl.searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 });

  const db = getDatabase();
  const helpers = new DbHelpers(db);
  const member = await helpers.findOne<Membership>('memberships', { user_id: userId, company_id: companyId });
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const projects = await helpers.findMany<Project>('projects', { company_id: companyId });
  return NextResponse.json({ projects: projects.map(p => ({
    id: p.id, name: p.name, maxSeats: p.max_seats, isActive: p.is_active,
    inviteCode: p.invite_code, repoOwner: p.repo_owner, repoName: p.repo_name
  })) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const body = await request.json();
  const { companyId, name, description, maxSeats } = body as Partial<Project> & { companyId: string };
  if (!companyId || !name || typeof maxSeats !== 'number') {
    return NextResponse.json({ error: 'companyId, name, and maxSeats are required' }, { status: 400 });
  }
  const db = getDatabase();
  const helpers = new DbHelpers(db);
  const member = await helpers.findOne<Membership>('memberships', { user_id: userId, company_id: companyId });
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  function randomCode(len = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  
  const projectId = crypto.randomUUID();
  const now = Date.now();
  await helpers.insert('projects', {
    id: projectId,
    company_id: companyId,
    name: name.trim(),
    description: description || '',
    max_seats: Math.max(1, maxSeats),
    is_active: true,
    invite_code: randomCode(8),
    invite_link_salt: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
  });
  return NextResponse.json({ id: projectId, name: name.trim(), maxSeats: Math.max(1, maxSeats), isActive: true, inviteCode: randomCode(8) });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const body = await request.json();
  const { id, companyId, ...updates } = body as any;
  if (!id || !companyId) return NextResponse.json({ error: 'id and companyId required' }, { status: 400 });
  const db = getDatabase();
  const helpers = new DbHelpers(db);
  const member = await helpers.findOne<Membership>('memberships', { user_id: userId, company_id: companyId });
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Handle repo token encryption if provided
  const updateData: any = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'repoToken' && typeof value === 'string' && value) {
      updateData.repo_token_encrypted = encrypt(value);
    } else if (key === 'name' || key === 'description') {
      updateData[key] = value;
    } else if (key === 'maxSeats') {
      updateData.max_seats = value;
    } else if (key === 'isActive') {
      updateData.is_active = value;
    } else if (key === 'repoOwner') {
      updateData.repo_owner = value;
    } else if (key === 'repoName') {
      updateData.repo_name = value;
    }
  }
  updateData.updated_at = Date.now();
  await helpers.update('projects', { id, company_id: companyId }, updateData);
  const p = await helpers.findOne<Project>('projects', { id, company_id: companyId });
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ id: p.id, name: p.name, maxSeats: p.max_seats, isActive: p.is_active, repoOwner: p.repo_owner, repoName: p.repo_name });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;
  const id = request.nextUrl.searchParams.get('id');
  const companyId = request.nextUrl.searchParams.get('companyId');
  if (!id || !companyId) return NextResponse.json({ error: 'id and companyId required' }, { status: 400 });
  const db = getDatabase();
  const helpers = new DbHelpers(db);
  const member = await helpers.findOne<Membership>('memberships', { user_id: userId, company_id: companyId });
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await helpers.delete('projects', { id, company_id: companyId });
  return NextResponse.json({ ok: true });
}
