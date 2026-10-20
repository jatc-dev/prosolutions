import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { apiLimiter } from './middleware/rateLimiter';
import {
  generateCSRFMid,
  validateCSRF,
  getCSRFToken,
} from './middleware/csrf';
import { config } from './config';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import moduleRoutes from './routes/modules';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://prosolutions.page',
  'https://procv-platform.onrender.com',
  'https://procv.prosolutions.page',
  'http://localhost:3000',
  'http://localhost:5173',
];

function parseAllowedOrigins(envValue: string[] | undefined): string[] {
  if (!envValue || envValue.length === 0) {
    return DEFAULT_ALLOWED_ORIGINS;
  }
  return envValue;
}

export function corsMiddleware(config: {
  isProduction: boolean;
  allowedOrigins: string[];
}) {
  const allowedOrigins = parseAllowedOrigins(config.allowedOrigins);

  return cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (e.g. mobile apps, curl, etc.)
      if (!origin) {
        return callback(null, true);
      }
      // In development, allow all origins; in production, restrict to allowed list
      if (!config.isProduction || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400, // 24 hours
  });
}

export function createApp() {
  const app = express();

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
  app.use(corsMiddleware(config));
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('tiny'));

  // Auth routes are mounted BEFORE CSRF middleware so that login/register
  // and other public auth endpoints do not require a CSRF token.
  app.use('/api/auth', authRoutes);

  app.use(generateCSRFMid);
  app.get('/api/csrf-token', getCSRFToken);
  app.use(validateCSRF);

  app.get('/', (_req, res) =>
    res.json({ status: 'ok', service: 'proidentity' }),
  );
  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', service: 'proidentity', timestamp: new Date().toISOString() }),
  );

  app.use('/api/profile', profileRoutes);
  app.use('/api/modules', moduleRoutes);

  app.use(apiLimiter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Resource not found' });
  });

  return app;
}
