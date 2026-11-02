import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../prismaClient';
import { signProCVDatabaseContextToken } from '../services/tokenService';

export interface IntrospectResponse {
  valid: boolean;
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
  dbContextToken?: string;
  reason?: string;
}

const SESSION_IDLE_TIMEOUT =
  (process.env.SESSION_IDLE_TIMEOUT_MINUTES
    ? Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES)
    : 30) * 60 * 1000;

export async function introspectToken(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  const token =
    authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : typeof req.body?.token === 'string'
        ? req.body.token
        : undefined;

  if (!token) {
    return res.status(400).json({ valid: false, reason: 'token_missing' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ['HS256'],
    }) as { sub: string; jti?: string };

    if (!payload.sub || !payload.jti) {
      return res.status(401).json({ valid: false, reason: 'token_invalid' });
    }

    const session = await prisma.session.findUnique({
      where: { jti: payload.jti },
    });

    if (!session || session.userId !== payload.sub) {
      return res.status(401).json({ valid: false, reason: 'session_not_found_or_mismatch' });
    }
    if (session.revokedAt) {
      return res.status(401).json({ valid: false, reason: 'session_revoked' });
    }

    const now = new Date();
    if (session.expiresAt <= now) {
      return res.status(401).json({ valid: false, reason: 'session_expired' });
    }
    if (now.getTime() - session.lastAccessedAt.getTime() > SESSION_IDLE_TIMEOUT) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });
      return res.status(401).json({ valid: false, reason: 'session_timed_out' });
    }

    // Never authorize from role/modules embedded in an access token. They may
    // be stale after an administrator changes a user's role or module grants.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        moduleAccess: {
          where: {
            active: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          select: { module: true },
        },
      },
    });

    if (!user || !user.isActive) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });
      return res.status(401).json({ valid: false, reason: 'user_inactive_or_missing' });
    }

    // Touch only a still-active session. If it was revoked or expired after
    // the initial read, do not mint a database assertion from stale state.
    const touched = await prisma.session.updateMany({
      where: {
        id: session.id,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { lastAccessedAt: now },
    });
    if (touched.count !== 1) {
      return res.status(401).json({ valid: false, reason: 'session_revoked_or_expired' });
    }

    return res.json({
      valid: true,
      userId: user.id,
      email: user.email,
      role: user.role,
      modules: user.moduleAccess.map(access => access.module),
      dbContextToken: signProCVDatabaseContextToken({
        sub: user.id,
        jti: session.jti,
        role: user.role,
        modules: user.moduleAccess.map(access => access.module),
      }),
    } as IntrospectResponse);
  } catch {
    return res.status(401).json({ valid: false, reason: 'token_invalid' });
  }
}
