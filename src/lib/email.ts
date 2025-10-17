import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Get environment variable from Cloudflare context or process.env
function getEnvVar(key: string): string | undefined {
  console.log(`[EMAIL] Getting env var: ${key}`);

  // Try Cloudflare context first (for Pages/Workers)
  try {
    const globalAny = globalThis as any;

    // Check OpenNext context
    const symbol = Symbol.for('__cloudflare-request-context__');
    if (globalAny[symbol]?.env?.[key]) {
      console.log(`[EMAIL] Found ${key} in OpenNext context`);
      return globalAny[symbol].env[key];
    }

    // Check global env
    if (globalAny.__env?.[key]) {
      console.log(`[EMAIL] Found ${key} in global __env`);
      return globalAny.__env[key];
    }

    if (globalAny.env?.[key]) {
      console.log(`[EMAIL] Found ${key} in global env`);
      return globalAny.env[key];
    }
  } catch (e) {
    console.log(`[EMAIL] Error accessing Cloudflare context for ${key}:`, e);
  }

  // Fallback to process.env (for local development)
  const processEnvValue = process.env[key];
  if (processEnvValue) {
    console.log(`[EMAIL] Found ${key} in process.env`);
  } else {
    console.log(`[EMAIL] ${key} NOT FOUND in any location`);
  }
  return processEnvValue;
}

// Initialize Resend client
function getResendClient() {
  const apiKey = getEnvVar('RESEND_API_KEY');
  
  console.log('[EMAIL] Environment check:');
  console.log('  - RESEND_API_KEY:', apiKey ? `Set (${apiKey.substring(0, 8)}...)` : 'NOT SET');
  console.log('  - EMAIL_FROM:', getEnvVar('EMAIL_FROM') || 'NOT SET');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  
  if (!apiKey) {
    console.error('[EMAIL] ERROR: RESEND_API_KEY not configured');
    throw new Error('Email service not configured: RESEND_API_KEY missing');
  }
  
  if (!apiKey.startsWith('re_')) {
    console.error('[EMAIL] ERROR: Invalid RESEND_API_KEY format (should start with "re_")');
    throw new Error('Email service not configured: Invalid RESEND_API_KEY format');
  }
  
  return new Resend(apiKey);
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    console.log('[EMAIL] Starting email send process');
    console.log('[EMAIL] To:', to);
    console.log('[EMAIL] Subject:', subject);
    
    const resend = getResendClient();
    const fromEmail = process.env.EMAIL_FROM || 'Gh Planner <onboarding@resend.dev>';
    
    console.log('[EMAIL] From:', fromEmail);
    
    if (fromEmail.includes('localhost') || fromEmail.includes('onboarding@resend.dev')) {
      console.warn('[EMAIL] WARNING: Using default/localhost email address. This may fail in production.');
    }

    console.log('[EMAIL] Calling Resend API...');
    const result = await resend.emails.send({
      from: getEnvVar('EMAIL_FROM') || fromEmail,
      to,
      subject,
      html,
      text: text || undefined,
    });

    console.log('[EMAIL] Resend API response:', JSON.stringify(result, null, 2));

    if (result.error) {
      console.error('[EMAIL] Resend returned error:', JSON.stringify(result.error, null, 2));
      console.error('[EMAIL] Error name:', result.error.name);
      console.error('[EMAIL] Error message:', result.error.message);
      
      throw new Error(`Email send failed: ${result.error.message} (${result.error.name})`);
    }

    console.log('[EMAIL] ✓ Email sent successfully!');
    console.log('[EMAIL] Message ID:', result.data?.id);
    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('[EMAIL] ✗ Failed to send email - Full error details:');
    console.error('[EMAIL] Error type:', typeof error);
    console.error('[EMAIL] Error name:', error?.name);
    console.error('[EMAIL] Error message:', error?.message);
    console.error('[EMAIL] Error stack:', error?.stack);
    console.error('[EMAIL] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    if (error?.message?.includes('not configured')) {
      throw new Error(`Email configuration error: ${error.message}`);
    }
    
    if (error?.message?.includes('401') || error?.message?.includes('unauthorized')) {
      throw new Error('Email authentication failed: Invalid API key');
    }
    
    if (error?.message?.includes('domain')) {
      throw new Error('Email domain error: Verify your domain in Resend dashboard');
    }
    
    throw new Error(`Email send failed: ${error?.message || 'Unknown error'}`);
  }
}

