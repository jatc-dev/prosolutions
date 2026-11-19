import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import prisma from '../prismaClient';
import { logger } from '../utils/logger';
import { acceptsLegacyHs256, getSigningKeySet } from './signingKeys';

/** Value of the `token_use` claim carried by every access token. */
export const ACCESS_TOKEN_USE = 'access';

export interface IdentityTokenPayload {
  sub: string;
  email?: string;
  role?: string;
  modules?: string[];
  token_use?: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TOKEN_PREFIX = 'rt_';

export function signAccessToken(payload: {
  sub: string;
  email?: string;
  role?: string;
  modules?: string[];
  jti: string;
}): string {
  const claims = {
    sub: payload.sub,
    email: payload.email,
    role: payload.role,
    modules: payload.modules,
    jti: payload.jti,
    token_use: ACCESS_TOKEN_USE,
  };
  const options: jwt.SignOptions = {
    issuer: config.issuer,
    audience: config.audience,
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  };
  const keySet = getSigningKeySet();
  if (keySet.algorithm === 'ES256' && keySet.privateKey) {
    return jwt.sign(claims, keySet.privateKey, { ...options, algorithm: 'ES256', keyid: keySet.kid ?? undefined });
  }
  return jwt.sign(claims, config.jwtSecret, { ...options, algorithm: 'HS256' });
}

/**
 * Verify an access token. Rejects anything that is not explicitly an access
 * token (`token_use: "access"`), so refresh tokens or other JWTs signed by
 * this service can never be replayed as bearer credentials.
 */
export function verifyAccessToken(token: string): IdentityTokenPayload {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string' || typeof decoded.payload === 'string') {
    throw new Error('Malformed token');
  }
  const keySet = getSigningKeySet();
  const verifyOptions = { issuer: config.issuer, audience: config.audience };
  let payload: IdentityTokenPayload;

  if (decoded.header.alg === 'ES256') {
    const key = decoded.header.kid ? keySet.publicKeys.get(decoded.header.kid) : undefined;
    if (!key) throw new Error('Unknown signing key');
    payload = jwt.verify(token, key, { ...verifyOptions, algorithms: ['ES256'] }) as IdentityTokenPayload;
  } else if (decoded.header.alg === 'HS256' && acceptsLegacyHs256(keySet)) {
    payload = jwt.verify(token, config.jwtSecret, { ...verifyOptions, algorithms: ['HS256'] }) as IdentityTokenPayload;
  } else {
    throw new Error('Unsupported token algorithm');
  }

  if (payload.token_use !== ACCESS_TOKEN_USE) {
    throw new Error('Token is not an access token');
  }
  return payload;
}

/** Refresh tokens are opaque random strings; only their SHA-256 is stored. */
export function generateRefreshToken(): string {
  return REFRESH_TOKEN_PREFIX + crypto.randomBytes(32).toString('base64url');
}

export function hashRefreshToken(refreshToken: string): string {
  return crypto.createHash('sha256').update(refreshToken, 'utf8').digest('hex');
}

/**
 * Deterministic successor of a refresh token. Concurrent refreshes of the same
 * predecessor (several tabs/apps) must converge on one successor cookie, and
 * the server can recompute it without ever storing a token in plaintext.
 */
export function deriveSuccessorRefreshToken(predecessorRefreshToken: string, secret = config.jwtSecret): string {
  const mac = crypto
    .createHmac('sha256', secret)
    .update(`prosolutions-refresh-successor-token:${predecessorRefreshToken}`)
    .digest('base64url');
  return REFRESH_TOKEN_PREFIX + mac;
}

export async function findSessionByRefreshToken(refreshToken: string) {
  return prisma.session.findUnique({ where: { refreshTokenHash: hashRefreshToken(refreshToken) } });
}

export async function createTokenPair(user: {
  id: string;
  email: string;
  role: string;
  modules?: string[];
}, options: { rememberMe?: boolean; deviceName?: string | null; userAgent?: string | null; ipAddress?: string | null } = {}): Promise<TokenPair> {
  const rememberMe = options.rememberMe === true;
  const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 0.5) * 24 * 60 * 60 * 1000);
  const jti = crypto.randomUUID();
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    modules: user.modules,
    jti,
  });

  const refreshToken = generateRefreshToken();

  try {
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashRefreshToken(refreshToken),
        jti,
        expiresAt,
        lastAccessedAt: new Date(),
        rememberMe,
        deviceName: options.deviceName || null,
        userAgent: options.userAgent || null,
        ipAddress: options.ipAddress || null,
      },
    });
  } catch (error: unknown) {
    const prismaError = error as { code?: string; meta?: unknown; name?: string };
    logger.error('Failed to persist session during token pair creation', {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
      errorName: prismaError.name,
      errorCode: prismaError.code,
      errorMeta: prismaError.meta,
    });
    throw error;
  }

  return { accessToken, refreshToken };
}

export async function revokeSession(refreshToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshTokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function deleteAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * Revoked rows are only needed for the 10 s concurrent-rotation recovery
 * window; every refresh revokes its predecessor, so keep them briefly.
 */
export const REVOKED_SESSION_RETENTION_MS = 60 * 60 * 1000;

/**
 * Delete sessions that can no longer be used: expired, or revoked more than
 * REVOKED_SESSION_RETENTION_MS ago. Returns the number of deleted rows.
 */
export async function purgeStaleSessions(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - REVOKED_SESSION_RETENTION_MS);
  const result = await prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { revokedAt: { lt: cutoff } },
      ],
    },
  });
  return result.count;
}
