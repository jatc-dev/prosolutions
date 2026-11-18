import pg from 'pg';
import { contextSettingsSql, type Database, type DbContext, type Queryable } from './database.js';

export interface PgOptions {
  connectionString: string;
  runtimeRole: string | null;
  poolMax: number;
  onError?: (error: Error) => void;
}

/**
 * Production driver. Compatible with Neon's pooled (PgBouncer, transaction
 * mode) endpoint: only transaction-local settings and unnamed statements.
 */
export function createPgDatabase(options: PgOptions): Database {
  const pool = new pg.Pool({
    connectionString: options.connectionString,
    max: options.poolMax,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    query_timeout: 10_000,
    application_name: 'projobs-api',
  });
  pool.on('error', (error) => options.onError?.(error));

  return {
    async withContext<T>(ctx: DbContext, work: (tx: Queryable) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query(`BEGIN; ${contextSettingsSql(ctx, options.runtimeRole)};`);
        const tx: Queryable = {
          query: async <R>(text: string, params?: unknown[]) => {
            const result = await client.query(text, params as unknown[] | undefined);
            return { rows: result.rows as R[] };
          },
        };
        const value = await work(tx);
        await client.query('COMMIT');
        return value;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    async exec(sql: string) {
      await pool.query(sql);
    },
    async query<R>(text: string, params?: unknown[]) {
      const result = await pool.query(text, params as unknown[] | undefined);
      return { rows: result.rows as R[] };
    },
    close: () => pool.end(),
  };
}
