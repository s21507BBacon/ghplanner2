import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const user = await helpers.findOne('users', { email  });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      email_verified: (user as any).email_verified || false,
      hasToken: !!(user as any).emailVerificationToken,
    });
  } catch (e) {
    console.error('Check verification error:', e);
    return NextResponse.json({ error: 'Failed to check verification' }, { status: 500 });
  }
}

