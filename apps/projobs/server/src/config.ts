import { z } from 'zod';

const DEFAULT_ISSUER = 'https://identity.prosolutions.page';
const DEFAULT_AUDIENCE = 'prosolutions-api';
const DEFAULT_CORS = 'https://projobs.prosolutions.page,https://prosolutions.page,https://www.prosolutions.page';

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  /** Runtime connection (pooled). Empty outside production = in-memory PGlite. */
  databaseUrl: string | null;
  /** Restricted role assumed per transaction (production: projobs_api). */
  runtimeRole: string | null;
  poolMax: number;
  /** jwksUrl: ProIdentity public keys. secret: legacy HS256 (accepted only while set). */
  jwt: { secret: string | null; jwksUrl: string | null; issuer: string; audience: string };
  corsOrigins: string[];
  procvApiUrl: string;
  procvTimeoutMs: number;
  /** Shared secret for /internal/* consumers. Internal API disabled when null. */
  internalToken: string | null;
  trustProxy: boolean;
}

const identifier = /^[a-z_][a-z0-9_]{0,62}$/;

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5176),
  DATABASE_URL: z.string().trim().optional(),
  PROJOBS_DB_RUNTIME_ROLE: z.string().trim().regex(identifier).optional(),
  PG_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
  IDENTITY_JWT_SECRET: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  IDENTITY_ISSUER: z.string().trim().default(DEFAULT_ISSUER),
  IDENTITY_AUDIENCE: z.string().trim().default(DEFAULT_AUDIENCE),
  IDENTITY_JWKS_URL: z.string().trim().url().optional(),
  CORS_ORIGIN: z.string().default(DEFAULT_CORS),
  PROCV_API_URL: z.string().trim().url().optional(),
  PROCV_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(6000),
  PROJOBS_INTERNAL_TOKEN: z.string().trim().min(32).optional(),
  TRUST_PROXY: z.enum(['true', 'false']).optional(),
});

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid ProJobs configuration: ${fields}`);
  }
  const env = parsed.data;
  const isProduction = env.NODE_ENV === 'production';
  const secret = env.IDENTITY_JWT_SECRET || env.JWT_SECRET || '';

  if (isProduction) {
    const missing: string[] = [];
    if (!env.DATABASE_URL) missing.push('DATABASE_URL');
    if (!env.IDENTITY_JWKS_URL && secret.length < 32) missing.push('IDENTITY_JWKS_URL (or legacy IDENTITY_JWT_SECRET >=32 chars)');
    if (!env.PROCV_API_URL) missing.push('PROCV_API_URL');
    if (missing.length) throw new Error(`Missing production configuration: ${missing.join(', ')}`);
  }

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL || null,
    runtimeRole: env.PROJOBS_DB_RUNTIME_ROLE ?? (isProduction ? 'projobs_api' : null),
    poolMax: env.PG_POOL_MAX,
    jwt: {
      secret: secret || (isProduction ? null : 'projobs-local-development-secret-not-for-production'),
      jwksUrl: env.IDENTITY_JWKS_URL ?? null,
      issuer: env.IDENTITY_ISSUER,
      audience: env.IDENTITY_AUDIENCE,
    },
    corsOrigins: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
    procvApiUrl: (env.PROCV_API_URL ?? 'http://localhost:4000').replace(/\/+$/, ''),
    procvTimeoutMs: env.PROCV_TIMEOUT_MS,
    internalToken: env.PROJOBS_INTERNAL_TOKEN ?? null,
    trustProxy: env.TRUST_PROXY ? env.TRUST_PROXY === 'true' : isProduction,
  };
}
