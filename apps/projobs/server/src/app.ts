import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { asyncHandler, errorHandler, notFoundHandler } from './http/errors.js';
import { candidateRouter } from './routes/candidate.js';
import type { AppDeps } from './routes/context.js';
import { employerRouter } from './routes/employer.js';
import { internalRouter } from './routes/internal.js';
import { publicRouter } from './routes/public.js';

export function createApp(deps: AppDeps): Express {
  const { config, db, log } = deps;
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Server-to-server calls carry no Origin; browsers must be first-party.
        if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
        callback(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '200kb' }));

  app.get(
    '/health',
    asyncHandler(async (_req, res) => {
      try {
        await db.query('SELECT 1');
        res.json({ status: 'OK', service: 'projobs-api', version: 2, database: 'CONNECTED' });
      } catch {
        res.status(503).json({ status: 'DEGRADED', service: 'projobs-api', version: 2, database: 'UNAVAILABLE' });
      }
    }),
  );

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: config.env === 'test' ? 10_000 : 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: { code: 'rate_limited', message: 'Too many requests' } },
    }),
  );
  app.use('/api', publicRouter(deps));
  app.use('/api', candidateRouter(deps));
  app.use('/api/employer', employerRouter(deps));
  app.use('/internal', internalRouter(deps));

  app.use(notFoundHandler);
  app.use(errorHandler(log));
  return app;
}
