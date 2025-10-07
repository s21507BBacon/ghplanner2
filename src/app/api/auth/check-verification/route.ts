import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ email } as any);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      emailVerified: (user as any).emailVerified || false,
      hasToken: !!(user as any).emailVerificationToken,
    });
  } catch (e) {
    console.error('Check verification error:', e);
    return NextResponse.json({ error: 'Failed to check verification' }, { status: 500 });
  }
}

