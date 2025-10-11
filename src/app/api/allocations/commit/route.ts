import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import type { Assignment, EnterpriseMembership, Membership, UserPreference } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const adminUserId = s.userId as string;
  const { preferenceId, companyId, projectId, preview } = await request.json();
  
  const db = getDatabase();
    const helpers = new DbHelpers(db);
  
  if (preferenceId && companyId && projectId) {
    const userPref = await db.collection<UserPreference>('userPreferences').findOne({ id: preferenceId } as any);
    if (!userPref) {
      return NextResponse.json({ error: 'Preference not found' }, { status: 404 });
    }
    
    const entMember = await db.collection<EnterpriseMembership>('enterpriseMemberships').findOne({ 
      userId: adminUserId, 
      enterpriseId: userPref.enterpriseId 
    } as any);
    
    if (!entMember || (entMember.role !== 'owner' && entMember.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const existingMembership = await db.collection<Membership>('memberships').findOne({
      userId: userPref.userId,
      companyId
    } as any);
    
    if (!existingMembership) {
      const membership: Membership = {
        id: crypto.randomUUID(),
        userId: userPref.userId,
        companyId,
        role: 'member',
        status: 'active',
        created_at: new Date(),
      };
      await db.collection<Membership>('memberships').insertOne(membership as any);
    }
    
    const now = new Date();
    const assignment: Assignment = {
      id: crypto.randomUUID(),
      userId: userPref.userId,
      companyId,
      projectId,
      assignedAt: now,
      assignedByUserId: adminUserId,
    };
    
    await db.collection<Assignment>('assignments').insertOne(assignment as any);
    await db.collection<UserPreference>('userPreferences').updateOne(
      { id: preferenceId } as any,
      { $set: { status: 'allocated', updated_at: now } }
    );
    
    return NextResponse.json({ ok: true });
  }
  
  if (companyId && Array.isArray(preview)) {
    const member = await db.collection<Membership>('memberships').findOne({ userId: adminUserId, companyId } as any);
    if (!member || (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'staff')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const userIds = new Set<string>();
    preview.forEach((p: any) => (p.userIds || []).forEach((u: string) => userIds.add(u)));
    await db.collection<Assignment>('assignments').deleteMany({ companyId, userId: { $in: Array.from(userIds) } } as any);

    const now = new Date();
    const docs: Assignment[] = [];
    for (const p of preview as Array<{ projectId: string; userIds: string[] }>) {
      for (const u of p.userIds || []) {
        docs.push({ id: crypto.randomUUID(), userId: u, companyId, projectId: p.projectId, assignedAt: now, assignedByUserId: adminUserId });
      }
    }
    if (docs.length) await db.collection<Assignment>('assignments').insertMany(docs as any);
    return NextResponse.json({ ok: true });
  }
  
  return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
}
