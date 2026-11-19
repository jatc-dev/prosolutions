import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
  setRefreshTokenCookie,
} from '../utils/cookies';
import { auditLog, extractRequestInfo } from '../utils/auditLog';
import { ensureDefaultModuleAccess } from '../services/moduleAccessService';
import {
  deriveSuccessorRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '../services/tokenService';
import { isSessionIdleExpired } from '../utils/sessionPolicy';
import {
  canRecoverRefreshRotation,
  deriveRefreshSuccessorJti,
} from '../utils/refreshRotation';

type StoredSession = NonNullable<Awaited<ReturnType<typeof prisma.session.findUnique>>>;

async function issueForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { moduleAccess: true },
  });
  if (!user || !user.isActive) return null;
  const modules = await ensureDefaultModuleAccess(user.id, user.role);
  return { user, modules };
}

/**
 * A concurrent request already rotated this predecessor. If the deterministic
 * successor is still fresh (same browser, inside the recovery window), hand the
 * same successor cookie to this request instead of logging the user out.
 */
async function recoverRotatedSession(
  predecessor: StoredSession | null,
  predecessorRefreshToken: string,
  requestUserAgent: string | null,
  req: Request,
  res: Response,
  now: Date,
): Promise<boolean> {
  if (!predecessor || !predecessor.revokedAt) return false;

  const successorJti = deriveRefreshSuccessorJti(predecessor.refreshTokenHash, config.jwtSecret);
  const successor = await prisma.session.findUnique({ where: { jti: successorJti } });
  if (
    !successor ||
    !canRecoverRefreshRotation({
      predecessor,
      successor,
      expectedUserId: predecessor.userId,
      requestUserAgent,
      now,
    })
  ) {
    return false;
  }

  const successorRefreshToken = deriveSuccessorRefreshToken(predecessorRefreshToken);
  if (hashRefreshToken(successorRefreshToken) !== successor.refreshTokenHash) return false;

  const issued = await issueForUser(predecessor.userId);
  if (!issued) {
    await prisma.session.updateMany({
      where: { id: successor.id, revokedAt: null },
      data: { revokedAt: now },
    });
    clearRefreshTokenCookie(res);
    res.status(401).json({ message: 'User not found or inactive' });
    return true;
  }

  const accessToken = signAccessToken({
    sub: issued.user.id,
    email: issued.user.email,
    role: issued.user.role,
    modules: issued.modules,
    jti: successor.jti,
  });
  setRefreshTokenCookie(res, successorRefreshToken, successor.rememberMe);
  auditLog('authentication.refresh_success', {
    userId: issued.user.id,
    ...extractRequestInfo(req),
    details: { rotationRecovered: true },
  });
  res.json({ accessToken, modules: issued.modules });
  return true;
}

export async function refreshToken(req: Request, res: Response) {
  const predecessorRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (!predecessorRefreshToken || typeof predecessorRefreshToken !== 'string') {
    return res.status(401).json({ message: 'Refresh token missing' });
  }

  try {
    const requestUserAgent = req.get('user-agent') || null;
    const now = new Date();
    const predecessorHash = hashRefreshToken(predecessorRefreshToken);
    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: predecessorHash },
    });

    if (!session) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    if (session.revokedAt) {
      const recovered = await recoverRotatedSession(
        session,
        predecessorRefreshToken,
        requestUserAgent,
        req,
        res,
        now,
      );
      if (recovered) return;
      auditLog('authentication.refresh_failed', {
        userId: session.userId,
        ...extractRequestInfo(req),
        details: { reason: 'revoked_token_reused' },
      });
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    if (session.expiresAt <= now) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    if (isSessionIdleExpired(session.lastAccessedAt, session.rememberMe, now)) {
      await prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Session timed out due to inactivity' });
    }

    const issued = await issueForUser(session.userId);
    if (!issued) {
      await prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    const rotationAt = new Date();
    const jti = deriveRefreshSuccessorJti(predecessorHash, config.jwtSecret);
    const newRefreshToken = deriveSuccessorRefreshToken(predecessorRefreshToken);
    const accessToken = signAccessToken({
      sub: issued.user.id,
      email: issued.user.email,
      role: issued.user.role,
      modules: issued.modules,
      jti,
    });
    // Sliding lifetime: the rotated session keeps the original remember-me policy.
    const expiresAt = new Date(
      rotationAt.getTime() + (session.rememberMe ? 30 : 0.5) * 24 * 60 * 60 * 1000,
    );

    try {
      await prisma.$transaction(async (tx) => {
        const revoked = await tx.session.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: rotationAt, lastAccessedAt: rotationAt },
        });
        if (revoked.count !== 1) {
          throw new Error('Refresh token already used or revoked');
        }
        await tx.session.create({
          data: {
            userId: session.userId,
            refreshTokenHash: hashRefreshToken(newRefreshToken),
            jti,
            expiresAt,
            createdAt: rotationAt,
            lastAccessedAt: rotationAt,
            rememberMe: session.rememberMe,
            deviceName: session.deviceName,
            userAgent: session.userAgent,
            ipAddress: session.ipAddress,
          },
        });
      });
    } catch (rotationError) {
      // A competing request may have committed the same rotation first.
      const latestPredecessor = await prisma.session.findUnique({
        where: { refreshTokenHash: predecessorHash },
      });
      const recovered = await recoverRotatedSession(
        latestPredecessor,
        predecessorRefreshToken,
        requestUserAgent,
        req,
        res,
        new Date(),
      );
      if (recovered) return;
      throw rotationError;
    }

    setRefreshTokenCookie(res, newRefreshToken, session.rememberMe);
    auditLog('authentication.refresh_success', {
      userId: issued.user.id,
      ...extractRequestInfo(req),
      details: { rotationRecovered: false },
    });
    return res.json({ accessToken, modules: issued.modules });
  } catch (error: unknown) {
    logger.warn('Refresh token processing failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}
