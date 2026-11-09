import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
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
import { signAccessToken, verifyRefreshToken } from '../services/tokenService';
import {
  canRecoverRefreshRotation,
  deriveRefreshSuccessorJti,
} from '../utils/refreshRotation';

type RefreshPayload = { sub: string; jti: string };

async function recoverRotatedSession(
  predecessor: Awaited<ReturnType<typeof prisma.session.findUnique>>,
  payload: RefreshPayload,
  requestUserAgent: string | null,
  req: Request,
  res: Response,
  now: Date,
): Promise<boolean> {
  if (
    !predecessor ||
    predecessor.userId !== payload.sub ||
    predecessor.jti !== payload.jti ||
    !predecessor.revokedAt
  ) {
    return false;
  }

  const successorJti = deriveRefreshSuccessorJti(
    req.cookies[REFRESH_TOKEN_COOKIE_NAME],
    config.jwtSecret,
  );
  const successor = await prisma.session.findUnique({
    where: { jti: successorJti },
  });

  if (
    !successor ||
    !canRecoverRefreshRotation({
      predecessor,
      successor,
      expectedUserId: payload.sub,
      requestUserAgent,
      now,
    })
  ) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { moduleAccess: true },
  });

  if (!user || !user.isActive) {
    await prisma.session.updateMany({
      where: { id: successor.id, revokedAt: null },
      data: { revokedAt: now },
    });
    clearRefreshTokenCookie(res);
    res.status(401).json({ message: 'User not found or inactive' });
    return true;
  }

  const modules = await ensureDefaultModuleAccess(user.id, user.role);
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    modules,
    jti: successor.jti,
  });

  setRefreshTokenCookie(res, successor.refreshToken, successor.rememberMe);
  auditLog('authentication.refresh_success', {
    userId: user.id,
    ...extractRequestInfo(req),
    details: { rotationRecovered: true },
  });
  return Boolean(res.json({ accessToken, modules }));
}

export async function refreshToken(req: Request, res: Response) {
  const predecessorRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

  if (!predecessorRefreshToken) {
    return res.status(401).json({ message: 'Refresh token missing' });
  }

  try {
    const payload = verifyRefreshToken(predecessorRefreshToken) as RefreshPayload;
    const requestUserAgent = req.get('user-agent') || null;
    const now = new Date();
    const session = await prisma.session.findUnique({
      where: { refreshToken: predecessorRefreshToken },
    });

    if (!session) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    if (session.revokedAt) {
      const recovered = await recoverRotatedSession(
        session,
        payload,
        requestUserAgent,
        req,
        res,
        now,
      );
      if (recovered) return;
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    if (
      session.userId !== payload.sub ||
      session.jti !== payload.jti ||
      session.expiresAt <= now
    ) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const { isSessionIdleExpired } = await import('../utils/sessionPolicy');
    if (isSessionIdleExpired(session.lastAccessedAt, session.rememberMe, now)) {
      await prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Session timed out due to inactivity' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { moduleAccess: true },
    });
    if (!user || !user.isActive) {
      await prisma.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: now },
      });
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    const modules = await ensureDefaultModuleAccess(user.id, user.role);
    const rotationAt = new Date();
    const jti = deriveRefreshSuccessorJti(
      predecessorRefreshToken,
      config.jwtSecret,
    );
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      modules,
      jti,
    });
    const newRefreshToken = jwt.sign(
      { sub: user.id, jti },
      config.jwtSecret,
      {
        issuer: config.issuer,
        audience: config.audience,
        expiresIn: session.rememberMe ? '30d' : '12h',
      } as jwt.SignOptions,
    );
    const expiresAt = new Date(
      rotationAt.getTime() +
        (session.rememberMe ? 30 : 0.5) * 24 * 60 * 60 * 1000,
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
            refreshToken: newRefreshToken,
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
        where: { refreshToken: predecessorRefreshToken },
      });
      const recovered = await recoverRotatedSession(
        latestPredecessor,
        payload,
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
      userId: user.id,
      ...extractRequestInfo(req),
      details: { rotationRecovered: false },
    });
    return res.json({ accessToken, modules });
  } catch (error: unknown) {
    logger.warn('Refresh token processing failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
}
