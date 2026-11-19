import crypto, { type KeyObject } from 'crypto';

/**
 * Asymmetric signing material for access tokens.
 *
 * ProIdentity signs access tokens with an ES256 (P-256) private key that only
 * this service holds. Every other module verifies them with the public key it
 * downloads from `/.well-known/jwks.json`, so compromising a consumer module
 * no longer lets an attacker mint platform-wide sessions.
 *
 * When no private key is configured (local development, tests) the service
 * falls back to HS256 with IDENTITY_JWT_SECRET so the platform keeps working.
 */

export type AccessTokenAlgorithm = 'ES256' | 'HS256';

export interface PublicJwk {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  kid: string;
  alg: 'ES256';
  use: 'sig';
}

export interface SigningKeySet {
  algorithm: AccessTokenAlgorithm;
  kid: string | null;
  privateKey: KeyObject | null;
  /** Public keys accepted for verification (current first, then previous). */
  publicKeys: Map<string, KeyObject>;
  jwks: { keys: PublicJwk[] };
}

/** Accept a PEM with literal or escaped newlines, or the PEM encoded in base64. */
export function normalizePem(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('-----BEGIN')) return trimmed.replace(/\\n/g, '\n');
  const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
  if (!decoded.includes('-----BEGIN')) {
    throw new Error('Signing key must be a PEM string or a base64-encoded PEM');
  }
  return decoded;
}

/** RFC 7638 thumbprint, used as the default key id. */
export function jwkThumbprint(jwk: { crv?: string; kty: string; x?: string; y?: string }): string {
  const canonical = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y });
  return crypto.createHash('sha256').update(canonical).digest('base64url');
}

function toPublicJwk(publicKey: KeyObject, kid?: string): PublicJwk {
  const jwk = publicKey.export({ format: 'jwk' }) as { kty: string; crv?: string; x?: string; y?: string };
  if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') {
    throw new Error('Access token signing keys must be EC P-256 (ES256)');
  }
  return { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, kid: kid || jwkThumbprint(jwk), alg: 'ES256', use: 'sig' };
}

export function buildSigningKeySet(input: {
  privateKeyPem?: string | null;
  keyId?: string | null;
  previousPublicKeyPem?: string | null;
}): SigningKeySet {
  const publicKeys = new Map<string, KeyObject>();
  const jwks: PublicJwk[] = [];

  if (!input.privateKeyPem) {
    return { algorithm: 'HS256', kid: null, privateKey: null, publicKeys, jwks: { keys: jwks } };
  }

  const privateKey = crypto.createPrivateKey(normalizePem(input.privateKeyPem));
  const currentPublic = crypto.createPublicKey(privateKey);
  const currentJwk = toPublicJwk(currentPublic, input.keyId || undefined);
  publicKeys.set(currentJwk.kid, currentPublic);
  jwks.push(currentJwk);

  if (input.previousPublicKeyPem) {
    const previousPublic = crypto.createPublicKey(normalizePem(input.previousPublicKeyPem));
    const previousJwk = toPublicJwk(previousPublic);
    if (!publicKeys.has(previousJwk.kid)) {
      publicKeys.set(previousJwk.kid, previousPublic);
      jwks.push(previousJwk);
    }
  }

  return { algorithm: 'ES256', kid: currentJwk.kid, privateKey, publicKeys, jwks: { keys: jwks } };
}

let cached: SigningKeySet | null = null;

export function getSigningKeySet(): SigningKeySet {
  if (!cached) {
    cached = buildSigningKeySet({
      privateKeyPem: process.env.IDENTITY_JWT_PRIVATE_KEY || null,
      keyId: process.env.IDENTITY_JWT_KID || null,
      previousPublicKeyPem: process.env.IDENTITY_JWT_PREVIOUS_PUBLIC_KEY || null,
    });
  }
  return cached;
}

/** Test hook: force a specific key set (or reset to env-derived with null). */
export function setSigningKeySetForTests(keySet: SigningKeySet | null): void {
  cached = keySet;
}

/**
 * HS256 access tokens are accepted only while no asymmetric key is configured,
 * or during an explicit migration window (IDENTITY_JWT_ACCEPT_HS256=true).
 */
export function acceptsLegacyHs256(keySet: SigningKeySet = getSigningKeySet()): boolean {
  if (keySet.algorithm === 'HS256') return true;
  return process.env.IDENTITY_JWT_ACCEPT_HS256 === 'true';
}
