import crypto from 'crypto';

/**
 * Optional two-step sign-in (TOTP, RFC 6238: SHA-1, 6 digits, 30 s) with
 * single-use recovery codes. No third-party dependency.
 *
 * - The TOTP secret is stored encrypted (AES-256-GCM) with MFA_ENCRYPTION_KEY
 *   (64 hex chars). Outside production a key derived from the JWT secret is
 *   used so local development works without extra configuration.
 * - Recovery codes are stored as SHA-256 hashes and work even if the
 *   encryption key is lost, so an owner can always get back in.
 * - The password step returns a short-lived signed challenge instead of a
 *   session; the session is only issued after the second step.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const RECOVERY_CODE_COUNT = 10;

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Invalid base32 character');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 15;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, '0');
}

export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

/**
 * Accepts the current code and its neighbours (clock drift). Returns the
 * matched step, or null. A step at or before `lastUsedStep` is rejected so a
 * code cannot be replayed.
 */
export function verifyTotp(secret: string, code: string, lastUsedStep: number | null, now = Date.now()): number | null {
  const clean = String(code ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const step = currentStep(now);
  for (const candidate of [step, step - 1, step + 1]) {
    if (lastUsedStep !== null && candidate <= lastUsedStep) continue;
    const expected = totpAt(secret, candidate);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) return candidate;
  }
  return null;
}

export function otpauthUrl(email: string, secret: string, issuer = 'ProSolutions'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/* ---------- secret encryption ---------- */

export function mfaKey(env: NodeJS.ProcessEnv, jwtSecret: string, isProduction: boolean): Buffer | null {
  const raw = env.MFA_ENCRYPTION_KEY?.trim() ?? '';
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  if (isProduction) return null;
  return Buffer.from(crypto.hkdfSync('sha256', jwtSecret, 'prosolutions', 'mfa-secret-dev', 32));
}

export function encryptSecret(secret: string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decryptSecret(sealed: string, key: Buffer): string | null {
  const [version, iv, tag, data] = sealed.split('.');
  if (version !== 'v1' || !iv || !tag || !data) return null;
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/* ---------- recovery codes ---------- */

function normalizeRecoveryCode(code: string): string {
  return String(code ?? '').toUpperCase().replace(/[^A-Z2-7]/g, '');
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(`mfa-recovery:${normalizeRecoveryCode(code)}`).digest('hex');
}

/** Ten codes like "ABCDE-FGHIJ" (50 bits each) and their hashes. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: count }, () => {
    const raw = base32Encode(crypto.randomBytes(7)).slice(0, 10);
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { codes, hashes: codes.map(hashRecoveryCode) };
}

/** Returns the remaining hashes when the code matches one, otherwise null. */
export function consumeRecoveryCode(hashes: string[], code: string): string[] | null {
  if (normalizeRecoveryCode(code).length !== 10) return null;
  const hash = hashRecoveryCode(code);
  const index = hashes.findIndex((candidate) => crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash)));
  if (index < 0) return null;
  return hashes.filter((_, position) => position !== index);
}

/* ---------- second-step challenge ---------- */

export interface MfaChallenge {
  userId: string;
  rememberMe: boolean;
  next?: string;
  exp: number;
}

export function sealChallenge(challenge: MfaChallenge, secret: string): string {
  const body = Buffer.from(JSON.stringify(challenge)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(`mfa-challenge:${body}`).digest('base64url');
  return `${body}.${mac}`;
}

export function openChallenge(value: unknown, secret: string, now = Date.now()): MfaChallenge | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  const [body, mac] = value.split('.');
  if (!body || !mac) return null;
  const expected = crypto.createHmac('sha256', secret).update(`mfa-challenge:${body}`).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as MfaChallenge;
    if (typeof parsed.userId !== 'string' || typeof parsed.exp !== 'number' || parsed.exp < now) return null;
    return parsed;
  } catch {
    return null;
  }
}
