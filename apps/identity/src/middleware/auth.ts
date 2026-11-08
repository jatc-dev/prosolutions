import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../prismaClient';
import { REFRESH_TOKEN_COOKIE_NAME, clearRefreshTokenCookie } from '../utils/cookies';
import { auditLog, extractRequestInfo } from '../utils/auditLog';
import { isSessionIdleExpired } from '../utils/sessionPolicy';

export interface IdentityRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
  sessionId?: string;
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

    // Access tokens are bound to the persisted session via the same jti as the
    // refresh token. Reject legacy/unbound JWTs rather than allowing them to
    // bypass logout and session revocation.
    if (!payload.jti) {
      return res.status(401).json({ message: 'Session token missing' });
    }

    const session = await prisma.session.findUnique({
      where: { jti: payload.jti },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.expiresAt <= new Date() ||
      session.revokedAt
    ) {
      if (req.cookies?.[REFRESH_TOKEN_COOKIE_NAME]) {
        clearRefreshTokenCookie(res);
      }
      return res.status(401).json({ message: 'Session revoked or expired' });
    }

    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
    if (refreshToken && refreshToken !== session.refreshToken) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Session mismatch' });
    }

    const now = new Date();
    if (isSessionIdleExpired(session.lastAccessedAt, session.rememberMe, now)) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: now },
      });
      clearRefreshTokenCookie(res);
      return res.status(401).json({ message: 'Session timed out due to inactivity' });
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { lastAccessedAt: now },
    });

    req.userId = payload.sub;
    req.sessionId = session.id;
    req.email = payload.email;
    req.role = payload.role;
    req.modules = payload.modules;

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
