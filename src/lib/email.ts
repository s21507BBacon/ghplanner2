import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Initialize Resend client
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  
  console.log('[EMAIL] Environment check:');
  console.log('  - RESEND_API_KEY:', apiKey ? `Set (${apiKey.substring(0, 8)}...)` : 'NOT SET');
  console.log('  - EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');
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
    const fromEmail = process.env.EMAIL_FROM || 'GitHub Planner <onboarding@resend.dev>';
    
    console.log('[EMAIL] From:', fromEmail);
    
    if (fromEmail.includes('localhost') || fromEmail.includes('onboarding@resend.dev')) {
      console.warn('[EMAIL] WARNING: Using default/localhost email address. This may fail in production.');
    }

    console.log('[EMAIL] Calling Resend API...');
    const result = await resend.emails.send({
      from: fromEmail,
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
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
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
        Thanks for signing up for GitHub Planner. To complete your registration and verify your email address, please click the button below:
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Verify Email Address
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
        Or copy and paste this link into your browser:<br>
        <a href="${verificationUrl}" style="color: #2563eb; word-break: break-all;">
          ${verificationUrl}
        </a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
        This link will expire in 24 hours. If you didn't create an account with GitHub Planner, you can safely ignore this email.
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

Thanks for signing up for GitHub Planner. To complete your registration and verify your email address, please visit:

${verificationUrl}

This link will expire in 24 hours. If you didn't create an account with GitHub Planner, you can safely ignore this email.
  `.trim();

  await sendEmail({
    to: email,
    subject: 'Verify Your Email - GitHub Planner',
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
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
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
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 28px;">GitHub Planner</h1>
      </div>
      
      <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">
        ${greeting}!
      </h2>
      
      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        ${invitedByName} has invited you to join the <strong>${enterpriseName}</strong> enterprise on GitHub Planner.
      </p>
      
      <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Click the button below to accept this invitation. If you don't have an account yet, you'll be able to create one.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" 
           style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
        Or copy and paste this link into your browser:<br>
        <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">
          ${inviteUrl}
        </a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px; margin: 0;">
        This invitation will expire in 7 days. If you weren't expecting this invitation, you can safely ignore this email.
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
${greeting}!

${invitedByName} has invited you to join the ${enterpriseName} enterprise on GitHub Planner.

Click the link below to accept this invitation. If you don't have an account yet, you'll be able to create one.

${inviteUrl}

This invitation will expire in 7 days. If you weren't expecting this invitation, you can safely ignore this email.
  `.trim();

  await sendEmail({
    to: email,
    subject: `You've been invited to join ${enterpriseName} on GitHub Planner`,
    html,
    text,
  });
}

