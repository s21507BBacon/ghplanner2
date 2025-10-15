import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accessToken, username } = body;

    if (!accessToken || !username) {
      return NextResponse.json(
        { error: 'Missing required fields: accessToken, username' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    // Find user by email
    const user = await helpers.findOne('users', { email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user with GitHub connection
    await helpers.update('users', { id: (user as any).id }, {
      github_access_token: accessToken,
      github_username: username,
      github_connected_at: dateToTimestamp(new Date()),
      updated_at: dateToTimestamp(new Date()),
    });

    return NextResponse.json({
      success: true,
      message: 'GitHub account connected successfully',
      username,
    });
  } catch (error) {
    console.error('Failed to connect GitHub account:', error);
    return NextResponse.json(
      { error: 'Failed to connect GitHub account' },
      { status: 500 }
    );
  }
}
