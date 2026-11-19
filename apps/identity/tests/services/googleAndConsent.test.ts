import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../src/prismaClient';
import { config } from '../../src/config';
import {
  buildAuthorizationUrl,
  createPkcePair,
  openTransaction,
  sealTransaction,
  verifyGoogleIdToken,
} from '../../src/services/googleOAuth';
import { safeNextUrl } from '../../src/controllers/googleAuthController';
import { CONSENT_PURPOSES, getConsentStatus } from '../../src/services/consentService';
import { registerSchema } from '../../src/validation/authValidation';

const originalConsentFindMany = prisma.userConsent.findMany;
after(() => {
  (prisma.userConsent as any).findMany = originalConsentFindMany;
});

test('PKCE challenge is the S256 of the verifier and the auth URL carries it', () => {
  const { verifier, challenge } = createPkcePair();
  assert.equal(challenge, crypto.createHash('sha256').update(verifier).digest('base64url'));
  const url = new URL(buildAuthorizationUrl({ clientId: 'cid', clientSecret: 's', redirectUri: 'https://id.test/cb' }, 'st', challenge));
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('code_challenge'), challenge);
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.equal(url.searchParams.get('state'), 'st');
});

test('OAuth transaction cookie is tamper-proof and expires', () => {
  const tx = { state: 's', verifier: 'v', next: 'https://prosolutions.page/dashboard', privacyAccepted: true, exp: Date.now() + 60_000 };
  const sealed = sealTransaction(tx, 'secret-a');
  assert.deepEqual(openTransaction(sealed, 'secret-a'), tx);
  assert.equal(openTransaction(sealed, 'secret-b'), null);
  const [body, mac] = sealed.split('.');
  const forged = Buffer.from(JSON.stringify({ ...tx, next: 'https://evil.test' })).toString('base64url');
  assert.equal(openTransaction(`${forged}.${mac}`, 'secret-a'), null);
  assert.equal(openTransaction(`${body}.${mac}`, 'secret-a', Date.now() + 120_000), null);
  assert.equal(openTransaction(undefined, 'secret-a'), null);
});

test('post-login redirects only go to allow-listed first-party origins', () => {
  const allowed = config.allowedOrigins[0];
  assert.equal(safeNextUrl(`${allowed}/dashboard`), `${allowed}/dashboard`);
  for (const bad of ['https://evil.example/steal', 'javascript:alert(1)', '//evil.example', 42, undefined]) {
    assert.match(safeNextUrl(bad), /\/dashboard$/);
    assert.equal(safeNextUrl(bad).startsWith('https://evil'), false);
  }
});

test('Google ID tokens are verified for signature, audience and issuer', async () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const keys = new Map([['g1', publicKey]]);
  const sign = (claims: Record<string, unknown>, aud = 'client-123', iss = 'https://accounts.google.com') =>
    jwt.sign({ sub: 'google-sub', email: 'Ana@Example.com', email_verified: true, name: 'Ana', ...claims }, privateKey, {
      algorithm: 'RS256', keyid: 'g1', audience: aud, issuer: iss, expiresIn: '5m',
    });

  const identity = await verifyGoogleIdToken(sign({}), 'client-123', { keys });
  assert.deepEqual(identity, { sub: 'google-sub', email: 'ana@example.com', emailVerified: true, name: 'Ana' });
  await assert.rejects(verifyGoogleIdToken(sign({}, 'other-client'), 'client-123', { keys }));
  await assert.rejects(verifyGoogleIdToken(sign({}, 'client-123', 'https://evil.example'), 'client-123', { keys }));
  const { privateKey: otherKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const forged = jwt.sign({ sub: 'x', email: 'x@y.z' }, otherKey, { algorithm: 'RS256', keyid: 'g1', audience: 'client-123', issuer: 'https://accounts.google.com' });
  await assert.rejects(verifyGoogleIdToken(forged, 'client-123', { keys }));
});

test('registration requires explicit privacy policy acceptance', () => {
  const base = { email: 'ana@example.com', password: 'Secreta123' };
  assert.ok(registerSchema.validate(base).error);
  assert.ok(registerSchema.validate({ ...base, acceptPrivacyPolicy: false }).error);
  assert.equal(registerSchema.validate({ ...base, acceptPrivacyPolicy: true }).error, undefined);
});

test('consent status uses the latest decision and re-asks when the policy version changes', async () => {
  const version = CONSENT_PURPOSES.privacy_policy.version;
  (prisma.userConsent as any).findMany = async () => [
    { purpose: 'marketing_emails', version: '2026-11', granted: false, createdAt: new Date('2026-11-18T10:00:00Z') },
    { purpose: 'marketing_emails', version: '2026-11', granted: true, createdAt: new Date('2026-11-17T10:00:00Z') },
    { purpose: 'privacy_policy', version: '2020-01', granted: true, createdAt: new Date('2020-01-01T00:00:00Z') },
  ];
  const status = await getConsentStatus('user-1');
  const privacy = status.find((s) => s.purpose === 'privacy_policy')!;
  const marketing = status.find((s) => s.purpose === 'marketing_emails')!;
  assert.equal(privacy.granted, false, `old version must not count as consent to ${version}`);
  assert.equal(privacy.actionRequired, true);
  assert.equal(marketing.granted, false);
  assert.equal(marketing.actionRequired, false);
});
