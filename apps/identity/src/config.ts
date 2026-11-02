import 'dotenv/config';

function getEnvironment() {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

function getPort(): number {
  const rawPort = process.env.PORT;
  const parsed = rawPort ? Number(rawPort) : 4001;

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

function getDatabaseUrl(isProduction: boolean): string {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    if (isProduction) {
      throw new Error('DATABASE_URL must be set in production environment');
    }
    return 'postgresql://postgres:postgres@localhost:5432/prosolutions_identity?schema=public';
  }

  if (isProduction && !(dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string in production');
  }

  return dbUrl;
}

const DEFAULT_ALLOWED_ORIGINS: string[] = [
  'https://prosolutions.page',
  'https://www.prosolutions.page',
  'https://procv-platform.onrender.com',
  'https://procv.prosolutions.page',
  'https://projobs.prosolutions.page',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

function getCookieSameSite(): 'lax' | 'strict' | 'none' {
  const raw = (process.env.COOKIE_SAME_SITE || '').toLowerCase();
  if (raw === 'lax' || raw === 'strict' || raw === 'none') {
    return raw;
  }
  return getEnvironment() === 'production' ? 'none' : 'lax';
}

function getJwtSecret(): string {
  const secret = process.env.IDENTITY_JWT_SECRET;
  const isProduction = getEnvironment() === 'production';

  if (isProduction) {
    if (!secret) {
      throw new Error(
        'IDENTITY_JWT_SECRET must be set in production environment. ' +
          'Generate a strong secret using: openssl rand -base64 32',
      );
    }

    if (secret.length < 32) {
      throw new Error(
        'IDENTITY_JWT_SECRET must be at least 32 characters long in production. ' +
          'Current length: ' +
          secret.length,
      );
    }
  }

  return secret || 'change-me-for-development-only';
}

function getProCVDatabaseJwtSecret(): string {
  const secret = process.env.PROCV_DATABASE_JWT_SECRET;
  if (getEnvironment() === 'production') {
    if (!secret || secret.length < 32) {
      throw new Error('PROCV_DATABASE_JWT_SECRET must be set and at least 32 characters in production');
    }
    const normalized = secret.toLowerCase();
    if (['change-me', 'secret', 'password', '123456', 'jwt-secret'].some(value => normalized.includes(value))) {
      throw new Error('PROCV_DATABASE_JWT_SECRET appears to be a weak/default value');
    }
    if (secret === process.env.IDENTITY_JWT_SECRET || secret === process.env.JWT_SECRET) {
      throw new Error('PROCV_DATABASE_JWT_SECRET must be different from the access-token signing secret');
    }
  }
  return secret || 'change-me-procv-database-secret-in-development';
}

export const config = {
  port: getPort(),
  jwtSecret: getJwtSecret(),
  procvDatabaseJwtSecret: getProCVDatabaseJwtSecret(),
  jwtExpiresIn: process.env.IDENTITY_JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.IDENTITY_JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: process.env.IDENTITY_ISSUER || 'https://identity.prosolutions.page',
  audience: process.env.IDENTITY_AUDIENCE || 'prosolutions-api',
  frontendUrl: getFrontendUrl(getEnvironment() === 'production'),
  databaseUrl: getDatabaseUrl(getEnvironment() === 'production'),
  isProduction: getEnvironment() === 'production',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || getEnvironment() === 'production',
  cookieSameSite: getCookieSameSite(),
  cookieDomain: process.env.COOKIE_DOMAIN || '.prosolutions.page',
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS,
};
