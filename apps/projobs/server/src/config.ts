import 'dotenv/config';

function getEnvironment() {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

function getPort(): number {
  const rawPort = process.env.PORT;
  const parsed = rawPort ? Number(rawPort) : 5176;

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error('PORT must be a valid integer between 1 and 65535');
  }

  return parsed;
}

function getIdentityUrl(): string {
  const url = process.env.IDENTITY_URL || 'http://localhost:4001';
  try {
    new URL(url);
    return url;
  } catch {
    throw new Error('IDENTITY_URL must be a valid URL');
  }
}

function getJwtSecret(): string {
  const secret = process.env.IDENTITY_JWT_SECRET || process.env.JWT_SECRET;
  const isProduction = getEnvironment() === 'production';

  if (isProduction && !secret) {
    throw new Error(
      'IDENTITY_JWT_SECRET must be set in production environment',
    );
  }

  return secret || 'change-me-for-development-only';
}

export const config = {
  port: getPort(),
  identityUrl: getIdentityUrl(),
  jwtSecret: getJwtSecret(),
  issuer: process.env.IDENTITY_ISSUER || 'https://identity.prosolutions.page',
  audience: process.env.IDENTITY_AUDIENCE || 'prosolutions-api',
  isProduction: getEnvironment() === 'production',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || getEnvironment() === 'production',
  supabaseUrl: (process.env.PROJOBS_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\\/$/, ''),
  supabaseServiceRoleKey: process.env.PROJOBS_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};
