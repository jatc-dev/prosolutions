import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import prisma from '../prismaClient';
import { logger } from '../utils/logger';

export interface IdentityTokenPayload {
  sub: string;
  email?: string;
  role?: string;
  modules?: string[];
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_OPTIONS: jwt.SignOptions = {
  issuer: config.issuer,
  audience: config.audience,
  expiresIn: config.jwtRefreshExpiresIn as any,
};

/**
 * Issue claims from the central access registry, never from client input.
 * The audience list includes Identity plus each enabled module the user is
 * currently entitled to use. Adding a registered module therefore does not
 * require hard-coding a new audience into this service.
 */
export async function signAccessToken(payload: {
  sub: string;
  email?: string;
  role?: string;
}): Promise<string> {
  const now = new Date();
  const access = await prisma.moduleAccess.findMany({
    where: {
      userId: payload.sub,
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      module: { enabled: true },
    },
    select: {
      moduleCode: true,
      module: { select: { apiAudience: true } },
    },
  });

  const modules = access.map((entry) => entry.moduleCode);
  const audience = Array.from(
    new Set([config.audience, ...access.map((entry) => entry.module.apiAudience)]),
  );

  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      modules,
    },
    config.jwtSecret,
    {
      issuer: config.issuer,
      audience,
      expiresIn: config.jwtExpiresIn as any,
    },
  );
}

export function signRefreshToken(payload: { sub: string; jti: string }): string {
  return jwt.sign(
    { sub: payload.sub, jti: payload.jti },
    config.jwtSecret,
    REFRESH_TOKEN_OPTIONS,
  );
}

export function verifyAccessToken(token: string): IdentityTokenPayload {
  return jwt.verify(token, config.jwtSecret, {
    issuer: config.issuer,
    audience: config.audience,
  }) as IdentityTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string; jti: string } {
  return jwt.verify(token, config.jwtSecret, {
    issuer: config.issuer,
    audience: config.audience,
  }) as { sub: string; jti: string };
}

export async function createTokenPair(user: {
  id: string;
  email: string;
  role: string;
}): Promise<TokenPair> {
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken({ sub: user.id, jti });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        jti,
        expiresAt,
        lastAccessedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: unknown; name?: string };
    logger.error('Failed to persist session during token pair creation', {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
      errorName: prismaError.name,
      errorCode: prismaError.code,
      errorMeta: prismaError.meta,
    });
    throw error;
  }

  return { accessToken, refreshToken };
}

export async function revokeSession(refreshToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function rotateSession(
  oldRefreshToken: string,
  userId: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  await prisma.session.updateMany({
    where: { refreshToken: oldRefreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken({ sub: userId, jti });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      refreshToken,
      jti,
      expiresAt,
      lastAccessedAt: new Date(),
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true },
  });
  const accessToken = await signAccessToken({
    sub: userId,
    email: user?.email ?? undefined,
    role: user?.role ?? undefined,
  });

  return { accessToken, refreshToken };
}

export async function validateSession(
  refreshToken: string,
): Promise<{ valid: boolean; userId?: string; reason?: string }> {
  try {
    const session = await prisma.session.findUnique({ where: { refreshToken } });

    if (!session) {
      return { valid: false, reason: 'session_not_found' };
    }

    if (session.revokedAt) {
      return { valid: false, reason: 'session_revoked' };
    }

    if (session.expiresAt < new Date()) {
      return { valid: false, reason: 'session_expired' };
    }

    return { valid: true, userId: session.userId };
  } catch (error) {
    logger.error('Session validation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { valid: false, reason: 'validation_error' };
  }
}

export async function updateLastAccessed(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastAccessedAt: new Date() },
  });
}

export async function deleteAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
