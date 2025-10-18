import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate } from '@/lib/db';

const MAX_OTP_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    console.log('[VERIFY-OTP] Request received');
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      console.log('[VERIFY-OTP] Missing email or code');
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
    }

    // Normalize the code: uppercase and ensure proper format
    const normalizedCode = code.toUpperCase().trim();
    console.log('[VERIFY-OTP] Normalized code format check:', { 
      length: normalizedCode.length,
      hasDash: normalizedCode.includes('-')
    });

    const db = getDatabase();
    console.log('[VERIFY-OTP] Database instance:', db ? 'Created' : 'Failed');
    
    if (!db) {
      console.error('[VERIFY-OTP] Failed to get database connection');
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const helpers = new DbHelpers(db);
    const user = await helpers.findOne('users', { email });
    console.log('[VERIFY-OTP] User found:', user ? 'Yes' : 'No');

    if (!user) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
    }

    const otpCode = user.otp_code;
    const otpExpires = user.otp_expires;
    const otpAttempts = user.otp_attempts || 0;

    console.log('[VERIFY-OTP] OTP data:', {
      hasOtpCode: !!otpCode,
      otpExpires,
      otpAttempts
    });

    // Check if OTP exists
    if (!otpCode) {
      return NextResponse.json({ error: 'No active code. Please request a new one.' }, { status: 401 });
    }

    // Check attempts
    if (otpAttempts >= MAX_OTP_ATTEMPTS) {
      // Clear the OTP
      await helpers.update(
        'users',
        { email },
        { 
          otp_code: null,
          otp_expires: null,
          otp_attempts: 0
        }
      );
      return NextResponse.json({ 
        error: 'Too many failed attempts. Please request a new code.' 
      }, { status: 429 });
    }

    // Check if expired
    const now = new Date();
    const expiresDate = timestampToDate(otpExpires);
    if (expiresDate && expiresDate < now) {
      await helpers.update(
        'users',
        { email },
        { 
          otp_code: null,
          otp_expires: null,
          otp_attempts: 0
        }
      );
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 410 });
    }

    // Verify the code (case-insensitive comparison)
    // In development mode, accept any code for easy testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    const codeMatches = isDevelopment || otpCode.toUpperCase() === normalizedCode;
    
    console.log('[VERIFY-OTP] Comparing codes:', {
      stored: otpCode.toUpperCase(),
      provided: normalizedCode,
      match: codeMatches,
      devMode: isDevelopment
    });

    if (!codeMatches) {
      console.log('[VERIFY-OTP] Code verification failed, incrementing attempts');

      // Increment attempts
      await helpers.update(
        'users',
        { email },
        {
          otp_attempts: otpAttempts + 1
        }
      );

      const remainingAttempts = MAX_OTP_ATTEMPTS - (otpAttempts + 1);
      return NextResponse.json({
        error: `Invalid code. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`
      }, { status: 401 });
    }

    console.log('[VERIFY-OTP] Code verification successful');

    // Code is valid! Mark email as verified and clear the OTP
    await helpers.update(
      'users',
      { email },
      { 
        email_verified: true,
        otp_code: null,
        otp_expires: null,
        otp_attempts: 0
      }
    );

    console.log('[OTP] Code verified for:', email);

    // Return user info for session creation
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
      }
    });
  } catch (e) {
    console.error('Verify OTP error:', e);
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}

