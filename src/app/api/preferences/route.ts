import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import type { Membership, ProjectPreference, UserPreference } from '@/lib/types';

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
  const member = await db.collection<Membership>('memberships').findOne({ userId, companyId } as any);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const prefs = await db.collection<ProjectPreference>('preferences').find({ userId, companyId } as any).toArray();
  return NextResponse.json({ preferences: prefs.map(p => ({ projectId: p.projectId, rank: p.rank })) });
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
  const { enterpriseId, companyId, projectId } = body;
  
  if (!enterpriseId) {
    return NextResponse.json({ error: 'enterpriseId required' }, { status: 400 });
  }
  
  const now = new Date();
  const userPreference: UserPreference = {
    id: crypto.randomUUID(),
    userId,
    enterpriseId,
    companyId: companyId || undefined,
    projectId: projectId || undefined,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };
  
  await db.collection<UserPreference>('userPreferences').insertOne(userPreference as any);
  return NextResponse.json({ ok: true });
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
  const { companyId, preferences } = body as { companyId: string; preferences: Array<{ projectId: string; rank: number }>; };
  if (!companyId || !Array.isArray(preferences)) return NextResponse.json({ error: 'companyId and preferences required' }, { status: 400 });
  const member = await db.collection<Membership>('memberships').findOne({ userId, companyId } as any);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await db.collection<ProjectPreference>('preferences').deleteMany({ userId, companyId } as any);
  const now = new Date();
  const docs = preferences.map((p) => ({ id: crypto.randomUUID(), userId, companyId, projectId: p.projectId, rank: p.rank, created_at: now }));
  if (docs.length) await db.collection<ProjectPreference>('preferences').insertMany(docs as any);
  return NextResponse.json({ ok: true });
}
