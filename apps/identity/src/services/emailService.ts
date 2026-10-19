import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { logger } from '../utils/logger';

interface SendPasswordResetEmailOptions {
  to: string;
  resetUrl: string;
  userEmail: string;
}

interface SendVerificationEmailOptions {
  to: string;
  verificationUrl: string;
  userEmail: string;
}

const SMTP_MAX_ATTEMPTS = 3;
const SMTP_RETRY_BASE_DELAY_MS = 1000;

const isDevelopment = process.env.NODE_ENV !== 'production';
const hasSmtpConfig = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

function getFromAddress(): string {
  return process.env.SMTP_FROM || 'noreply@prosolutions.dev';
}

function logDevMessageUrl(
  purpose: 'Verification' | 'Password reset',
  to: string,
  url: string,
) {
  if (isDevelopment) {
    logger.info(`${purpose} email URL (development)`, { to, url });
  }
}

async function createDevTransporter(): Promise<Transporter | null> {
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  } catch (error: unknown) {
    logger.warn('Could not create Ethereal test account; email will only be logged', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function resolveTransporter(): Promise<Transporter | null> {
  if (hasSmtpConfig) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  if (isDevelopment) {
    return createDevTransporter();
  }
  return null;
}

async function sendWithRetry(
  transporter: Transporter,
  mailOptions: SendMailOptions,
): Promise<boolean> {
  for (let attempt = 1; attempt <= SMTP_MAX_ATTEMPTS; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info('Email sent (SMTP)', {
        to: mailOptions.to,
        messageId: info.messageId,
        attempt,
      });
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info('Ethereal preview', { to: mailOptions.to, previewUrl });
      }
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === SMTP_MAX_ATTEMPTS) {
        logger.error('Email delivery failed after retries', {
          to: mailOptions.to,
          attempts: SMTP_MAX_ATTEMPTS,
          error: message,
        });
        return false;
      }
      logger.warn('Email send attempt failed, retrying', {
        to: mailOptions.to,
        attempt,
        maxAttempts: SMTP_MAX_ATTEMPTS,
        error: message,
      });
      await new Promise((resolve) =>
        setTimeout(resolve, SMTP_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)),
      );
    }
  }
  return false;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userEmail,
}: SendPasswordResetEmailOptions): Promise<boolean> {
  logDevMessageUrl('Password reset', to, resetUrl);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; }
    h1 { color: #1f2937; font-size: 24px; margin-bottom: 16px; }
    p { color: #4b5563; line-height: 1.6; margin-bottom: 16px; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .footer { margin-top: 24px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Password Reset Request</h1>
    <p>Hello,</p>
    <p>We received a request to reset your password for your ProSolutions account.</p>
    <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" class="button">Reset My Password</a>
    </p>
    <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    <div class="footer">
      <p>This email was sent to ${userEmail}</p>
      <p>If the button above doesn't work, copy this URL: ${resetUrl}</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const transporter = await resolveTransporter();
    if (!transporter) {
      logger.warn('No email transport available', { to: userEmail });
      return false;
    }

    return await sendWithRetry(transporter, {
      from: getFromAddress(),
      to: [to],
      subject: 'Password Reset Request - ProSolutions',
      html: htmlContent,
    });
  } catch (error: unknown) {
    logger.error('Error sending password reset email', {
      to,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function sendVerificationEmail({
  to,
  verificationUrl,
  userEmail,
}: SendVerificationEmailOptions): Promise<boolean> {
  logDevMessageUrl('Verification', to, verificationUrl);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; }
    h1 { color: #1f2937; font-size: 24px; margin-bottom: 16px; }
    p { color: #4b5563; line-height: 1.6; margin-bottom: 16px; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; }
    .footer { margin-top: 24px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Verify Your Email</h1>
    <p>Hello,</p>
    <p>Welcome to ProSolutions! Please verify your email address to activate your account.</p>
    <p>Click the button below to verify your email. This link will expire in 24 hours.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" class="button">Verify My Email</a>
    </p>
    <p>After verification, you'll be able to sign in and access your professional modules.</p>
    <div class="footer">
      <p>This email was sent to ${userEmail}</p>
      <p>If the button above doesn't work, copy this URL: ${verificationUrl}</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const transporter = await resolveTransporter();
    if (!transporter) {
      logger.warn('No email transport available', { to: userEmail });
      return false;
    }

    return await sendWithRetry(transporter, {
      from: getFromAddress(),
      to: [to],
      subject: 'Verify Your Email - ProSolutions',
      html: htmlContent,
    });
  } catch (error: unknown) {
    logger.error('Error sending verification email', {
      to,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
