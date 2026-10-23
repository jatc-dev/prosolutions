import 'dotenv/config';

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
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Unsupported URL protocol');
    }
    return parsed.toString().replace(/\\/$/, '');
  } catch {
    throw new Error('IDENTITY_URL must be a valid HTTP(S) URL');
  }
}

export const config = {
  port: getPort(),
  identityUrl: getIdentityUrl(),
  isProduction: process.env.NODE_ENV === 'production',
};
