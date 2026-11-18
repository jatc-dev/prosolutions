/**
 * Minimal database abstraction shared by the pg (production) and PGlite
 * (local development / tests) drivers. All application SQL is plain
 * PostgreSQL with positional parameters.
 */
export interface QueryResult<T> {
  rows: T[];
}

export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

/** Per-request security context propagated to PostgreSQL (RLS). */
export interface DbContext {
  userId: string | null;
}

export interface Database {
  /**
   * Run `work` inside a transaction that assumes the restricted runtime role
   * (when configured) and exposes the caller to row level security through
   * `projobs.user_id`.
   */
  withContext<T>(ctx: DbContext, work: (tx: Queryable) => Promise<T>): Promise<T>;
  /** Execute a multi-statement script as the connection owner (migrations, seeds). */
  exec(sql: string): Promise<void>;
  /** Owner-level query outside any request context (migrations, health). */
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
}

const SAFE_USER_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Transaction-local settings that establish the request context. Values are
 * validated identifiers, so inlining them is safe and lets the pg driver send
 * `BEGIN` plus these settings in a single round trip to a remote database.
 */
export function contextSettingsSql(ctx: DbContext, runtimeRole: string | null): string {
  const userId = ctx.userId ?? '';
  if (userId && !SAFE_USER_ID.test(userId)) {
    throw new Error('Refusing to propagate an unsafe user id to the database');
  }
  const settings = [`set_config('projobs.user_id', '${userId}', true)`];
  if (runtimeRole) {
    if (!/^[a-z_][a-z0-9_]{0,62}$/.test(runtimeRole)) throw new Error('Invalid runtime role');
    settings.unshift(`set_config('role', '${runtimeRole}', true)`);
  }
  return `SELECT ${settings.join(', ')}`;
}
