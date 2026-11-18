import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_SESSION_NAME = `csrfToken${config.cookieNameSuffix}`;
const CSRF_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;
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
  return age >= -CLOCK_SKEW_TOLERANCE_MS && age <= CSRF_COOKIE_MAX_AGE;
}

function csrfCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    domain: config.cookieDomain,
    maxAge: CSRF_COOKIE_MAX_AGE,
    path: '/',
  };
}

function ensureCsrfToken(req: Request, res: Response): string {
  const existing = req.cookies?.[CSRF_SESSION_NAME];
  if (existing) {
    req.csrfToken = existing;
    res.locals.csrfToken = existing;
    return existing;
  }

  const token = generateCSRFToken();
  res.cookie(CSRF_SESSION_NAME, token, csrfCookieOptions());
  if (!req.cookies) {
    req.cookies = {};
  }
  req.cookies[CSRF_SESSION_NAME] = token;
  req.csrfToken = token;
  res.locals.csrfToken = token;
  return token;
}

export function generateCSRFMid(req: Request, res: Response, next: NextFunction) {
  ensureCsrfToken(req, res);
  next();
}

export function validateCSRF(req: Request, res: Response, next: NextFunction) {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_SESSION_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!headerToken) {
    return res.status(403).json({ message: 'CSRF token missing' });
  }

  if (cookieToken && constantTimeCompare(cookieToken, headerToken)) {
    return next();
  }

  if (verifyCSRFTokenSignature(headerToken)) {
    logger.debug('CSRF validated via signed-token fallback');
    return next();
  }

  return res.status(403).json({ message: 'CSRF token mismatch' });
}

export function getCSRFToken(req: Request, res: Response) {
  const token = ensureCsrfToken(req, res);
  return res.json({ csrfToken: token });
}
