import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering for Cloudflare Workers
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// This endpoint creates a session after OTP verification
export async function POST(request: NextRequest) {
  try {
    console.log('[OTP-SESSION] Request received');
    
    // Check for required environment variables
    if (!process.env.DATABASE_URL && !process.env.NEON_DATABASE_URL) {
      console.error('[OTP-SESSION] DATABASE_URL not configured');
      return NextResponse.json({ 
        error: 'Server configuration error. Please contact support.' 
      }, { status: 500 });
    }
    
    const body = await request.json();
    const { email, userId } = body;

    console.log('[OTP-SESSION] Request data:', { email, userId });

    if (!email || !userId) {
      console.log('[OTP-SESSION] Missing email or userId');
      return NextResponse.json({ error: 'Email and userId required' }, { status: 400 });
    }

    console.log('[OTP-SESSION] Getting database connection');
    const db = getDatabase();
    if (!db) {
      console.error('[OTP-SESSION] Failed to get database connection');
      return NextResponse.json({ 
        error: 'Database connection failed. Please check server configuration.' 
      }, { status: 500 });
    }

    console.log('[OTP-SESSION] Creating database helpers');
    const helpers = new DbHelpers(db);
    
    console.log('[OTP-SESSION] Finding user with email and userId');
    const user = await helpers.findOne('users', { email, id: userId  });

    if (!user) {
      console.log('[OTP-SESSION] User not found with provided email and userId');
      return NextResponse.json({ error: 'Invalid session data' }, { status: 401 });
    }

    console.log('[OTP-SESSION] User found, returning success');
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
    console.error('[OTP-SESSION] Error:', e);
    console.error('[OTP-SESSION] Error details:', {
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : 'No stack trace'
    });
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

