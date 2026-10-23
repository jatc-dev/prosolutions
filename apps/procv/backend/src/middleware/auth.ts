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

const IDENTITY_REFERENCE_TTL_MS = 5 * 60 * 1000;
const MAX_IDENTITY_REFERENCE_CACHE_ENTRIES = 10_000;
const identityReferenceCache = new Map<string, number>();

async function ensureIdentityReference(identityId: string): Promise<void> {
  const now = Date.now();
  const lastValidatedAt = identityReferenceCache.get(identityId);
  if (lastValidatedAt && now - lastValidatedAt < IDENTITY_REFERENCE_TTL_MS) {
    // Refresh insertion order so the bounded cache behaves like a small LRU.
    identityReferenceCache.delete(identityId);
    identityReferenceCache.set(identityId, now);
    return;
  }

  await prisma.identityAccount.upsert({
    where: { id: identityId },
    update: {},
    create: { id: identityId },
  });
  identityReferenceCache.delete(identityId);
  identityReferenceCache.set(identityId, now);

  while (identityReferenceCache.size > MAX_IDENTITY_REFERENCE_CACHE_ENTRIES) {
    const oldest = identityReferenceCache.keys().next().value;
    if (oldest === undefined) break;
    identityReferenceCache.delete(oldest);
  }
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
    // Create/verify the non-secret local subject reference lazily. A bounded
    // five-minute cache avoids a database write on every protected API call.
    await ensureIdentityReference(claims.sub);
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
