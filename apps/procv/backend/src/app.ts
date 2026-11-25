import 'dotenv/config';
import internalRoutes from './routes/internal';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { apiLimiter, cvLimiter, adminLimiter } from './middleware/rateLimiter';
import { generateCSRFMid, validateCSRF, getCSRFToken } from './middleware/csrf';
import { errorHandler } from './middleware/errorHandler';
import { monitorRequests, healthCheck } from './utils/monitoring';
import { config } from './config';
import cvRoutes from './routes/cv';
import meRoutes from './routes/me';
import aiRoutes from './routes/ai';
import adminRoutes from './routes/admin';
import { withPublicContext } from './dbContext';
import { logger } from './utils/logger';

function normalizePublicLang(input?: string): 'en' | 'es' {
  const normalized = (input || 'en').toLowerCase().split('-')[0];
  return normalized === 'es' ? 'es' : 'en';
}

function sanitizeLandingFeatures(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const features = value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const id = String(candidate.id ?? index + 1);
      const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
      const description =
        typeof candidate.description === 'string' ? candidate.description.trim() : '';

      if (!title || !description) {
        return null;
      }

      return { id, title, description };
    })
    .filter((feature): feature is { id: string; title: string; description: string } =>
      Boolean(feature),
    );

  return features;
}

export function createApp() {
  const app = express();

  // Monitoring middleware - should be early to capture all requests
  app.use(monitorRequests());

  // Render routes traffic through one load balancer hop that sets
  // X-Forwarded-For. Trusting exactly that hop makes req.ip the real client
  // IP (required for rate limiting to be per-user, not global) and stops the
  // express-rate-limit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR validation error.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const allowedCorsOrigins = new Set([config.frontendUrl, ...configuredCorsOrigins]);

  app.use(
    cors({
      origin: config.isProduction
        ? (origin, callback) => {
            // Allow server-to-server requests and exact configured first-party origins only.
            if (!origin || allowedCorsOrigins.has(origin)) {
              callback(null, true);
              return;
            }
            callback(null, false);
          }
        : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('tiny'));

  // Service-to-service API (ProIdentity): bearer service token, no browser CSRF.
  app.use('/api/internal', internalRoutes);

  app.use(generateCSRFMid);
  app.get('/api/csrf-token', getCSRFToken);
  app.use(validateCSRF);

  // Serve static files from uploads directory
  app.use(
    '/uploads',
    express.static(path.join(__dirname, '../uploads'), {
      maxAge: '1d',
    }),
  );

  app.get('/', (req, res) => res.json({ status: 'ok', message: 'ProCV Platform API' }));
  app.get('/health', healthCheck); // Health check endpoint

  // Public endpoint for landing page features
  app.get('/api/public/landing-features', async (req, res) => {
    try {
      const lang = normalizePublicLang(req.query.lang as string | undefined);
      const featuresKey = `landing_features_${lang}`;

      // Get saved features from settings
      const setting = await withPublicContext(tx =>
        tx.platformSetting.findFirst({ where: { key: featuresKey, isPublic: true } }),
      );

      if (setting && setting.isPublic) {
        const parsed = JSON.parse(setting.value);
        res.json(sanitizeLandingFeatures(parsed));
      } else {
        res.json([]);
      }
    } catch (error) {
      logger.warn('Landing features empty response due to error', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.json([]);
    }
  });

  app.use('/api/admin', adminLimiter, adminRoutes);
  app.use('/api/cvs', cvLimiter, cvRoutes);
  app.use('/api/me', cvLimiter, meRoutes);
  app.use('/api/ai', aiRoutes);
  app.use(apiLimiter); // General API limiter for all remaining routes

  // JSON 404 for unmatched API routes (never leak the HTML fallback).
  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Resource not found' });
  });

  app.use(errorHandler);

  return app;
}
