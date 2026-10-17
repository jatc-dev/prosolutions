import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prismaClient';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from '../validation/authValidation';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../utils/cookies';
import { auditLog, extractRequestInfo } from '../utils/auditLog';
import { AuthRequest } from '../middleware/auth';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
const INTERNAL_SERVER_ERROR_MESSAGE = 'Internal server error';

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

function signRefreshToken(userId: string) {
  // JWTs with the same subject and second-level iat can otherwise be identical.
  // Sessions require a unique refreshToken, so add a cryptographically random jti.
  return jwt.sign({ sub: userId, jti: crypto.randomUUID() }, config.jwtSecret, {
    expiresIn: config.jwtRefreshExpiresIn,
  } as jwt.SignOptions);
}

export async function register(req: Request, res: Response) {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password, name } = value;
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      logger.warn('Registration failed: email already registered');
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, name },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;

    // Registration never authenticates: no access token, refresh cookie or
    // session is issued until the email is verified. Login enforces the same
    // rule, so the only way to obtain a session is verifying the email.
    logger.info('User registered successfully', { userId: user.id });
    auditLog('authentication.register_success', {
      userId: user.id,
      email: user.email,
      ...extractRequestInfo(req),
    });

    const response = res.status(201).json({
      message:
        'Account created. Check your email and follow the verification link before signing in.',
      email: user.email,
    });

    // Verification email is best-effort and must never delay or fail the
    // registration response: SMTP latency or outages stay invisible to the
    // user, who can request a resend from the verification page.
    void sendVerificationEmail({
      to: user.email,
      verificationUrl,
      userEmail: user.email,
    }).catch((err: unknown) => {
      logger.warn('Verification email failed to send during registration', {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    return response;
  } catch (error: unknown) {
    logger.error('Registration failed due to internal error');
    logger.debug('Registration error details', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: INTERNAL_SERVER_ERROR_MESSAGE });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = value;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      logger.warn('Login failed: invalid credentials');
      return res.status(401).json({ message: INVALID_CREDENTIALS_MESSAGE });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      logger.warn('Login failed: invalid credentials', { userId: user.id });
      return res.status(401).json({ message: INVALID_CREDENTIALS_MESSAGE });
    }

    if (!user.emailVerified) {
      logger.warn('Login failed: email not verified', { userId: user.id, email: user.email });
      auditLog('authentication.login_unverified', {
        userId: user.id,
        email: user.email,
        ...extractRequestInfo(req),
      });
      return res.status(403).json({
        message:
          'Please verify your email before signing in. Check your inbox for a verification link.',
      });
    }

    const accessToken = signToken(user.id);
    const refreshToken = signRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update last login time and create session
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      prisma.session.create({
        data: { userId: user.id, refreshToken, expiresAt },
      }),
    ]);

    setRefreshTokenCookie(res, refreshToken);

    auditLog('authentication.login_success', {
      userId: user.id,
      email: user.email,
      ...extractRequestInfo(req),
    });
    logger.info('Login successful', { userId: user.id });
    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error: unknown) {
    logger.error('Login failed due to internal error');
    logger.debug('Login error details', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: INTERNAL_SERVER_ERROR_MESSAGE });
  }
}

export async function refreshToken(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token missing' });
  }

  try {
    const payload = jwt.verify(refreshToken, config.jwtSecret) as { sub: string };
    const session = await prisma.session.findUnique({ where: { refreshToken } });
    if (!session || session.expiresAt < new Date()) {
      logger.warn('Refresh token rejected');
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const accessToken = signToken(payload.sub);
    const newRefreshToken = signRefreshToken(payload.sub);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      prisma.session.create({
        data: {
          userId: session.userId,
          refreshToken: newRefreshToken,
          expiresAt: newExpiresAt,
          lastAccessedAt: new Date(),
        },
      }),
    ]);

    setRefreshTokenCookie(res, newRefreshToken);
    return res.json({ accessToken });
  } catch {
    logger.warn('Refresh token verification failed');
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

export async function me(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user });
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const { error, value } = updateProfileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { name, email } = value;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase().trim();
    // Check if email is already taken by another user (case-insensitive)
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser && existingUser.id !== userId) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    updateData.email = normalizedEmail;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, email: true, name: true, updatedAt: true },
  });

  return res.json({ user, message: 'Profile updated successfully' });
}

