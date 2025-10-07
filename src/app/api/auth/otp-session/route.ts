import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
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

    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ email, id: userId } as any);

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

