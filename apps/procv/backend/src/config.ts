import { createHmac } from 'crypto';
import 'dotenv/config';

function getEnvironment() {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

function getPort(): number {
  const rawPort = process.env.PORT;
  const parsed = rawPort ? Number(rawPort) : 4000;

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error('PORT must be a valid integer between 1 and 65535');
  }

  return parsed;
}

function getFrontendUrl(isProduction: boolean): string {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (isProduction) {
    try {
      const parsed = new URL(frontendUrl);
      if (!/^https?:$/.test(parsed.protocol)) {
        throw new Error('FRONTEND_URL must use http or https protocol');
      }
    } catch {
      throw new Error('FRONTEND_URL must be a valid URL in production');
    }
  }

  return frontendUrl;
}

/**
 * Runtime connection: always DATABASE_URL (pooled, restricted procv_login role),
 * the same URL Prisma reads from schema.prisma. DIRECT_DATABASE_URL is an
 * owner connection for manual migrations only and must never be used here.
 */
function getDatabaseUrl(isProduction: boolean): string {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    if (isProduction) {
      throw new Error('DATABASE_URL must be set in production environment');
    }
    return 'postgresql://postgres:postgres@localhost:5432/procvplatform?schema=public';
  }

  if (isProduction && !(dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
    throw new Error('Database URL must be a PostgreSQL connection string in production');
  }

  return dbUrl;
}

/**
 * Legacy shared HS256 secret. Once ProIdentity signs access tokens with ES256,
 * ProCV verifies them with the public JWKS and this secret should be removed
 * from ProCV's environment (it is then accepted for HS256 tokens no longer).
 */
function getJwtSecret(): string | null {
  const secret = process.env.IDENTITY_JWT_SECRET || process.env.JWT_SECRET;
  const isProduction = getEnvironment() === 'production';

  if (isProduction) {
    if (!secret) {
      return null;
    }

    if (secret.length < 32) {
      throw new Error(
        'IDENTITY_JWT_SECRET must be at least 32 characters long in production. ' +
          'Current length: ' +
          secret.length,
      );
    }

    // Check for common weak secrets
    const weakSecrets = ['change-me', 'secret', 'password', '123456', 'jwt-secret'];
    const normalizedSecret = secret.toLowerCase();
    if (weakSecrets.some(weak => normalizedSecret.includes(weak))) {
      throw new Error(
        'IDENTITY_JWT_SECRET appears to be a weak/default value. ' +
          'Please use a strong, randomly generated secret.',
      );
    }
  }

  return secret || 'change-me-for-development-only';
}

/**
 * CSRF tokens are signed with a ProCV-only key: PROCV_CSRF_SECRET when set,
 * otherwise an HMAC derivation of the RLS context key, so ProCV no longer needs
 * the identity signing secret for CSRF.
 */
function getCsrfSecret(jwtSecret: string | null): string {
  if (process.env.PROCV_CSRF_SECRET) return process.env.PROCV_CSRF_SECRET;
  const rlsKey = process.env.PROCV_RLS_CONTEXT_KEY;
  if (rlsKey) return createHmac('sha256', rlsKey).update('procv-csrf-signing-key').digest('hex');
  if (getEnvironment() === 'production') {
    throw new Error('PROCV_CSRF_SECRET or PROCV_RLS_CONTEXT_KEY must be set in production');
  }
  return jwtSecret || 'change-me-for-development-only';
}

const jwtSecret = getJwtSecret();
const identityUrl = (process.env.IDENTITY_URL || 'http://localhost:4001').replace(/\/+$/, '');

export const config = {
  port: getPort(),
  jwtSecret,
  csrfSecret: getCsrfSecret(jwtSecret),
  identityJwksUrl: process.env.IDENTITY_JWKS_URL || `${identityUrl}/.well-known/jwks.json`,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  identityUrl,
  issuer: process.env.IDENTITY_ISSUER || 'https://identity.prosolutions.page',
  identityAudience: process.env.IDENTITY_AUDIENCE || 'prosolutions-api',
  frontendUrl: getFrontendUrl(getEnvironment() === 'production'),
  databaseUrl: getDatabaseUrl(getEnvironment() === 'production'),
  isProduction: getEnvironment() === 'production',
};
