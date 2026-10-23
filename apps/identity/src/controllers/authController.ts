import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
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
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../services/emailService';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../utils/cookies';
import {
  auditLog,
  extractRequestInfo,
} from '../utils/auditLog';
import { createTokenPair, revokeSession, signAccessToken, verifyRefreshToken } from '../services/tokenService';
import { ProSolutionsModule } from '../types/modules';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
const INTERNAL_SERVER_ERROR_MESSAGE = 'Internal server error';

function getDefaultModules(role: string): ProSolutionsModule[] {
  if (role === 'admin') {
    return Object.values(ProSolutionsModule);
  }
  // Initial product policy: new accounts receive the currently available
  // user-facing modules. Subsequent entitlement changes are explicit grants,
  // never silently restored during login or token refresh.
  return [ProSolutionsModule.PROCV, ProSolutionsModule.PROJOBS];
}

async function getActiveModules(userId: string): Promise<ProSolutionsModule[]> {
  const grants = await prisma.moduleAccess.findMany({
    where: {
      userId,
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { module: true },
  });
  const active = new Set(grants.map((grant) => grant.module));
  return Object.values(ProSolutionsModule).filter((module) => active.has(module));
}

export async function register(req: Request, res: Response) {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password, name } = value;
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      logger.warn('Registration failed: email already registered');
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, name },
    });

    const defaultModules = getDefaultModules(user.role);
    for (const module of defaultModules) {
      await prisma.moduleAccess.create({
        data: { userId: user.id, module },
      });
    }

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

    logger.info('User registered successfully', { userId: user.id });
    auditLog('authentication.register_success', {
      userId: user.id,
      email: user.email,
      ...extractRequestInfo(req),
    });

    const verificationEmailSent = await sendVerificationEmail({
      to: user.email,
      verificationUrl,
      userEmail: user.email,
    });
    if (!verificationEmailSent) {
      await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, used: false } });
      logger.warn('Verification email could not be delivered during registration', { userId: user.id });
    }

    return res.status(201).json({
      message: verificationEmailSent
        ? 'Account created. Check your email and follow the verification link before signing in.'
        : 'Account created, but the verification email could not be delivered. Please request a new link.',
      email: user.email,
      verificationEmailSent,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const prismaError = error as { code?: string; meta?: unknown; name?: string };
    logger.error('Registration failed due to internal error', {
      error: err.message,
      errorName: err.name,
      errorCode: prismaError.code,
      errorMeta: prismaError.meta,
      stack: err.stack,
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
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      });
    if (!user) {
      logger.warn('Login failed: invalid credentials');
      return res.status(401).json({ message: INVALID_CREDENTIALS_MESSAGE });
    }

    let match: boolean;
    try {
      match = await bcrypt.compare(password, user.passwordHash);
    } catch (bcryptError: unknown) {
      const isBcryptError =
        bcryptError instanceof Error &&
        /hash/i.test(bcryptError.message);
      logger.warn(
        isBcryptError
          ? 'Login failed: malformed password hash for user'
          : 'Login failed: bcrypt comparison error',
        {
          userId: user.id,
          error: bcryptError instanceof Error ? bcryptError.message : String(bcryptError),
        },
      );
      return res.status(401).json({ message: INVALID_CREDENTIALS_MESSAGE });
    }
    if (!match) {
      logger.warn('Login failed: invalid credentials', { userId: user.id });
      return res.status(401).json({ message: INVALID_CREDENTIALS_MESSAGE });
    }

    if (!user.emailVerified) {
      logger.warn('Login failed: email not verified', {
        userId: user.id,
        email: user.email,
      });
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

    if (!user.isActive) {
      logger.warn('Login failed: user inactive', { userId: user.id });
      return res.status(403).json({
        message: 'Account is inactive. Please contact support.',
      });
    }

    const modules = await getActiveModules(user.id);

    const { accessToken, refreshToken } = await createTokenPair({
      id: user.id,
      email: user.email,
      role: user.role,
      modules,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }),
        prisma.session.update({
          where: { refreshToken },
          data: { expiresAt, lastAccessedAt: new Date() },
        }),
      ]);
    } catch (txError: unknown) {
      logger.warn('Session update after login failed, token still valid', {
        userId: user.id,
        error: txError instanceof Error ? txError.message : String(txError),
      });
    }

    setRefreshTokenCookie(res, refreshToken);

    auditLog('authentication.login_success', {
      userId: user.id,
      email: user.email,
      ...extractRequestInfo(req),
    });
    logger.info('Login successful', { userId: user.id, modules });
    return res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        modules,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const bodyEmail = (req.body as { email?: string })?.email;
    const prismaError = error as { code?: string; meta?: unknown; name?: string };
    logger.error('Login failed due to internal error', {
      error: err.message,
      errorName: err.name,
      errorCode: prismaError.code,
      errorMeta: prismaError.meta,
      stack: err.stack,
      email: bodyEmail,
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
    const payload = verifyRefreshToken(refreshToken) as {
      sub: string;
    };
    const session = await prisma.session.findUnique({ where: { refreshToken } });
    if (
      !session ||
      session.revokedAt ||
      session.userId !== payload.sub ||
      session.expiresAt < new Date()
    ) {
      logger.warn('Refresh token rejected');
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { moduleAccess: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    const modules = await ensureDefaultModuleAccess(user.id, user.role);

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      modules,
    });

    const jti = crypto.randomUUID();
    const newRefreshToken = jwt.sign(
      { sub: user.id, jti },
      config.jwtSecret,
      {
        issuer: config.issuer,
        audience: config.audience,
        expiresIn: config.jwtRefreshExpiresIn,
      } as jwt.SignOptions,
    );
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
          jti,
          expiresAt: newExpiresAt,
          lastAccessedAt: new Date(),
        },
      }),
    ]);

    setRefreshTokenCookie(res, newRefreshToken);
    return res.json({ accessToken, modules });
  } catch {
    logger.warn('Refresh token verification failed');
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}

