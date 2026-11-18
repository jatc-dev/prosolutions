import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from './database.js';

/** Resolves to apps/projobs/server/migrations from both src/ (tsx) and dist/. */
export const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations/', import.meta.url));

const LOCK_KEY = 7_406_101; // arbitrary, stable advisory lock id for ProJobs migrations

export interface MigrationReport {
  applied: string[];
  skipped: string[];
}

/**
 * Apply pending `NNN_name.sql` files in order. Each file runs in its own
 * transaction under an advisory lock; checksums detect edited migrations.
 */
export async function runMigrations(db: Database, dir = MIGRATIONS_DIR): Promise<MigrationReport> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS public.projobs_schema_migrations (
      version     text PRIMARY KEY,
      checksum    text NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    );
  `);

  const files = (await readdir(dir)).filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  const { rows } = await db.query<{ version: string; checksum: string }>(
    'SELECT version, checksum FROM public.projobs_schema_migrations',
  );
  const applied = new Map(rows.map((row) => [row.version, row.checksum]));
  const report: MigrationReport = { applied: [], skipped: [] };

  for (const file of files) {
    // Normalize line endings so Windows (CRLF) and Linux (LF) checkouts hash identically.
    const sql = (await readFile(join(dir, file), 'utf8')).replace(/\r\n/g, '\n');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const previous = applied.get(file);
    if (previous) {
      if (previous !== checksum) {
        throw new Error(`Migration ${file} was modified after being applied; add a new migration instead`);
      }
      report.skipped.push(file);
      continue;
    }
    await db.exec(`
      BEGIN;
      SELECT pg_advisory_xact_lock(${LOCK_KEY});
      ${sql}
      ;
      INSERT INTO public.projobs_schema_migrations (version, checksum) VALUES ('${file}', '${checksum}');
      COMMIT;
    `);
    report.applied.push(file);
  }
  return report;
}
