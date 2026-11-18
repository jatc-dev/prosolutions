/**
 * One-off migration entry point. Requires an owner/DDL connection:
 *   MIGRATION_DATABASE_URL=<direct Neon URL> npm run migrate
 * The runtime login (projobs_runtime) cannot and must not run DDL.
 */
import 'dotenv/config';
import { createPgDatabase } from './pg.js';
import { runMigrations } from './migrate.js';

const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('MIGRATION_DATABASE_URL (or DATABASE_URL) is required');
  process.exit(1);
}

const db = createPgDatabase({ connectionString: url, runtimeRole: null, poolMax: 1 });
try {
  const report = await runMigrations(db);
  console.log(`ProJobs migrations applied: ${report.applied.join(', ') || 'none'} (up to date: ${report.skipped.length})`);
} catch (error) {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await db.close();
}
