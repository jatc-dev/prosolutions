import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { createIdentityVerifier } from '../src/auth/identity.js';
import { createJwksKeyStore, keysFromJwks, staticKeyStore } from '../src/auth/jwks.js';

const issuer = 'https://identity.test';
const audience = 'prosolutions-api';
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwk = { ...(publicKey.export({ format: 'jwk' }) as object), kid: 'k1', alg: 'ES256', use: 'sig' };
const keys = keysFromJwks({ keys: [jwk] });

function es256(claims: Record<string, unknown>, kid = 'k1') {
  return jwt.sign({ sub: 'user-1', modules: ['PROJOBS'], ...claims }, privateKey, {
    algorithm: 'ES256', keyid: kid, issuer, audience, expiresIn: '5m',
  });
}

describe('identity token verification', () => {
  const verify = createIdentityVerifier({ issuer, audience, keyStore: staticKeyStore(keys) });

  it('accepts ES256 access tokens signed by a published key', () => {
    const principal = verify(es256({ token_use: 'access' }));
    expect(principal).toMatchObject({ userId: 'user-1', isCandidate: true });
  });

  it('rejects refresh tokens, tokens without token_use and unknown keys', () => {
    expect(() => verify(es256({ token_use: 'refresh' }))).toThrow();
    expect(() => verify(es256({}))).toThrow();
    expect(() => verify(es256({ token_use: 'access' }, 'other-kid'))).toThrow();
  });

  it('refuses HS256 once no legacy secret is configured', () => {
    const hs = jwt.sign({ sub: 'user-1', token_use: 'access' }, 'x'.repeat(40), { issuer, audience, expiresIn: '5m' });
    expect(() => verify(hs)).toThrow();
    const legacy = createIdentityVerifier({ issuer, audience, keyStore: staticKeyStore(keys), secret: 'x'.repeat(40) });
    expect(legacy(hs).userId).toBe('user-1');
  });

  it('loads EC P-256 keys from a JWKS endpoint and ignores other key types', async () => {
    const store = createJwksKeyStore({
      url: 'https://identity.test/.well-known/jwks.json',
      fetchImpl: (async () => new Response(JSON.stringify({ keys: [jwk, { kty: 'RSA', kid: 'rsa' }] }))) as typeof fetch,
    });
    await store.refresh();
    expect(store.size).toBe(1);
    expect(store.getKey('k1')).toBeDefined();
  });
});
