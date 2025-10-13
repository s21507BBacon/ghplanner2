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
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
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
        email_verified: 0,
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

    // Send verification email
    try {
      console.log('[SIGNUP] Sending verification code to:', email);
      await sendEmail({
        to: email,
        subject: 'Your Verification Code - GitHub Planner',
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

