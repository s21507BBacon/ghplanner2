import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    console.log('[VERIFY] Received token:', token ? 'present' : 'missing');

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ 
      emailVerificationToken: token 
    } as any);

    console.log('[VERIFY] User found:', user ? 'yes' : 'no');
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid verification token. This link may have expired or already been used.' }, { status: 404 });
    }

    // Check if already verified
    if ((user as any).emailVerified) {
      console.log('[VERIFY] Email already verified');
      return NextResponse.json({ 
        ok: true, 
        message: 'Email already verified',
        alreadyVerified: true 
      });
    }

    // Check if token expired
    const now = new Date();
    const expiresAt = (user as any).emailVerificationExpires;
    if (expiresAt && new Date(expiresAt) < now) {
      console.log('[VERIFY] Token expired');
      return NextResponse.json({ 
        error: 'Verification link has expired. Please sign up again.' 
      }, { status: 410 });
    }

    // Verify the email
    console.log('[VERIFY] Updating user to verified');
    const result = await db.collection('users').updateOne(
      { emailVerificationToken: token } as any,
      { 
        $set: { 
          emailVerified: true, 
          updatedAt: now 
        },
        $unset: { 
          emailVerificationToken: '',
          emailVerificationExpires: '' 
        }
      }
    );

    console.log('[VERIFY] Update result:', result.modifiedCount > 0 ? 'success' : 'no changes');

    return NextResponse.json({ 
      ok: true, 
      message: 'Email verified successfully! You can now sign in.' 
    });
  } catch (e) {
    console.error('Email verification error:', e);
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
  }
}

