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

export const refreshLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: isDevelopment ? 100 : 10,
  message: 'Demasiados intentos de renovación de token. Intenta de nuevo en 1 hora.',
  skipSuccessful: true,
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
