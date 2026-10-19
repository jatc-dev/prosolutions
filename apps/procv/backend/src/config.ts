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

function getDatabaseUrl(isProduction: boolean): string {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    if (isProduction) {
      throw new Error('DATABASE_URL must be set in production environment');
    }
    return 'postgresql://postgres:postgres@localhost:5432/procvplatform?schema=public';
  }

  if (isProduction && !(dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string in production');
  }

  return dbUrl;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = getEnvironment() === 'production';

  if (isProduction) {
    if (!secret) {
      throw new Error(
        'JWT_SECRET must be set in production environment. ' +
          'Generate a strong secret using: openssl rand -base64 32',
      );
    }

    if (secret.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters long in production. ' +
          'Current length: ' +
          secret.length,
      );
    }

    // Check for common weak secrets
    const weakSecrets = ['change-me', 'secret', 'password', '123456', 'jwt-secret'];
    const normalizedSecret = secret.toLowerCase();
    if (weakSecrets.some(weak => normalizedSecret.includes(weak))) {
      throw new Error(
        'JWT_SECRET appears to be a weak/default value. ' +
          'Please use a strong, randomly generated secret.',
      );
    }
  }

  return secret || 'change-me-for-development-only';
}

export const config = {
  port: getPort(),
  jwtSecret: getJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  identityUrl: process.env.IDENTITY_URL || 'http://localhost:4001',
  frontendUrl: getFrontendUrl(getEnvironment() === 'production'),
  databaseUrl: getDatabaseUrl(getEnvironment() === 'production'),
  isProduction: getEnvironment() === 'production',
};
