import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../prismaClient';
import { logger } from '../utils/logger';

export interface IntrospectResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
  reason?: string;
}

export async function introspectToken(req: Request, res: Response) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
  } else if (req.body?.token) {
    token = req.body.token as string;
  }

  if (!token) {
    return res.status(400).json({ valid: false, reason: 'token_missing' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: config.issuer,
      audience: config.audience,
    }) as {
      sub: string;
      email?: string;
      role?: string;
      modules?: string[];
      jti?: string;
      exp?: number;
    };

    if (!payload.sub || !payload.jti) {
      return res.status(401).json({
        valid: false,
        reason: 'token_invalid',
      } as IntrospectResponse);
    }

    const session = await prisma.session.findUnique({
      where: { jti: payload.jti },
    });

    if (!session) {
      return res.status(401).json({
        valid: false,
        reason: 'session_not_found',
      } as IntrospectResponse);
    }

    if (session.userId !== payload.sub) {
      logger.warn('Introspection: jti/sub mismatch', {
        jti: payload.jti,
        tokenSub: payload.sub,
        sessionUserId: session.userId,
      });
      return res.status(401).json({
        valid: false,
        reason: 'session_mismatch',
      } as IntrospectResponse);
    }

    if (session.revokedAt) {
      return res.status(401).json({
        valid: false,
        reason: 'session_revoked',
      } as IntrospectResponse);
    }

    if (session.expiresAt < new Date()) {
      return res.status(401).json({
        valid: false,
        reason: 'session_expired',
      } as IntrospectResponse);
    }

    const now = new Date();
    const idleMs = now.getTime() - session.lastAccessedAt.getTime();
    const SESSION_IDLE_TIMEOUT =
      (process.env.SESSION_IDLE_TIMEOUT_MINUTES
        ? Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES)
        : 30) *
      60 *
      1000;

    if (idleMs > SESSION_IDLE_TIMEOUT) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });
      return res.status(401).json({
        valid: false,
        reason: 'session_timed_out',
      } as IntrospectResponse);
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { lastAccessedAt: now },
    });

    return res.json({
      valid: true,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      modules: payload.modules,
    } as IntrospectResponse);
  } catch (error: unknown) {
    logger.warn('Introspection: token verification failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(401).json({
      valid: false,
      reason: 'token_invalid',
    } as IntrospectResponse);
  }
}