export async function me(req: Request, res: Response) {
  const userId = (req as any).userId;
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
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      moduleAccess: {
        where: {
          active: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { module: true },
      },
      professionalProfile: true,
    },
  });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const modules = user.moduleAccess.map((ma) => ma.module);

  return res.json({
    user: {
      ...user,
      modules,
      moduleAccess: undefined,
    },
  });
}

export async function updateProfile(req: Request, res: Response) {
  const { error, value } = updateProfileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { name, email } = value;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
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

      const emailSent = await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        userEmail: user.email,
      });
      if (!emailSent) {
        await prisma.passwordResetToken.deleteMany({
          where: { tokenHash, used: false },
        });
        logger.warn('Password reset email could not be delivered', { userId: user.id });
      }
    }

    return res.json({
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const bodyEmail = (req.body as { email?: string })?.email;
    const prismaError = error as { code?: string; meta?: unknown; name?: string };
    logger.error('Forgot password failed due to internal error', {
      error: err.message,
      errorName: err.name,
      errorCode: prismaError.code,
      errorMeta: prismaError.meta,
      stack: err.stack,
      email: bodyEmail,
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
      prisma.session.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    logger.info('Password reset successful', { userId: resetToken.userId });
    return res.json({ message: 'Password has been reset successfully' });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const prismaError = error as { code?: string; meta?: unknown; name?: string };
    logger.error('Reset password failed due to internal error', {
      error: err.message,
      errorName: err.name,
      errorCode: prismaError.code,
      errorMeta: prismaError.meta,
      stack: err.stack,
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

    if (
      !verificationToken ||
      verificationToken.expiresAt < new Date() ||
      verificationToken.used
    ) {
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

    logger.info('Email verified successfully', {
      userId: verificationToken.userId,
    });
    auditLog('authentication.email_verified', {
      userId: verificationToken.userId,
      email: verificationToken.user.email,
      ...extractRequestInfo(req),
    });

    const modules = await getActiveModules(verificationToken.userId);

    const { accessToken, refreshToken } = await createTokenPair({
      id: verificationToken.userId,
      email: verificationToken.user.email,
      role: verificationToken.user.role,
      modules,
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
        modules,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const prismaError = error as { code?: string; meta?: unknown; name?: string };
    logger.error('Email verification failed due to internal error', {
      error: err.message,
      errorName: err.name,
      errorCode: prismaError.code,
      errorMeta: prismaError.meta,
      stack: err.stack,
    });
    return res.status(500).json({ message: INTERNAL_SERVER_ERROR_MESSAGE });
  }
}

const RESEND_COOLDOWN_MS = 60 * 1000;

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
    const { error, value } = resendVerificationSchema.validate({
      email: req.query.email,
    });
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

      await prisma.$transaction(async (tx) => {
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

      const emailSent = await sendVerificationEmail({
        to: user.email,
        verificationUrl,
        userEmail: user.email,
      });
      if (!emailSent) {
        await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, tokenHash } });
        logger.warn('Verification email could not be delivered when resending', { userId: user.id });
      }
    }

    return res.json({
      message:
        'If an account with that email exists and has not been verified, a verification link has been sent.',
      retryAfterSeconds: 60,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    const bodyEmail = (req.body as { email?: string })?.email;
    const prismaError = error as { code?: string; meta?: unknown; name?: string };
    logger.error('Resend verification failed due to internal error', {
      error: err.message,
      errorName: err.name,
      errorCode: prismaError.code,
      errorMeta: prismaError.meta,
      stack: err.stack,
      email: bodyEmail,
    });
    return res.status(500).json({ message: INTERNAL_SERVER_ERROR_MESSAGE });
  }
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (refreshToken) {
    try {
      await revokeSession(refreshToken);
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
