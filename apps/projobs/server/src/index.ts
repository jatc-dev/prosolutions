import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { proJobsAuthMiddleware } from './middleware/auth.js';
import applicationsRoutes from './routes/applications.js';
import savedJobsRoutes from './routes/saved-jobs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '../../');
const distDir = path.join(root, 'dist');
const publicDir = path.join(root, 'dist');

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: config.isProduction ? config.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('tiny'));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'projobs-server' });
  });

  // Identity module access check (for frontend to verify PROJOBS claim)
  app.get(
    '/api/identity/me',
    proJobsAuthMiddleware,
    (_req: any, res) => {
      res.json({
        userId: _req.userId,
        email: _req.email,
        role: _req.role,
        modules: _req.modules,
        hasProJobsAccess: true,
      });
    },
  );

  // Protected personal routes
  app.use('/api/applications', applicationsRoutes);
  app.use('/api/saved-jobs', savedJobsRoutes);

  // Serve static files (the generated ProJobs site)
  app.use(express.static(publicDir));

  // SPA fallback: serve index.html for non-API routes
  app.use((_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return app;
}
