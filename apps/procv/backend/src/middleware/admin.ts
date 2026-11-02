import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

interface IdentityAdminClaims {
  sub: string;
}

interface IntrospectionResult {
  valid: boolean;
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
}

const INTROSPECTION_TIMEOUT_MS = Number(process.env.INTROSPECTION_TIMEOUT_MS) || 5000;

async function introspectCurrentIdentity(token: string): Promise<IntrospectionResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INTROSPECTION_TIMEOUT_MS);
  try {
    const response = await fetch(`${config.identityUrl}/api/auth/introspect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || typeof (body as IntrospectionResult).valid !== 'boolean') {
      return null;
    }
    return body as IntrospectionResult;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: config.issuer,
      audience: 'prosolutions-api',
    }) as IdentityAdminClaims;

    if (!decoded.sub) {
      return res.status(401).json({ message: 'Invalid identity subject' });
    }

    // The signed access token is only proof of identity. Authorization uses
    // ProIdentity's live database state so role downgrades and module revokes
    // take effect immediately instead of waiting for JWT expiry.
    const identity = await introspectCurrentIdentity(token);
    if (!identity?.valid || identity.userId !== decoded.sub) {
      return res.status(401).json({ message: 'Session revoked, expired, or unavailable' });
    }
    if (!Array.isArray(identity.modules) || !identity.modules.includes('PROCV')) {
      return res.status(403).json({ message: 'ProCV module access required' });
    }
    if (identity.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    (req as any).user = {
      id: identity.userId,
      email: identity.email ?? '',
      role: identity.role,
    };
    return next();
  } catch (error) {
    logger.warn('Identity admin token rejected', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}
