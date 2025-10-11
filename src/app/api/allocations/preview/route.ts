import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import type { EnterpriseMembership, Membership, Project, ProjectPreference, UserPreference, AppUser } from '@/lib/types';

interface PreviewResult { projectId: string; userIds: string[] }

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const adminUserId = s.userId as string;
  const enterpriseId = request.nextUrl.searchParams.get('enterpriseId');
  const companyId = request.nextUrl.searchParams.get('companyId');
  
  const db = getDatabase();
    const helpers = new DbHelpers(db);
  
  if (enterpriseId) {
    const entMember = await db.collection<EnterpriseMembership>('enterpriseMemberships').findOne({ userId: adminUserId, enterpriseId } as any);
    if (!entMember || (entMember.role !== 'owner' && entMember.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const pending = await db.collection<UserPreference>('userPreferences').find({ enterpriseId, status: 'pending' } as any).toArray();
    const userIds = pending.map(p => p.userId);
    const users = await db.collection<AppUser>('users').find({ id: { $in: userIds } } as any).toArray();
    const userMap = new Map(users.map(u => [u.id, u.name || u.email]));
    
    const result = pending.map(p => ({
      id: p.id,
      userId: p.userId,
      userName: userMap.get(p.userId) || 'Unknown',
      enterpriseId: p.enterpriseId,
      companyId: p.companyId,
      projectId: p.projectId,
      status: p.status,
    }));
    
    return NextResponse.json({ pending: result });
  }
  
  if (companyId) {
    const member = await db.collection<Membership>('memberships').findOne({ userId: adminUserId, companyId } as any);
    if (!member || (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'staff')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const members = await db.collection<Membership>('memberships').find({ companyId, status: 'active' } as any).toArray();
    const projects = await db.collection<Project>('projects').find({ companyId, isActive: true } as any).toArray();
    const prefs = await db.collection<ProjectPreference>('preferences').find({ companyId } as any).toArray();

    const capacity = new Map(projects.map(p => [p.id, p.maxSeats] as const));
    const byUser = new Map<string, Array<{ projectId: string; rank: number }>>();
    for (const p of prefs) {
      if (!byUser.has(p.userId)) byUser.set(p.userId, []);
      byUser.get(p.userId)!.push({ projectId: p.projectId, rank: p.rank });
    }
    for (const [u, arr] of Array.from(byUser)) arr.sort((a,b) => a.rank - b.rank);

    const result = new Map<string, string[]>();
    for (const proj of projects) result.set(proj.id, []);

    const unassigned = members.map(m => m.userId);
    let round = 1;
    while (unassigned.length && round <= projects.length + 5) {
      for (let i = 0; i < unassigned.length; ) {
        const userId = unassigned[i];
        const ranked = byUser.get(userId) || [];
        const choice = ranked.find(r => r.rank === round);
        let placed = false;
        const tryProjects = choice ? [choice.projectId] : projects.map(p => p.id);
        for (const pid of tryProjects) {
          const cap = capacity.get(pid) || 0;
          const list = result.get(pid)!;
          if (list.length < cap) {
            list.push(userId);
            unassigned.splice(i,1);
            placed = true;
            break;
          }
        }
        if (!placed) i++;
      }
      round++;
    }

    const preview: PreviewResult[] = Array.from(result, ([projectId, userIds]) => ({ projectId, userIds }));
    return NextResponse.json({ preview });
  }
  
  return NextResponse.json({ error: 'enterpriseId or companyId required' }, { status: 400 });
}
