import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { sendEmail } from '@/lib/email';

// Generate alphanumeric OTP code in format: 1A2B-3C4D
function generateOTP(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code.slice(0, 4) + '-' + code.slice(4);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const db = await connectToDatabase();
    let user = await db.collection('users').findOne({ email });
    
    const isDev = process.env.NODE_ENV === 'development';
    const otpCode = generateOTP();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    if (user) {
      // User exists, just send new OTP (or skip in dev)
      await db.collection('users').updateOne(
        { email } as any,
        { 
          $set: { 
            otpCode,
            otpExpires: expiresAt,
            otpAttempts: 0,
            emailVerified: isDev ? true : (user as any).emailVerified,
            updatedAt: now
          }
        }
      );
    } else {
      // Create new user
      const newUser = {
        id: crypto.randomUUID(),
        email,
        name: name || '',
        emailVerified: isDev, // Auto-verify in dev
        otpCode,
        otpExpires: expiresAt,
        otpAttempts: 0,
        createdAt: now,
        updatedAt: now,
      };
      
      console.log('[SIGNUP] Creating user with OTP:', otpCode, isDev ? '(DEV MODE - Auto-verified)' : '');
      await db.collection('users').insertOne(newUser);
      user = newUser as any;
    }

    // Send OTP email
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 28px;">GitHub Planner</h1>
      </div>
      
      <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">
        Welcome${name ? ` ${name}` : ''}!
      </h2>
      
      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Your verification code is:
      </p>
      
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 30px 0;">
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 4px; color: #1e293b; font-family: 'Courier New', monospace;">
          ${otpCode}
        </div>
      </div>
      
      <p style="color: #64748b; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
        This code will expire in 10 minutes. Enter it to complete your sign up.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
        If you didn't request this code, you can safely ignore this email.
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
      <p style="margin: 0;">© ${new Date().getFullYear()} GitHub Planner. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const text = `
Welcome${name ? ` ${name}` : ''}!

Your verification code is: ${otpCode}

This code will expire in 10 minutes.

If you didn't request this code, you can safely ignore this email.
    `.trim();

    // In development, skip email sending
    if (isDev) {
      console.log('[SIGNUP] DEV MODE - Skipping email, code is:', otpCode);
      return NextResponse.json({ 
        ok: true, 
        message: 'DEV MODE: User created and auto-verified',
        devMode: true,
        devOtpCode: otpCode,
        userId: (user as any).id
      });
    }

    // Production: send actual email
    try {
      console.log('[SIGNUP] Sending verification code to:', email);
      await sendEmail({
        to: email,
        subject: 'Your Verification Code - GitHub Planner',
        html,
        text,
      });
      console.log('[SIGNUP] Verification code sent successfully');
    } catch (emailError) {
      console.error('[SIGNUP] Failed to send verification email:', emailError);
      return NextResponse.json({ 
        error: 'Failed to send verification code. Please try again.' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Verification code sent. Please check your inbox.' 
    });
  } catch (e) {
    console.error('Signup error:', e);
    return NextResponse.json({ error: 'Failed to sign up' }, { status: 500 });
  }
}

