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
  /** Public web origin used in emails, sitemap and structured data. */
  webUrl: string;
  /** Public origin of this API (unsubscribe links). */
  apiUrl: string;
  /** Partner job feeds, each off unless switched on explicitly. */
  externalJobs: {
    /** CAREERJET_ENABLED=true and a key. Sends visitor IP/user agent to Careerjet. */
    careerjet: { enabled: boolean; apiKey: string | null; locale: string };
    /** REMOTIVE_ENABLED=true. Server-side feed, no visitor data leaves ProJobs. */
    remotiveEnabled: boolean;
    /** Server-side cache of identical searches (0 = no cache, until the partner terms allow it). */
    cacheSeconds: number;
    timeoutMs: number;
  };
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
  PUBLIC_WEB_URL: z.string().trim().url().default('https://projobs.prosolutions.page'),
  PUBLIC_API_URL: z.string().trim().url().optional(),
  CAREERJET_ENABLED: z.enum(['true', 'false']).default('false'),
  REMOTIVE_ENABLED: z.enum(['true', 'false']).default('false'),
  CAREERJET_API_KEY: z.string().trim().min(8).optional(),
  CAREERJET_LOCALE: z.string().trim().regex(/^[a-z]{2}_[A-Z]{2}$/).default('es_CO'),
  EXTERNAL_JOBS_CACHE_SECONDS: z.coerce.number().int().min(0).max(3600).default(0),
  EXTERNAL_JOBS_TIMEOUT_MS: z.coerce.number().int().min(500).max(15_000).default(4000),
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
    webUrl: env.PUBLIC_WEB_URL.replace(/\/+$/, ''),
    apiUrl: (env.PUBLIC_API_URL ?? `http://localhost:${env.PORT}`).replace(/\/+$/, ''),
    externalJobs: {
      careerjet: {
        enabled: env.CAREERJET_ENABLED === 'true' && Boolean(env.CAREERJET_API_KEY),
        apiKey: env.CAREERJET_API_KEY ?? null,
        locale: env.CAREERJET_LOCALE,
      },
      remotiveEnabled: env.REMOTIVE_ENABLED === 'true',
      cacheSeconds: env.EXTERNAL_JOBS_CACHE_SECONDS,
      timeoutMs: env.EXTERNAL_JOBS_TIMEOUT_MS,
    },
  };
}
