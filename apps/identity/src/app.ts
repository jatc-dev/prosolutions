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
  app.use(
    cors({
      origin: config.isProduction ? config.frontendUrl : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('tiny'));

  app.use(generateCSRFMid);
  app.get('/api/csrf-token', getCSRFToken);
  app.use(validateCSRF);

  app.get('/', (_req, res) =>
    res.json({ status: 'ok', service: 'prosolutions-identity' }),
  );
  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', service: 'prosolutions-identity', timestamp: new Date().toISOString() }),
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/modules', moduleRoutes);

  app.use(apiLimiter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Resource not found' });
  });

  return app;
}
