import type { Request } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { REFRESH_TOKEN_COOKIE_NAME } from '../utils/cookies';
import { logger } from '../utils/logger';

const isDevelopment = process.env.NODE_ENV !== 'production';
const DISABLE_RATE_LIMIT = process.env.DISABLE_RATE_LIMIT === 'true';

function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessful?: boolean;
  /** Requests for which the limiter must not count at all. */
  skip?: (req: Request) => boolean;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    max: DISABLE_RATE_LIMIT ? 10000 : options.max,
    message: { message: options.message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessful,
    skip: DISABLE_RATE_LIMIT ? () => true : options.skip,
    handler: (req, res) => {
      const resetHeader = res.getHeader('RateLimit-Reset');
      const parsedReset = Number(resetHeader);
      const retryAfterSeconds =
        Number.isFinite(parsedReset) && parsedReset > 0
          ? parsedReset
          : Math.ceil(options.windowMs / 1000);

      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('user-agent')?.substring(0, 100),
        retryAfterSeconds,
      });
      res.status(429).json({
        message: options.message,
        retryAfterSeconds,
      });
    },
  });
}

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100 : 10,
  message: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.',
  skipSuccessful: true,
});

/**
 * Anonymous visitors call /refresh on every page load of every module and get
 * a cheap 401 (no cookie). Those requests cannot be used to guess tokens, so
 * they must not consume the budget: otherwise anonymous browsing (or several
 * people behind one NAT IP) exhausts it and blocks the next real session.
 */
export function hasRefreshCookie(req: Pick<Request, 'cookies'>): boolean {
  const value = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0;
}

export const refreshLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  // Only failed refreshes that carry a cookie count (successes are skipped).
  max: isDevelopment ? 300 : 60,
  message: 'Demasiados intentos de renovación de token. Intenta de nuevo en 1 hora.',
  skipSuccessful: true,
  skip: (req) => !hasRefreshCookie(req),
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  message: 'Demasiadas solicitudes a la API. Intenta de nuevo en 1 hora.',
});

export const verificationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100 : 5,
  message: 'Too many verification requests. Please try again in 15 minutes.',
  skipSuccessful: true,
});

export const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 50 : 3,
  message: 'Too many password reset requests. Please try again in 15 minutes.',
  skipSuccessful: true,
});

export const introspectLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  message: 'Demasiadas solicitudes de introspección. Intenta de nuevo en 1 hora.',
});
