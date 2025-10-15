import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseFromContext } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';
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

// Helper to get Cloudflare env from OpenNext global context
function getCloudflareContext() {
  try {
    console.log('[SIGNUP] Attempting to get Cloudflare context from global...');
    
    // OpenNext sets up a global context with env bindings
    // Try multiple ways to access it
    const globalAny = globalThis as any;
    
    // Method 1: Check for __env or env on globalThis
    if (globalAny.__env?.DB) {
      console.log('[SIGNUP] Found DB in globalThis.__env');
      return { env: globalAny.__env };
    }
    
    if (globalAny.env?.DB) {
      console.log('[SIGNUP] Found DB in globalThis.env');
      return { env: globalAny.env };
    }
    
    // Method 2: Check for the cloudflare request context symbol
    const symbol = Symbol.for('__cloudflare-request-context__');
    if (globalAny[symbol]?.env?.DB) {
      console.log('[SIGNUP] Found DB in cloudflare request context symbol');
      return globalAny[symbol];
    }
    
    // Method 3: Check process.env for Cloudflare Worker context
    if (typeof process !== 'undefined' && (process as any).env?.DB) {
      console.log('[SIGNUP] Found DB in process.env');
      return { env: (process as any).env };
    }
    
    console.error('[SIGNUP] Could not find DB binding in any context');
    return undefined;
  } catch (err) {
    console.error('[SIGNUP] Failed to get CF context:', err);
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[SIGNUP] POST request received');
    const body = await request.json();
    const { email, name } = body;
    console.log('[SIGNUP] Email:', email);

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Get D1 from Cloudflare context on Pages
    console.log('[SIGNUP] Getting database...');
    const cfContext = getCloudflareContext();
    const db = getDatabaseFromContext(cfContext);
    console.log('[SIGNUP] Got database instance');
    const helpers = new DbHelpers(db);
    let user = await helpers.findOne('users', { email });
    
    const otpCode = generateOTP();
    const now = new Date();
    const nowTimestamp = dateToTimestamp(now);
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
    const expiresTimestamp = dateToTimestamp(expiresAt);

    if (user) {
      // User exists, just send new OTP
      await helpers.update(
        'users',
        { email },
        { 
          otp_code: otpCode,
          otp_expires: expiresTimestamp,
          otp_attempts: 0,
          email_verified: user.email_verified,
          updated_at: nowTimestamp
        }
      );
    } else {
      // Create new user
      const userId = crypto.randomUUID();
      const newUser = {
        id: userId,
        email,
        name: name || '',
        email_verified: false,
        otp_code: otpCode,
        otp_expires: expiresTimestamp,
        otp_attempts: 0,
        created_at: nowTimestamp,
        updated_at: nowTimestamp,
      };
      
      console.log('[SIGNUP] Creating user with OTP:', otpCode);
      await helpers.insert('users', newUser);
      user = { id: userId, email, name: name || '' } as any;
    }

    // Send OTP email
    // Get env vars from Cloudflare context
    const getEnvVar = (key: string): string | undefined => {
      try {
        const globalAny = globalThis as any;
        const symbol = Symbol.for('__cloudflare-request-context__');
        if (globalAny[symbol]?.env?.[key]) return globalAny[symbol].env[key];
        if (globalAny.__env?.[key]) return globalAny.__env[key];
        if (globalAny.env?.[key]) return globalAny.env[key];
      } catch {}
      return process.env[key];
    };
    
    const appUrl = getEnvVar('APP_URL') || 'http://localhost:3000';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #0f1729 0%, #1a2332 50%, #1e293b 100%);">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #1a2332; border-radius: 12px; padding: 40px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); border: 1px solid rgba(255, 255, 255, 0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="background: linear-gradient(135deg, #f97316 0%, #10b981 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0; font-size: 32px; font-weight: 700;">Gh Planner</h1>
      </div>
      
      <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
        Welcome${name ? ` ${name}` : ''}!
      </h2>
      
      <p style="color: #cbd5e1; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Your verification code is:
      </p>
      
      <div style="background: linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%); border: 2px solid rgba(249, 115, 22, 0.3); border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0;">
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 4px; color: #f97316; font-family: 'Courier New', monospace;">
          ${otpCode}
        </div>
      </div>
      
      <p style="color: #94a3b8; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
        This code will expire in 5 minutes. Enter it to complete your sign up.
      </p>
      
      <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
      
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
        If you didn't request this code, you can safely ignore this email.
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
Welcome${name ? ` ${name}` : ''}!

Your verification code is: ${otpCode}

This code will expire in 5 minutes.

If you didn't request this code, you can safely ignore this email.
    `.trim();

    // Send verification email
    try {
      console.log('[SIGNUP] Sending verification code to:', email);
      await sendEmail({
        to: email,
        subject: 'Your Verification Code - Gh Planner',
        html,
        text,
      });
      console.log('[SIGNUP] Verification code sent successfully');
    } catch (emailError: any) {
      console.error('[SIGNUP] Failed to send verification email:', emailError);
      console.error('[SIGNUP] Error details:', {
        message: emailError?.message,
        name: emailError?.name,
        stack: emailError?.stack
      });
      
      const errorMessage = emailError?.message || 'Failed to send verification code';
      return NextResponse.json({ 
        error: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? {
          type: emailError?.name,
          details: emailError?.message
        } : undefined
      }, { status: 500 });
    }

    console.log('[SIGNUP] Success - returning response');
    return NextResponse.json({ 
      ok: true, 
      message: 'Verification code sent. Please check your inbox.' 
    });
  } catch (e: any) {
    console.error('[SIGNUP] ===== CRITICAL ERROR =====');
    console.error('[SIGNUP] Error:', e);
    console.error('[SIGNUP] Error message:', e?.message);
    console.error('[SIGNUP] Error name:', e?.name);
    console.error('[SIGNUP] Error stack:', e?.stack);
    console.error('[SIGNUP] ===========================');
    
    return NextResponse.json({ 
      error: 'Failed to sign up',
      details: e?.message || 'Unknown error',
      debug: process.env.NODE_ENV === 'development' ? String(e) : undefined
    }, { status: 500 });
  }
}

