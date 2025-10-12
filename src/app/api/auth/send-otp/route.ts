export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';
import { sendEmail } from '@/lib/email';

// Generate alphanumeric OTP code in format: 1A2B-3C4D
function generateOTP(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  
  // Generate 8 random characters
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Insert dash in the middle: XXXX-XXXX
  return code.slice(0, 4) + '-' + code.slice(4);
}

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
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        ok: true, 
        message: 'If an account exists with this email, a code has been sent.' 
      });
    }

    const isDev = process.env.NODE_ENV === 'development';

    // Check if email is verified (skip in dev)
    if (!isDev && !(user as any).email_verified) {
      return NextResponse.json({ 
        error: 'Please verify your email first. Check your inbox for the verification link.' 
      }, { status: 403 });
    }

    const otpCode = generateOTP();
    const now = new Date();
    const nowTimestamp = dateToTimestamp(now);
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
    const expiresTimestamp = dateToTimestamp(expiresAt);

    // Store OTP in database
    await helpers.update('users', { email }, {
      otp_code: otpCode,
      otp_expires: expiresTimestamp,
      otp_attempts: 0,
      email_verified: isDev ? 1 : ((user as any).email_verified ? 1 : 0),
      updated_at: nowTimestamp
    });

    // In development, skip email sending
    if (isDev) {
      console.log('[SEND-OTP] DEV MODE - Skipping email');
      return NextResponse.json({ 
        ok: true,
        devMode: true,
        devOtpCode: otpCode,
        userId: (user as any).id
      });
    }

    // Send OTP email
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Sign In Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 28px;">GitHub Planner</h1>
      </div>
      
      <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">
        Your Sign In Code
      </h2>
      
      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Use this code to sign in to your GitHub Planner account:
      </p>
      
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 24px; text-align: center; margin: 30px 0;">
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 4px; color: #1e293b; font-family: 'Courier New', monospace;">
          ${otpCode}
        </div>
      </div>
      
      <p style="color: #64748b; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
        This code will expire in 10 minutes. If you didn't request this code, you can safely ignore this email.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
        For security, never share this code with anyone. GitHub Planner will never ask you for this code.
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
Your GitHub Planner Sign In Code

Use this code to sign in: ${otpCode}

This code will expire in 10 minutes.

If you didn't request this code, you can safely ignore this email.
    `.trim();

    try {
      console.log('[SEND-OTP] Sending OTP code to:', email);
      await sendEmail({
        to: email,
        subject: 'Your Sign In Code - GitHub Planner',
        html,
        text,
      });
      
      console.log('[SEND-OTP] Code sent successfully to:', email);
    } catch (emailError: any) {
      console.error('[SEND-OTP] Failed to send email:', emailError);
      console.error('[SEND-OTP] Error details:', {
        message: emailError?.message,
        name: emailError?.name,
        stack: emailError?.stack
      });
      
      const errorMessage = emailError?.message || 'Failed to send code';
      return NextResponse.json({ 
        error: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? {
          type: emailError?.name,
          details: emailError?.message
        } : undefined
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Sign in code sent to your email.' 
    });
  } catch (e) {
    console.error('Send OTP error:', e);
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 });
  }
}

