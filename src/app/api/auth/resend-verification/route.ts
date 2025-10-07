import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        ok: true, 
        message: 'If an account exists with this email, a verification link has been sent.' 
      });
    }

    // If already verified, inform the user
    if ((user as any).emailVerified) {
      return NextResponse.json({ 
        error: 'This email is already verified. You can sign in.' 
      }, { status: 400 });
    }

    // Generate new verification token
    const verificationToken = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new token
    await db.collection('users').updateOne(
      { email },
      { 
        $set: { 
          emailVerificationToken: verificationToken,
          emailVerificationExpires: expiresAt,
          updatedAt: now
        }
      }
    );

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, (user as any).name);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return NextResponse.json({ 
        error: 'Failed to send verification email. Please try again later.' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Verification email sent. Please check your inbox.' 
    });
  } catch (e) {
    console.error('Resend verification error:', e);
    return NextResponse.json({ error: 'Failed to resend verification email' }, { status: 500 });
  }
}

