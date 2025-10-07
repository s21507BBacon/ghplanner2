import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
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

  const db = await connectToDatabase();
  const member = await db.collection<Membership>('memberships').findOne({ userId, companyId } as any);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const projects = await db.collection<Project>('projects').find({ companyId } as any).toArray();
  return NextResponse.json({ projects: projects.map(p => ({
    id: p.id, name: p.name, maxSeats: p.maxSeats, isActive: p.isActive,
    inviteCode: p.inviteCode, repoOwner: p.repoOwner, repoName: p.repoName
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
  const db = await connectToDatabase();
  const member = await db.collection<Membership>('memberships').findOne({ userId, companyId } as any);
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  function randomCode(len = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  
  const now = new Date();
  const project: Project = {
    id: crypto.randomUUID(),
    companyId,
    name: name.trim(),
    description: description || '',
    maxSeats: Math.max(1, maxSeats),
    isActive: true,
    inviteCode: randomCode(8),
    inviteLinkSalt: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<Project>('projects').insertOne(project as any);
  return NextResponse.json({ id: project.id, name: project.name, maxSeats: project.maxSeats, isActive: true, inviteCode: project.inviteCode });
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
  const db = await connectToDatabase();
  const member = await db.collection<Membership>('memberships').findOne({ userId, companyId } as any);
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Handle repo token encryption if provided
  if (typeof updates.repoToken === 'string' && updates.repoToken) {
    (updates as any).repoTokenEncrypted = encrypt(updates.repoToken);
    delete updates.repoToken;
  }
  updates.updatedAt = new Date();
  const result = await db.collection<Project>('projects').findOneAndUpdate({ id, companyId } as any, { $set: updates }, { returnDocument: 'after' });
  if (!result || !(result as any).value) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const p = (result as any).value as Project;
  return NextResponse.json({ id: p.id, name: p.name, maxSeats: p.maxSeats, isActive: p.isActive, repoOwner: p.repoOwner, repoName: p.repoName });
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
  const db = await connectToDatabase();
  const member = await db.collection<Membership>('memberships').findOne({ userId, companyId } as any);
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const result = await db.collection<Project>('projects').deleteOne({ id, companyId } as any);
  if (result.deletedCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
