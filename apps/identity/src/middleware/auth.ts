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

type TokenSessionPayload = { sub: string; jti?: string };

/**
 * Resolve the browser's current session from its HttpOnly refresh cookie.
 *
 * Different app origins cannot share in-memory access tokens. A refresh in one
 * app rotates the shared cookie, so another app may still present an access
 * token bound to the immediately previous session. When that happens, the
 * active cookie session is authoritative, but only for the same user and
 * browser user-agent. This keeps tabs/apps authenticated without weakening
 * explicit revocation of the current cookie session.
 */
async function resolveRequestSession(
  req: IdentityRequest,
  res: Response,
  accessPayload: TokenSessionPayload,
) {
  if (!accessPayload.sub || !accessPayload.jti) return null;

  const accessSession = await prisma.session.findUnique({
    where: { jti: accessPayload.jti },
  });

  if (!accessSession || accessSession.userId !== accessPayload.sub) {
    return null;
  }

  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  if (!refreshToken) {
    if (
      accessSession.revokedAt ||
      accessSession.expiresAt <= new Date()
    ) {
      return null;
    }
    return accessSession;
  }

  let refreshPayload: TokenSessionPayload;
  try {
    refreshPayload = jwt.verify(refreshToken, config.jwtSecret, {
      issuer: config.issuer,
      audience: config.audience,
    }) as TokenSessionPayload;
  } catch {
    clearRefreshTokenCookie(res);
    return null;
  }

  const cookieSession = await prisma.session.findUnique({
    where: { refreshToken },
  });
  const requestUserAgent = req.get('user-agent') || null;
  const now = new Date();

  const cookieIsCurrent =
    Boolean(cookieSession) &&
    refreshPayload.sub === accessPayload.sub &&
    Boolean(refreshPayload.jti) &&
    cookieSession!.userId === accessPayload.sub &&
    cookieSession!.jti === refreshPayload.jti &&
    cookieSession!.revokedAt === null &&
    cookieSession!.expiresAt > now &&
    Boolean(requestUserAgent) &&
    cookieSession!.userAgent === requestUserAgent &&
    // The access token must also have originated from this browser. This
    // permits a rotated predecessor but not a token copied from another UA.
    accessSession.userAgent === requestUserAgent;

  if (!cookieIsCurrent) {
    clearRefreshTokenCookie(res);
    return null;
  }

  return cookieSession;
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

    if (!payload.jti) {
      return res.status(401).json({ message: 'Session token missing' });
    }

    // Access tokens remain bound to a persisted session. When the refresh
    // cookie has rotated in another app, resolve the current session from
    // that cookie rather than clearing it because this tab has a stale jti.
    const session = await resolveRequestSession(req, res, payload);
    if (!session) {
      return res.status(401).json({ message: 'Session revoked or expired' });
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
      details: { sessionResolvedFromRefreshCookie: session.jti !== payload.jti },
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
