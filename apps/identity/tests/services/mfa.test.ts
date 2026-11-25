import assert from 'node:assert/strict';
import { test } from 'node:test';
import crypto from 'crypto';
import {
  base32Decode,
  base32Encode,
  consumeRecoveryCode,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  mfaKey,
  openChallenge,
  otpauthUrl,
  sealChallenge,
  totpAt,
  verifyTotp,
} from '../../src/services/mfa';

// RFC 6238 appendix B, SHA-1 seed "12345678901234567890" (8-digit values, last 6 digits).
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

test('base32 round-trips', () => {
  const bytes = crypto.randomBytes(20);
  assert.deepEqual(base32Decode(base32Encode(bytes)), bytes);
  assert.equal(RFC_SECRET, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
});

test('TOTP matches the RFC 6238 test vectors', () => {
  assert.equal(totpAt(RFC_SECRET, Math.floor(59 / 30)), '287082');
  assert.equal(totpAt(RFC_SECRET, Math.floor(1111111109 / 30)), '081804');
  assert.equal(totpAt(RFC_SECRET, Math.floor(1234567890 / 30)), '005924');
  assert.equal(totpAt(RFC_SECRET, Math.floor(2000000000 / 30)), '279037');
});

test('verification accepts one step of drift and rejects replays', () => {
  const now = 1234567890 * 1000;
  const step = Math.floor(1234567890 / 30);
  assert.equal(verifyTotp(RFC_SECRET, '005924', null, now), step);
  assert.equal(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step - 1), null, now), step - 1);
  assert.equal(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, step + 2), null, now), null);
  assert.equal(verifyTotp(RFC_SECRET, '005924', step, now), null, 'same step cannot be used twice');
  assert.equal(verifyTotp(RFC_SECRET, '12345', null, now), null);
  assert.equal(verifyTotp(RFC_SECRET, 'abcdef', null, now), null);
});

test('secrets are encrypted and tamper-evident', () => {
  const key = crypto.randomBytes(32);
  const sealed = encryptSecret(RFC_SECRET, key);
  assert.ok(!sealed.includes(RFC_SECRET));
  assert.equal(decryptSecret(sealed, key), RFC_SECRET);
  assert.equal(decryptSecret(sealed, crypto.randomBytes(32)), null);
  const parts = sealed.split('.');
  parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith('AA') ? 'BB' : 'AA');
  assert.equal(decryptSecret(parts.join('.'), key), null);
});

test('production requires MFA_ENCRYPTION_KEY; development derives one', () => {
  assert.equal(mfaKey({}, 'x'.repeat(32), true), null);
  assert.equal(mfaKey({ MFA_ENCRYPTION_KEY: 'a'.repeat(64) }, 'x'.repeat(32), true)?.length, 32);
  assert.equal(mfaKey({}, 'x'.repeat(32), false)?.length, 32);
});

test('recovery codes are single use and case/format insensitive', () => {
  const { codes, hashes } = generateRecoveryCodes();
  assert.equal(codes.length, 10);
  assert.equal(new Set(codes).size, 10);
  assert.match(codes[0], /^[A-Z2-7]{5}-[A-Z2-7]{5}$/);
  const remaining = consumeRecoveryCode(hashes, codes[3].toLowerCase().replace('-', ' '));
  assert.equal(remaining?.length, 9);
  assert.equal(consumeRecoveryCode(remaining!, codes[3]), null);
  assert.equal(consumeRecoveryCode(hashes, 'AAAAA-AAAAA'), null);
});

test('challenges are signed and expire', () => {
  const secret = 's'.repeat(32);
  const sealed = sealChallenge({ userId: 'u1', rememberMe: true, exp: Date.now() + 1000 }, secret);
  assert.equal(openChallenge(sealed, secret)?.userId, 'u1');
  assert.equal(openChallenge(sealed, 'other'.repeat(8)), null);
  assert.equal(openChallenge(sealed, secret, Date.now() + 5000), null);
  const [body, mac] = sealed.split('.');
  const forged = Buffer.from(JSON.stringify({ userId: 'admin', rememberMe: true, exp: Date.now() + 1000 })).toString('base64url');
  assert.equal(openChallenge(`${forged}.${mac}`, secret), null);
  assert.ok(body);
});

test('otpauth URL carries issuer and account', () => {
  const url = otpauthUrl('ana@example.test', RFC_SECRET);
  assert.match(url, /^otpauth:\/\/totp\/ProSolutions%3Aana%40example\.test\?/);
  assert.match(url, /secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ/);
  assert.match(url, /issuer=ProSolutions/);
});
