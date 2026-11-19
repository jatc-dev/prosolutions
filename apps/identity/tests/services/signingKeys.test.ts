import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../src/prismaClient';
import { config } from '../../src/config';
import { buildSigningKeySet, setSigningKeySetForTests } from '../../src/services/signingKeys';
import {
  deriveSuccessorRefreshToken,
  generateRefreshToken,
  hashRefreshToken,
  purgeStaleSessions,
  signAccessToken,
  verifyAccessToken,
} from '../../src/services/tokenService';

const originalDeleteMany = prisma.session.deleteMany;

function es256KeySet() {
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  return buildSigningKeySet({ privateKeyPem: Buffer.from(pem).toString('base64') });
}

after(() => {
  setSigningKeySetForTests(null);
  delete process.env.IDENTITY_JWT_ACCEPT_HS256;
  (prisma.session as any).deleteMany = originalDeleteMany;
});

test('ES256 access tokens carry a kid and verify only with the published JWKS key', () => {
  const keySet = es256KeySet();
  setSigningKeySetForTests(keySet);
  const token = signAccessToken({ sub: 'user-1', jti: 'jti-1', modules: ['PROJOBS'] });
  const header = jwt.decode(token, { complete: true })!.header;
  assert.equal(header.alg, 'ES256');
  assert.equal(header.kid, keySet.kid);
  assert.equal(keySet.jwks.keys.length, 1);
  assert.equal(keySet.jwks.keys[0].kid, keySet.kid);
  assert.equal('d' in keySet.jwks.keys[0], false, 'the JWKS must never expose the private component');

  const payload = verifyAccessToken(token);
  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.token_use, 'access');

  // A consumer that only has the JWKS can verify the token.
  const publicKey = crypto.createPublicKey({ key: keySet.jwks.keys[0] as any, format: 'jwk' });
  assert.equal((jwt.verify(token, publicKey, { algorithms: ['ES256'] }) as any).sub, 'user-1');
});

test('once an asymmetric key is configured, HS256 tokens are refused unless the migration flag is on', () => {
  setSigningKeySetForTests(es256KeySet());
  const legacy = jwt.sign({ sub: 'user-1', jti: 'j', token_use: 'access' }, config.jwtSecret, {
    issuer: config.issuer,
    audience: config.audience,
    expiresIn: '5m',
  });
  assert.throws(() => verifyAccessToken(legacy));
  process.env.IDENTITY_JWT_ACCEPT_HS256 = 'true';
  assert.equal(verifyAccessToken(legacy).sub, 'user-1');
  delete process.env.IDENTITY_JWT_ACCEPT_HS256;
});

test('tokens without token_use=access are rejected even with a valid signature', () => {
  setSigningKeySetForTests(null);
  for (const claims of [{ token_use: 'refresh' }, {}]) {
    const token = jwt.sign({ sub: 'user-1', jti: 'j', ...claims }, config.jwtSecret, {
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: '5m',
    });
    assert.throws(() => verifyAccessToken(token), /not an access token/);
  }
  assert.throws(() => verifyAccessToken(generateRefreshToken()));
});

test('refresh tokens are opaque, hashed deterministically and have a deterministic successor', () => {
  const token = generateRefreshToken();
  assert.match(token, /^rt_[A-Za-z0-9_-]{43}$/);
  assert.notEqual(token, generateRefreshToken());
  assert.equal(hashRefreshToken(token), hashRefreshToken(token));
  assert.match(hashRefreshToken(token), /^[0-9a-f]{64}$/);
  assert.equal(deriveSuccessorRefreshToken(token), deriveSuccessorRefreshToken(token));
  assert.notEqual(deriveSuccessorRefreshToken(token), token);
});

test('purge deletes expired sessions and revoked sessions past the recovery retention', async () => {
  let where: any;
  (prisma.session as any).deleteMany = async (args: any) => {
    where = args.where;
    return { count: 7 };
  };
  const now = new Date('2026-11-18T12:00:00Z');
  assert.equal(await purgeStaleSessions(now), 7);
  assert.deepEqual(where.OR[0], { expiresAt: { lt: now } });
  assert.equal(where.OR[1].revokedAt.lt.toISOString(), '2026-11-18T11:00:00.000Z');
});
