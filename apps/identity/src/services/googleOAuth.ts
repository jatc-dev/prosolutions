import crypto, { type KeyObject } from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Google OAuth 2.0 / OpenID Connect (authorization code + PKCE).
 * Only the pieces ProIdentity needs: build the authorization URL, exchange the
 * code and verify the ID token against Google's published keys.
 */

export const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS: [string, string] = ['https://accounts.google.com', 'accounts.google.com'];

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function readGoogleConfig(env: NodeJS.ProcessEnv = process.env): GoogleOAuthConfig | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function createPkcePair() {
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function buildAuthorizationUrl(config: GoogleOAuthConfig, state: string, codeChallenge: string): string {
  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

/** Signed, short-lived OAuth transaction kept in an HttpOnly cookie. */
export interface OAuthTransaction {
  state: string;
  verifier: string;
  next: string;
  privacyAccepted: boolean;
  exp: number;
}

export function sealTransaction(transaction: OAuthTransaction, secret: string): string {
  const body = Buffer.from(JSON.stringify(transaction)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(`google-oauth:${body}`).digest('base64url');
  return `${body}.${mac}`;
}

export function openTransaction(value: string | undefined, secret: string, now = Date.now()): OAuthTransaction | null {
  if (!value || typeof value !== 'string') return null;
  const [body, mac] = value.split('.');
  if (!body || !mac) return null;
  const expected = crypto.createHmac('sha256', secret).update(`google-oauth:${body}`).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthTransaction;
    if (typeof parsed.exp !== 'number' || parsed.exp < now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

let cachedKeys: { keys: Map<string, KeyObject>; fetchedAt: number } | null = null;

async function googleKeys(fetchImpl: typeof fetch, forceRefresh = false): Promise<Map<string, KeyObject>> {
  if (!forceRefresh && cachedKeys && Date.now() - cachedKeys.fetchedAt < 60 * 60 * 1000) return cachedKeys.keys;
  const response = await fetchImpl(GOOGLE_CERTS_URL, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Google certs request failed (${response.status})`);
  const body = (await response.json()) as { keys?: Array<Record<string, string>> };
  const keys = new Map<string, KeyObject>();
  for (const jwk of body.keys ?? []) {
    if (jwk.kty !== 'RSA' || !jwk.kid) continue;
    keys.set(jwk.kid, crypto.createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' }));
  }
  cachedKeys = { keys, fetchedAt: Date.now() };
  return keys;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  options: { fetchImpl?: typeof fetch; keys?: Map<string, KeyObject> } = {},
): Promise<GoogleIdentity> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const header = jwt.decode(idToken, { complete: true })?.header;
  if (!header?.kid || header.alg !== 'RS256') throw new Error('Unexpected Google ID token');
  let key = options.keys?.get(header.kid) ?? (await googleKeys(fetchImpl)).get(header.kid);
  if (!key && !options.keys) key = (await googleKeys(fetchImpl, true)).get(header.kid);
  if (!key) throw new Error('Unknown Google signing key');
  const claims = jwt.verify(idToken, key, {
    algorithms: ['RS256'],
    audience: clientId,
    issuer: GOOGLE_ISSUERS,
  }) as jwt.JwtPayload;
  if (typeof claims.sub !== 'string' || typeof claims.email !== 'string') throw new Error('Incomplete Google identity');
  return {
    sub: claims.sub,
    email: claims.email.toLowerCase().trim(),
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name: typeof claims.name === 'string' ? claims.name : null,
  };
}

export async function exchangeCode(
  config: GoogleOAuthConfig,
  code: string,
  verifier: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Google token exchange failed (${response.status})`);
  const body = (await response.json()) as { id_token?: string };
  if (!body.id_token) throw new Error('Google did not return an ID token');
  return body.id_token;
}
