import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { logger } from '../utils/logger';

const isDevelopment = process.env.NODE_ENV !== 'production';
const DISABLE_RATE_LIMIT = process.env.DISABLE_RATE_LIMIT === 'true';

function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessful?: boolean;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    max: DISABLE_RATE_LIMIT ? 10000 : options.max,
    message: { message: options.message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessful,
    skip: DISABLE_RATE_LIMIT ? () => true : undefined,
    handler: (req, res) => {
      // Draft-7 headers are already set at this point: report the real
      // remaining wait instead of the full window.
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

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  message: 'Demasiadas solicitudes a la API. Intenta de nuevo en 1 hora.',
});

export const cvLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: isDevelopment ? 500 : 60,
  message: 'Demasiadas operaciones en CVs. Intenta de nuevo en 1 hora.',
});

export const publicImportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: isDevelopment ? 100 : 20,
  message: 'Demasiadas importaciones. Intenta de nuevo en 1 hora.',
});

export const adminLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: isDevelopment ? 500 : 100,
  message: 'Too many admin requests. Please try again in 1 hour.',
});
