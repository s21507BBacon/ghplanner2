import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseFromContext } from '@/lib/database';
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

// Helper to get Cloudflare env from OpenNext global context
function getCloudflareContext() {
  try {
    // OpenNext sets up a global context with env bindings
    const globalAny = globalThis as any;
    
    // Try multiple ways to access the DB binding
    if (globalAny.__env?.DB) {
      return { env: globalAny.__env };
    }
    
    if (globalAny.env?.DB) {
      return { env: globalAny.env };
    }
    
    const symbol = Symbol.for('__cloudflare-request-context__');
    if (globalAny[symbol]?.env?.DB) {
      return globalAny[symbol];
    }
    
    if (typeof process !== 'undefined' && (process as any).env?.DB) {
      return { env: (process as any).env };
    }
    
    return undefined;
  } catch (err) {
    console.error('[SEND-OTP] Failed to get CF context:', err);
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get D1 from Cloudflare context on Pages
    const cfContext = getCloudflareContext();
    console.log('[SEND-OTP] Cloudflare context:', cfContext ? 'Found' : 'Not found');
    console.log('[SEND-OTP] CF context env.DB:', cfContext?.env?.DB ? 'Found' : 'Not found');

    const db = getDatabaseFromContext(cfContext);
    console.log('[SEND-OTP] Database instance:', db ? 'Created' : 'Failed');

    const helpers = new DbHelpers(db);
    const user = await helpers.findOne('users', { email  });

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({ 
        ok: true, 
        message: 'If an account exists with this email, a code has been sent.' 
      });
    }

    // Check if email is verified
    if (!(user as any).email_verified) {
      return NextResponse.json({ 
        error: 'Please verify your email first. Check your inbox for the verification link.' 
      }, { status: 403 });
    }

    const otpCode = generateOTP();
    const now = new Date();
    const nowTimestamp = dateToTimestamp(now);
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
    const expiresTimestamp = dateToTimestamp(expiresAt);

    // Store OTP in database
    await helpers.update('users', { email }, {
      otp_code: otpCode,
      otp_expires: expiresTimestamp,
      otp_attempts: 0,
      email_verified: (user as any).email_verified ? true : false,
      updated_at: nowTimestamp
    });

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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #0f1729 0%, #1a2332 50%, #1e293b 100%);">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #1a2332; border-radius: 12px; padding: 40px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); border: 1px solid rgba(255, 255, 255, 0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="background: linear-gradient(135deg, #f97316 0%, #10b981 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0; font-size: 32px; font-weight: 700;">Gh Planner</h1>
      </div>
      
      <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
        Your Sign In Code
      </h2>
      
      <p style="color: #cbd5e1; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Use this code to sign in to your Gh Planner account:
      </p>
      
      <div style="background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%); border: 2px solid rgba(249, 115, 22, 0.3); border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0;">
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 4px; color: #f97316; font-family: 'Courier New', monospace;">
          ${otpCode}
        </div>
      </div>
      
      <p style="color: #94a3b8; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
        This code will expire in 5 minutes. If you didn't request this code, you can safely ignore this email.
      </p>
      
      <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
      
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
        For security, never share this code with anyone. Gh Planner will never ask you for this code.
      </p>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
      <p style="margin: 0;">© ${new Date().getFullYear()} Gh Planner. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const text = `
Your Gh Planner Sign In Code

Use this code to sign in: ${otpCode}

This code will expire in 5 minutes.

If you didn't request this code, you can safely ignore this email.
    `.trim();

    // Dev mode: skip email, auto-login
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.log('[SEND-OTP] DEV MODE: Bypassing email, auto-logging in');
      console.log('[SEND-OTP] DEV MODE: OTP Code:', otpCode);
      
      return NextResponse.json({ 
        ok: true, 
        message: 'Development mode: auto-logging in',
        devMode: true,
        devOtpCode: otpCode,
        userId: user.id
      });
    }
    
    // Production: send email as normal
    try {
      console.log('[SEND-OTP] Sending OTP code to:', email);
      await sendEmail({
        to: email,
        subject: 'Your Sign In Code - Gh Planner',
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