export async function sendVerificationEmail(email: string, token: string, name?: string) {
  const appUrl = getEnvVar('NEXTAUTH_URL') || getEnvVar('APP_URL') || 'http://localhost:3000';
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #0f1729 0%, #1a2332 50%, #1e293b 100%);">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #1a2332; border-radius: 12px; padding: 40px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); border: 1px solid rgba(255, 255, 255, 0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="background: linear-gradient(90deg, #f97316 0%, #10b981 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0; font-size: 32px; font-weight: 700;">Gh Planner</h1>
      </div>
      
      <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
        Welcome${name ? ` ${name}` : ''}!
      </h2>
      
      <p style="color: #cbd5e1; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Thanks for signing up for Gh Planner. To complete your registration and verify your email address, please click the button below:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);">
          Verify Email Address
        </a>
      </div>
      
      <p style="color: #94a3b8; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
        Or copy and paste this link into your browser:<br>
        <a href="${verificationUrl}" style="color: #f97316; word-break: break-all; text-decoration: underline;">
          ${verificationUrl}
        </a>
      </p>
      
      <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
      
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
        This link will expire in 24 hours. If you didn't create an account with Gh Planner, you can safely ignore this email.
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

Thanks for signing up for Gh Planner. To complete your registration and verify your email address, please visit:

${verificationUrl}

This link will expire in 24 hours. If you didn't create an account with Gh Planner, you can safely ignore this email.
  `.trim();

  await sendEmail({
    to: email,
    subject: 'Verify Your Email - Gh Planner',
    html,
    text,
  });
}

export async function sendEnterpriseInviteEmail(
  email: string, 
  token: string, 
  enterpriseName: string, 
  invitedByName: string, 
  recipientName?: string
) {
  const appUrl = getEnvVar('NEXTAUTH_URL') || getEnvVar('APP_URL') || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/enterprises/invite?token=${token}`;

  const greeting = recipientName ? `Hi ${recipientName}` : 'Hi';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Enterprise Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #0f1729 0%, #1a2332 50%, #1e293b 100%);">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #1a2332; border-radius: 12px; padding: 40px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); border: 1px solid rgba(255, 255, 255, 0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="background: linear-gradient(90deg, #f97316 0%, #10b981 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0; font-size: 32px; font-weight: 700;">Gh Planner</h1>
      </div>
      
      <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
        ${greeting}!
      </h2>
      
      <p style="color: #cbd5e1; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        ${invitedByName} has invited you to join the <strong style="color: #f97316;">${enterpriseName}</strong> enterprise on Gh Planner.
      </p>
      
      <p style="color: #cbd5e1; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Click the button below to accept this invitation. If you don't have an account yet, you'll be able to create one.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">
          Accept Invitation
        </a>
      </div>
      
      <p style="color: #94a3b8; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
        Or copy and paste this link into your browser:<br>
        <a href="${inviteUrl}" style="color: #10b981; word-break: break-all; text-decoration: underline;">
          ${inviteUrl}
        </a>
      </p>
      
      <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 30px 0;">
      
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
        This invitation will expire in 7 days. If you weren't expecting this invitation, you can safely ignore this email.
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
${greeting}!

${invitedByName} has invited you to join the ${enterpriseName} enterprise on Gh Planner.

Click the link below to accept this invitation. If you don't have an account yet, you'll be able to create one.

${inviteUrl}

This invitation will expire in 7 days. If you weren't expecting this invitation, you can safely ignore this email.
  `.trim();

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${enterpriseName} on Gh Planner`,
    html,
    text,
  });
}

