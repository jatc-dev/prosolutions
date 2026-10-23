import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../prismaClient';
import { REFRESH_TOKEN_COOKIE_NAME, clearRefreshTokenCookie } from '../utils/cookies';
import { auditLog, extractRequestInfo } from '../utils/auditLog';

const SESSION_IDLE_TIMEOUT =
  (process.env.SESSION_IDLE_TIMEOUT_MINUTES
    ? Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES)
    : 30) *
  60 *
  1000;

export interface IdentityRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
}

export async function identityMiddleware(
  req: IdentityRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.replace('Bearer ', '');

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

      if (!session || session.expiresAt < new Date() || session.userId !== payload.sub) {
        clearRefreshTokenCookie(res);
        return res.status(401).json({ message: 'Session expired or does not match the access token' });
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

    auditLog('authentication.token_validated', {
      userId: req.userId,
      ...extractRequestInfo(req),
    });

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireModules(requiredModules: string[]) {
  return (req: IdentityRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userModules = req.modules || [];
    const hasAccess = requiredModules.some((mod) => userModules.includes(mod));

    if (!hasAccess) {
      auditLog('authorization.module_access_denied', {
        userId: req.userId,
        requiredModules,
        userModules,
        ...extractRequestInfo(req),
      });
      return res.status(403).json({ message: 'Module access denied' });
    }

    next();
  };
}

export function requireRole(requiredRole: string) {
  return (req: IdentityRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.role !== requiredRole) {
      auditLog('authorization.unauthorized_access', {
        userId: req.userId,
        requiredRole,
        userRole: req.role,
        ...extractRequestInfo(req),
      });
      return res.status(403).json({ message: 'Insufficient role' });
    }

    next();
  };
}
