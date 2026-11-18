import { createApp } from './app.js';
import { createIdentityVerifier } from './auth/identity.js';
import { createJwksKeyStore } from './auth/jwks.js';
import { loadConfig } from './config.js';
import type { Database } from './db/database.js';
import { createPgDatabase } from './db/pg.js';
import { createProCvClient } from './integrations/procv.js';
import type { Logger } from './routes/context.js';

if (process.env.NODE_ENV !== 'production') {
  await import('dotenv/config');
}

const log: Logger = (message, meta) => {
  console.log(JSON.stringify({ level: 'info', service: 'projobs-api', message, ...meta, time: new Date().toISOString() }));
};

const config = loadConfig();

async function openDatabase(): Promise<Database> {
  if (config.databaseUrl) {
    return createPgDatabase({
      connectionString: config.databaseUrl,
      runtimeRole: config.runtimeRole,
      poolMax: config.poolMax,
      onError: (error) => log('database pool error', { error: error.message }),
    });
  }
  // Local development without credentials: in-memory Postgres with demo data.
  const { createPgliteDatabase } = await import('./db/pglite.js');
  const { runMigrations } = await import('./db/migrate.js');
  const { seedDemoData } = await import('./db/seed.js');
  const db = await createPgliteDatabase(null);
  await runMigrations(db);
  await seedDemoData(db);
  log('using in-memory PGlite database with demo data (DATABASE_URL not set)');
  return db;
}

const db = await openDatabase();
const keyStore = config.jwt.jwksUrl ? createJwksKeyStore({ url: config.jwt.jwksUrl, log }) : null;
if (keyStore) {
  await keyStore.refresh();
  log('identity jwks loaded', { keys: keyStore.size });
  setInterval(() => void keyStore.refresh(), 10 * 60 * 1000).unref();
}
const app = createApp({
  config,
  db,
  log,
  verify: createIdentityVerifier({ ...config.jwt, keyStore }),
  procv: createProCvClient({ baseUrl: config.procvApiUrl, timeoutMs: config.procvTimeoutMs }),
});

const server = app.listen(config.port, () => log('listening', { port: config.port, env: config.env }));

const shutdown = (signal: string) => {
  log('shutting down', { signal });
  server.close(() => {
    db.close().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
