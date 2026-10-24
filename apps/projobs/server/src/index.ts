import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { proJobsAuthMiddleware } from './middleware/auth.js';
import applicationsRoutes from './routes/applications.js';
import savedJobsRoutes from './routes/saved-jobs.js';

const currentFile = fileURLToPath(import.meta.url);
const configuredOrigins = (process.env.PROJOBS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const productionOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : ['https://projobs.prosolutions.page', 'https://prosolutions.page'];

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: config.isProduction ? productionOrigins : true,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('tiny'));

  // Health check used by Render. It deliberately does not require a user token.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'projobs-api' });
  });

  // Identity module access check for frontend diagnostics.
  app.get('/api/identity/me', proJobsAuthMiddleware, (req: any, res) => {
    res.json({
      userId: req.userId,
      email: req.email,
      role: req.role,
      modules: req.modules,
      hasProJobsAccess: true,
    });
  });

  // Personal routes always revalidate current account/module access with ProIdentity.
  app.use('/api/applications', applicationsRoutes);
  app.use('/api/saved-jobs', savedJobsRoutes);

  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'API route not found' });
  });
  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  return app;
}

// The static site is deployed separately. This process only serves the API.
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  createApp().listen(config.port, '0.0.0.0', () => {
    console.log(`[projobs-api] Listening on port ${config.port}; identity=${config.identityUrl}`);
  });
}
