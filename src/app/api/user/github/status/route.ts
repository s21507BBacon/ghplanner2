import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { DbHelpers } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    // Find user by email
    const user = await helpers.findOne('users', { email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasGitHub = !!(user as any).github_access_token;
    const username = (user as any).github_username;
    const connectedAt = (user as any).github_connected_at;

    return NextResponse.json({
      connected: hasGitHub,
      username: username || null,
      connectedAt: connectedAt ? new Date(connectedAt * 1000).toISOString() : null,
    });
  } catch (error) {
    console.error('Failed to get GitHub status:', error);
    return NextResponse.json(
      { error: 'Failed to get GitHub status' },
      { status: 500 }
    );
  }
}
