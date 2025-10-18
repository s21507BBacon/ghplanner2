import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const currentUserId = s.userId as string;
  const enterpriseId = params.id;
  const targetUserId = params.userId;

  const db = getDatabase();
  const helpers = new DbHelpers(db);

  // Check if current user is owner/admin
  const membership = await helpers.findOne<any>('enterprise_memberships', {
    user_id: currentUserId,
    enterprise_id: enterpriseId,
    status: 'active'
  });

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return NextResponse.json({ error: 'Not authorised to manage members' }, { status: 403 });
  }

  // Check the enterprise to get owner
  const enterprise = await helpers.findOne<any>('enterprises', { id: enterpriseId });
  if (!enterprise) {
    return NextResponse.json({ error: 'Enterprise not found' }, { status: 404 });
  }

  // Prevent removing the owner
  if (enterprise.owner_user_id === targetUserId) {
    return NextResponse.json({ error: 'Cannot remove the enterprise owner' }, { status: 403 });
  }

  // Prevent non-owners from removing admins
  if (membership.role !== 'owner') {
    const targetMembership = await helpers.findOne<any>('enterprise_memberships', {
      user_id: targetUserId,
      enterprise_id: enterpriseId
    });
    if (targetMembership && targetMembership.role === 'admin') {
      return NextResponse.json({ error: 'Only owners can remove admins' }, { status: 403 });
    }
  }

  try {
    // Get all companies in this enterprise
    const companies = await helpers.findMany<any>('companies', {
      enterprise_id: enterpriseId
    });
    const companyIds = companies.map((c: any) => c.id);

    // Delete all assignments for this user in this enterprise's companies
    if (companyIds.length > 0) {
      const placeholders = companyIds.map((_, i) => `$${i + 2}`).join(',');
      await helpers.execute(
        `DELETE FROM assignments WHERE user_id = $1 AND company_id IN (${placeholders})`,
        targetUserId,
        ...companyIds
      );
    }

    // Delete the enterprise membership
    await helpers.delete('enterprise_memberships', {
      user_id: targetUserId,
      enterprise_id: enterpriseId
    });

    return NextResponse.json({ success: true, message: 'Member removed from enterprise' });
  } catch (error) {
    console.error('Error removing member from enterprise:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
