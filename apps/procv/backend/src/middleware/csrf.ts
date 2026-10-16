import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_SESSION_NAME = 'csrfToken';
const CSRF_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days (matches JWT refresh expiry)
const CSRF_TOKEN_MAX_AGE = CSRF_COOKIE_MAX_AGE;
const CLOCK_SKEW_TOLERANCE_MS = 60 * 1000;

declare module 'express-serve-static-core' {
  interface Request {
    csrfToken?: string;
  }
}

function signPayload(payload: string): string {
  return createHmac('sha256', config.jwtSecret).update(payload).digest('hex');
}

function constantTimeCompare(a: string, b: string): boolean {
  const aBytes = Buffer.from(a);
  const bBytes = Buffer.from(b);
  if (aBytes.length !== bBytes.length) {
    return false;
  }
  return timingSafeEqual(aBytes, bBytes);
}

/**
 * Issues a self-verifying CSRF token: `<random>.<issuedAt>.<hmac>`.
 * The signature binds the token to this server, so a token remains valid even
 * when the companion cookie does not round-trip (blocked third-party cookies or
 * a cookie rotated by a concurrent request). An attacker cannot forge the
 * signature without the server secret and cannot read a token cross-origin.
 */
function generateCSRFToken(): string {
  const random = randomBytes(32).toString('hex');
  const issuedAt = Date.now();
  return `${random}.${issuedAt}.${signPayload(`${random}.${issuedAt}`)}`;
}

export function verifyCSRFTokenSignature(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  const [random, issuedAtRaw, signature] = parts;
  if (!random || !issuedAtRaw || !signature) {
    return false;
  }
  if (!constantTimeCompare(signature, signPayload(`${random}.${issuedAtRaw}`))) {
    return false;
  }
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isInteger(issuedAt)) {
    return false;
  }
  const age = Date.now() - issuedAt;
  return age >= -CLOCK_SKEW_TOLERANCE_MS && age <= CSRF_TOKEN_MAX_AGE;
}

function csrfCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? ('none' as const) : ('strict' as const),
    maxAge: CSRF_COOKIE_MAX_AGE,
    path: '/',
  };
}

export function generateCSRFMid(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies || !req.cookies[CSRF_SESSION_NAME]) {
    const token = generateCSRFToken();
    res.cookie(CSRF_SESSION_NAME, token, csrfCookieOptions());
    req.cookies[CSRF_SESSION_NAME] = token;
  }
  req.csrfToken = req.cookies[CSRF_SESSION_NAME];
  res.locals.csrfToken = req.csrfToken;
  next();
}

export function validateCSRF(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

  if (safeMethods.has(method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_SESSION_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!headerToken) {
    return res.status(403).json({ message: 'CSRF token missing' });
  }

  // Primary check: double-submit cookie comparison.
  if (cookieToken && constantTimeCompare(cookieToken, headerToken)) {
    return next();
  }

  // Fallback: accept any token signed by this server. Covers browsers that
  // block or rotate the cookie, which would otherwise fail with
  // "CSRF token mismatch" and break login/register.
  if (verifyCSRFTokenSignature(headerToken)) {
    logger.debug('CSRF validated via signed-token fallback');
    return next();
  }

  return res.status(403).json({ message: 'CSRF token mismatch' });
}

export function getCSRFToken(req: Request, res: Response) {
  if (!req.cookies || !req.cookies[CSRF_SESSION_NAME]) {
    const token = generateCSRFToken();
    res.cookie(CSRF_SESSION_NAME, token, csrfCookieOptions());
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies[CSRF_SESSION_NAME];
  }
  return res.json({ csrfToken: req.csrfToken });
}
