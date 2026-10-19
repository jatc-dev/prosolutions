import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../prismaClient';
import { REFRESH_TOKEN_COOKIE_NAME, clearRefreshTokenCookie } from '../utils/cookies';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
}

const SESSION_IDLE_TIMEOUT =
  (process.env.SESSION_IDLE_TIMEOUT_MINUTES
    ? Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES)
    : 30) *
  60 *
  1000;

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      issuer: config.identityUrl,
      audience: 'procv-api',
    }) as {
      sub: string;
      email?: string;
      role?: string;
      modules?: string[];
    };

    req.userId = payload.sub;
    req.email = payload.email;
    req.role = payload.role;
    req.modules = payload.modules;

    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    if (refreshToken) {
      const session = await prisma.session.findUnique({
        where: { refreshToken },
      });

      if (!session || session.expiresAt < new Date()) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({ message: 'Session expired' });
      }

      if (session.revokedAt) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({ message: 'Session revoked' });
      }

      const now = new Date();
      const idleMs = now.getTime() - session.lastAccessedAt.getTime();

      if (idleMs > SESSION_IDLE_TIMEOUT) {
        await prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
        clearRefreshTokenCookie(res);
        return res.status(401).json({ message: 'Session timed out due to inactivity' });
      }

      await prisma.session.update({
        where: { id: session.id },
        data: { lastAccessedAt: new Date() },
      });
    }

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
