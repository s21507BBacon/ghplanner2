import * as nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create reusable transporter
const createTransporter = () => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    console.error('Gmail credentials not configured');
    throw new Error('Email service not configured');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    },
  });

  return transporter;
};

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    console.log('[EMAIL] Creating transporter...');
    const transporter = createTransporter();

    console.log('[EMAIL] Sending email to:', to);
    const info = await transporter.sendMail({
      from: `"GitHub Planner" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: text || '',
      html,
    });

    console.log('[EMAIL] Email sent successfully! MessageId:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error);
    throw error;
  }
}

export async function sendVerificationEmail(email: string, token: string, name?: string) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
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

