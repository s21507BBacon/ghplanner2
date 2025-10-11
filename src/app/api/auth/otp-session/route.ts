import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// This endpoint creates a session after OTP verification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userId } = body;

    if (!email || !userId) {
      return NextResponse.json({ error: 'Email and userId required' }, { status: 400 });
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const user = await helpers.findOne('users', { email, id: userId  });

    if (!user) {
      return NextResponse.json({ error: 'Invalid session data' }, { status: 401 });
    }

    // Return success - the client will handle NextAuth sign in
    return NextResponse.json({
      ok: true,
      user: {
        id: (user as any).id,
        email: (user as any).email,
        name: (user as any).name || '',
      }
    });
  } catch (e) {
    console.error('OTP session error:', e);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

