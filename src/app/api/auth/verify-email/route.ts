import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    console.log('[VERIFY] Received token:', token ? 'present' : 'missing');

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const user = await helpers.findOne('users', { email_verification_token: token });

    console.log('[VERIFY] User found:', user ? 'yes' : 'no');
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid verification token. This link may have expired or already been used.' }, { status: 404 });
    }

    // Check if already verified
    if ((user as any).email_verified) {
      console.log('[VERIFY] Email already verified');
      return NextResponse.json({ 
        ok: true, 
        message: 'Email already verified',
        alreadyVerified: true 
      });
    }

    // Check if token expired
    const now = new Date();
    const expiresAt = (user as any).email_verification_expires;
    const expiresDate = expiresAt ? new Date((expiresAt as number) * 1000) : undefined;
    if (expiresDate && expiresDate < now) {
      console.log('[VERIFY] Token expired');
      return NextResponse.json({ 
        error: 'Verification link has expired. Please sign up again.' 
      }, { status: 410 });
    }

    // Verify the email
    console.log('[VERIFY] Updating user to verified');
    const nowTimestamp = dateToTimestamp(now);
    await helpers.update('users', { email_verification_token: token }, {
      email_verified: true,
      email_verification_token: null,
      email_verification_expires: null,
      updated_at: nowTimestamp
    });

    console.log('[VERIFY] Update completed');

    return NextResponse.json({ 
      ok: true, 
      message: 'Email verified successfully! You can now sign in.' 
    });
  } catch (e) {
    console.error('Email verification error:', e);
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
  }
}

