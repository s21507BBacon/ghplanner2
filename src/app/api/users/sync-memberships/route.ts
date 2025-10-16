import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// This endpoint syncs enterprise memberships for users who have project assignments
// but no enterprise membership (for users added before the fix)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = s.userId as string;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  try {
    // Get all assignments for this user
    const assignments = await helpers.findMany<any>('assignments', {
      user_id: userId
    });

    if (assignments.length === 0) {
      return NextResponse.json({ 
        message: 'No assignments found',
        created: 0 
      });
    }

    // Get unique company IDs
    const companyIds = Array.from(new Set(assignments.map(a => a.company_id)));
    
    // Get companies to find their enterprise IDs
    const companies = await helpers.findWhereIn<any>('companies', 'id', companyIds);
    
    // Get unique enterprise IDs
    const enterpriseIds = Array.from(new Set(companies.map(c => c.enterprise_id)));
    
    let created = 0;
    const now = new Date();

    // Create enterprise memberships for any missing ones
    for (const enterpriseId of enterpriseIds) {
      const existing = await helpers.findOne<any>('enterprise_memberships', {
        user_id: userId,
        enterprise_id: enterpriseId
      });

      if (!existing) {
        await helpers.insert('enterprise_memberships', {
          id: crypto.randomUUID(),
          user_id: userId,
          enterprise_id: enterpriseId,
          role: 'member',
          status: 'active',
          created_at: dateToTimestamp(now),
          updated_at: dateToTimestamp(now)
        });
        created++;
      } else if (existing.status !== 'active') {
        await helpers.update('enterprise_memberships',
          { id: existing.id },
          { status: 'active', updated_at: dateToTimestamp(now) }
        );
        created++;
      }
    }

    return NextResponse.json({ 
      message: 'Memberships synced successfully',
      created,
      enterprises: enterpriseIds.length
    });
  } catch (error) {
    console.error('Failed to sync memberships:', error);
    return NextResponse.json({ 
      error: 'Failed to sync memberships' 
    }, { status: 500 });
  }
}