export async function forgotPassword(req: Request, res: Response) {
  const { error, value } = forgotPasswordSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email } = value;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      const resetUrl = `${config.frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

      // Best-effort and non-blocking: the generic response must go out even if
      // SMTP is slow or down, and it must not reveal whether the account exists.
      void sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        userEmail: user.email,
      }).catch((err: unknown) => {
        logger.warn('Password reset email failed to send', {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    return res.json({
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error: unknown) {
    logger.error('Forgot password failed due to internal error');
    logger.debug('Forgot password error details', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: INTERNAL_SERVER_ERROR_MESSAGE });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { token, password } = value;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.used) {
      logger.warn('Password reset token invalid or expired');
      return res.status(401).json({ message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    await prisma.session.deleteMany({
      where: { userId: resetToken.userId },
    });

    logger.info('Password reset successful', { userId: resetToken.userId });
    return res.json({ message: 'Password has been reset successfully' });
  } catch (error: unknown) {
    logger.error('Reset password failed due to internal error');
    logger.debug('Reset password error details', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: INTERNAL_SERVER_ERROR_MESSAGE });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  const { error, value } = verifyEmailSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { token } = value;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!verificationToken || verificationToken.expiresAt < new Date() || verificationToken.used) {
      logger.warn('Email verification token invalid or expired');
      return res.status(401).json({ message: 'Invalid or expired verification token' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true },
      }),
    ]);

    logger.info('Email verified successfully', { userId: verificationToken.userId });
    auditLog('authentication.email_verified', {
      userId: verificationToken.userId,
      email: verificationToken.user.email,
      ...extractRequestInfo(req),
    });

    // Verification is the only door into the app: issue the session here so a
    // verified user lands signed in, while unverified accounts can never obtain
    // a token (register no longer issues one and login rejects them).
    const accessToken = signToken(verificationToken.userId);
    const refreshToken = signRefreshToken(verificationToken.userId);
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: verificationToken.userId,
        refreshToken,
        expiresAt: sessionExpiresAt,
        lastAccessedAt: new Date(),
      },
    });

    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      message: 'Email verified successfully',
      accessToken,
      user: {
        id: verificationToken.user.id,
        email: verificationToken.user.email,
        name: verificationToken.user.name,
        role: verificationToken.user.role,
        emailVerified: true,
      },
    });
  } catch (error: unknown) {
    logger.error('Email verification failed due to internal error');
    logger.debug('Email verification error details', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: INTERNAL_SERVER_ERROR_MESSAGE });
  }
}

const RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * Seconds remaining before another verification email can be requested.
 * The latest verification token doubles as the record of the last send, so
 * this works for any client (cross-device, private mode, cleared storage).
 */
async function computeResendCooldownSeconds(userId: string): Promise<number> {
  const latestToken = await prisma.emailVerificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestToken) {
    return 0;
  }

  const elapsed = Date.now() - latestToken.createdAt.getTime();
  if (elapsed >= RESEND_COOLDOWN_MS) {
    return 0;
  }
  return Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
}

export async function getVerificationCooldown(req: Request, res: Response) {
  try {
    const { error, value } = resendVerificationSchema.validate({ email: req.query.email });
    if (error) {
      return res.json({ retryAfterSeconds: 0 });
    }

    const user = await prisma.user.findUnique({
      where: { email: value.email.toLowerCase().trim() },
    });
    if (!user) {
      return res.json({ retryAfterSeconds: 0 });
    }

    const retryAfterSeconds = await computeResendCooldownSeconds(user.id);
    return res.json({ retryAfterSeconds });
  } catch (error: unknown) {
    logger.warn('Verification cooldown lookup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.json({ retryAfterSeconds: 0 });
  }
}

export async function resendVerification(req: Request, res: Response) {
  const { error, value } = resendVerificationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email } = value;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Cooldown between resend requests: the latest verification token doubles
      // as the record of the last send.
      const retryAfterSeconds = await computeResendCooldownSeconds(user.id);

      if (retryAfterSeconds > 0) {
        logger.info('Verification resend blocked by cooldown', {
          userId: user.id,
          retryAfterSeconds,
        });
        return res.status(429).json({
          message: `Please wait ${retryAfterSeconds} seconds before requesting another email.`,
          retryAfterSeconds,
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.$transaction(async tx => {
        await tx.emailVerificationToken.deleteMany({
          where: { userId: user.id },
        });
        await tx.emailVerificationToken.create({
          data: {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
        });
      });

      const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;

      // Best-effort and non-blocking: an explicit resend must not hang when
      // SMTP is slow or unreachable.
      void sendVerificationEmail({
        to: user.email,
        verificationUrl,
        userEmail: user.email,
      }).catch((err: unknown) => {
        logger.warn('Verification email failed to resend', {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    return res.json({
      message:
        'If an account with that email exists and has not been verified, a verification link has been sent.',
      retryAfterSeconds: 60,
    });
  } catch (error: unknown) {
    logger.error('Resend verification failed due to internal error');
    logger.debug('Resend verification error details', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({ message: INTERNAL_SERVER_ERROR_MESSAGE });
  }
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (refreshToken) {
    try {
      await prisma.session.updateMany({
        where: { refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch (error: unknown) {
      logger.warn('Logout: failed to revoke session', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  clearRefreshTokenCookie(res);
  auditLog('authentication.logout', { ...extractRequestInfo(req) });
  logger.info('User logged out');
  return res.json({ message: 'Logged out successfully' });
}
