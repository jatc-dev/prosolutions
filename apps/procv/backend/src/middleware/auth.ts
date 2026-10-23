import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
}

export interface IdentityAccessClaims {
  sub: string;
  email?: string;
  role?: string;
  modules?: string[];
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
}

/**
 * Every product validates the same ProIdentity token contract. The audience
 * identifies the shared ProSolutions API; module access is enforced separately
 * by the signed modules claim.
 */
export function verifyIdentityAccessToken(token: string): IdentityAccessClaims {
  return jwt.verify(token, config.jwtSecret, {
    issuer: config.identityIssuer,
    audience: config.identityAudience,
  }) as IdentityAccessClaims;
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  let claims: IdentityAccessClaims;
  try {
    claims = verifyIdentityAccessToken(authHeader.slice(7));
  } catch {
    return res.status(401).json({ message: 'Invalid or expired ProIdentity token' });
  }

  if (!claims.sub) {
    return res.status(401).json({ message: 'Token subject missing' });
  }

  if (!Array.isArray(claims.modules) || !claims.modules.includes('PROCV')) {
    return res.status(403).json({
      message: 'ProCV module access required',
      requiredModule: 'PROCV',
    });
  }

  try {
    // A minimal local identity reference preserves referential integrity for
    // CV ownership. It contains no credentials, roles, sessions, or tokens.
    await prisma.identityAccount.upsert({
      where: { id: claims.sub },
      update: {},
      create: { id: claims.sub },
    });
  } catch (error) {
    logger.error('Failed to synchronize ProIdentity account reference', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(503).json({ message: 'Identity account is not ready in ProCV' });
  }

  req.userId = claims.sub;
  req.email = claims.email;
  req.role = claims.role;
  req.modules = claims.modules;
  return next();
}
