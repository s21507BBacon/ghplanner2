import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { Assignment, AppUser } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions as any);
  const s = session as any;
  if (!s || !s.user || !s.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const projectId = params.id;
  const db = await connectToDatabase();
  
  const assignments = await db.collection<Assignment>('assignments')
    .find({ projectId } as any)
    .toArray();
  
  const userIds = assignments.map(a => a.userId);
  
  const users = await db.collection<AppUser>('users')
    .find({ id: { $in: userIds } } as any)
    .toArray();
  
  return NextResponse.json({
    users: users.map(u => ({
      id: u.id,
      name: u.name || u.email,
      email: u.email,
    }))
  });
}

