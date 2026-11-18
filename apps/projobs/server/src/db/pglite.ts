import { contextSettingsSql, type Database, type DbContext, type Queryable } from './database.js';

/**
 * In-process PostgreSQL (WASM) for local development without credentials and
 * for tests. Loaded lazily so production never imports it.
 */
export async function createPgliteDatabase(runtimeRole: string | null = 'projobs_api'): Promise<Database> {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = await PGlite.create();

  const wrap = (target: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }): Queryable => ({
    query: async <R>(text: string, params?: unknown[]) => {
      const result = await target.query(text, params ?? []);
      return { rows: result.rows as R[] };
    },
  });

  return {
    withContext<T>(ctx: DbContext, work: (tx: Queryable) => Promise<T>): Promise<T> {
      return db.transaction(async (tx) => {
        await tx.query(contextSettingsSql(ctx, runtimeRole));
        return work(wrap(tx));
      });
    },
    async exec(sql: string) {
      await db.exec(sql);
    },
    query: wrap(db).query,
    close: () => db.close(),
  };
}
