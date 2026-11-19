import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createJwksKeyStore, type KeyStore } from './jwks';

let keyStore: KeyStore | null = null;

/** Lazily created store of ProIdentity's public signing keys. */
export function getIdentityKeyStore(): KeyStore {
  if (!keyStore) {
    keyStore = createJwksKeyStore({
      url: config.identityJwksUrl,
      log: (message, meta) => logger.warn(message, meta),
    });
  }
  return keyStore;
}

/** Test hook. */
export function setIdentityKeyStoreForTests(store: KeyStore | null): void {
  keyStore = store;
}

/** Load the JWKS at startup and keep it fresh in the background. */
export async function startIdentityKeyRefresh(): Promise<void> {
  const store = getIdentityKeyStore();
  await store.refresh();
  logger.info('Identity JWKS loaded', { keys: store.size });
  setInterval(() => void store.refresh(), 10 * 60 * 1000).unref();
}

/**
 * Verify a ProIdentity access token: ES256 against the JWKS, or HS256 with the
 * legacy shared secret while it is still configured. Only tokens with
 * `token_use: "access"` are accepted.
 */
export function verifyIdentityAccessToken(token: string): jwt.JwtPayload {
  const header = jwt.decode(token, { complete: true })?.header;
  const options = { issuer: config.issuer, audience: config.identityAudience };
  let decoded: string | jwt.JwtPayload;
  if (header?.alg === 'ES256' && header.kid) {
    const key = getIdentityKeyStore().getKey(header.kid);
    if (!key) throw new Error('Unknown identity signing key');
    decoded = jwt.verify(token, key, { ...options, algorithms: ['ES256'] });
  } else if (header?.alg === 'HS256' && config.jwtSecret) {
    decoded = jwt.verify(token, config.jwtSecret, { ...options, algorithms: ['HS256'] });
  } else {
    throw new Error('Unsupported identity token');
  }
  if (typeof decoded === 'string') throw new Error('Unexpected token payload');
  if (decoded.token_use !== 'access') throw new Error('Not an access token');
  return decoded;
}
