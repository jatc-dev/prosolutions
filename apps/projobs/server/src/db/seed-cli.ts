/**
 * Load the demo catalog into a QA/development database (owner connection):
 *   MIGRATION_DATABASE_URL=<url> SEED_RECRUITER_ID=<identity user id> npm run seed
 * Refuses to run when NODE_ENV=production unless ALLOW_DEMO_SEED=true.
 */
import 'dotenv/config';
import { createPgDatabase } from './pg.js';
import { seedDemoData } from './seed.js';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error('Refusing to seed demo data in production (set ALLOW_DEMO_SEED=true to override)');
  process.exit(1);
}
const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('MIGRATION_DATABASE_URL (or DATABASE_URL) is required');
  process.exit(1);
}
const db = createPgDatabase({ connectionString: url, runtimeRole: null, poolMax: 1 });
try {
  await seedDemoData(db);
  console.log('ProJobs demo data loaded');
} catch (error) {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await db.close();
}
