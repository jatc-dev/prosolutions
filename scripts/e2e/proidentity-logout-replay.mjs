#!/usr/bin/env node
/**
 * Production E2E: login -> verify access token -> logout -> replay saved JWT.
 * Never logs credentials, access tokens, refresh tokens, or cookie values.
 */
import assert from 'node:assert/strict';

const baseUrl = (process.env.IDENTITY_E2E_BASE_URL || 'https://identity.prosolutions.page').replace(/\/+$/, '');
const email = process.env.IDENTITY_E2E_EMAIL;
const password = process.env.IDENTITY_E2E_PASSWORD;

if (!email || !password) {
  console.error('Missing required environment variables: IDENTITY_E2E_EMAIL and IDENTITY_E2E_PASSWORD.');
  process.exit(2);
}

const target = new URL(baseUrl);
if (target.protocol !== 'https:' || (target.hostname !== 'identity.prosolutions.page' && process.env.ALLOW_NONPROD_TARGET !== 'true')) {
  console.error('Refusing to run: target must be https://identity.prosolutions.page. For an explicitly approved non-production test, set ALLOW_NONPROD_TARGET=true.');
  process.exit(2);
}

async function request(path, options = {}) {
  return fetch(new URL(path, `${baseUrl}/`), {
    ...options,
    redirect: 'manual',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

function step(name, status, detail = '') {
  console.log(`${status === 'PASS' ? 'PASS' : 'FAIL'} | ${name} | ${detail}`);
}

let accessToken;
let refreshCookie;

try {
  const loginResponse = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await readJson(loginResponse);
  step('login', loginResponse.status === 200 ? 'PASS' : 'FAIL', `HTTP ${loginResponse.status}`);
  assert.equal(loginResponse.status, 200, 'Login did not return HTTP 200');
  assert.equal(typeof loginBody.accessToken, 'string', 'Login response did not contain an access token');
  assert.ok(loginBody.accessToken.length > 20, 'Access token was unexpectedly short');
  accessToken = loginBody.accessToken;

  const setCookie = loginResponse.headers.get('set-cookie') || '';
  const cookieMatch = setCookie.match(/(?:^|,\s*)refreshToken=([^;]+)/);
  assert.ok(cookieMatch, 'Login response did not set the refreshToken cookie');
  refreshCookie = `refreshToken=${cookieMatch[1]}`;

  const beforeLogout = await request('/api/auth/me', {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  step('protected request before logout', beforeLogout.status === 200 ? 'PASS' : 'FAIL', `HTTP ${beforeLogout.status}`);
  assert.equal(beforeLogout.status, 200, 'Fresh access JWT was not accepted before logout');
  await beforeLogout.arrayBuffer();

  const logoutResponse = await request('/api/auth/logout', {
    method: 'POST',
    headers: { cookie: refreshCookie },
  });
  const logoutBody = await readJson(logoutResponse);
  step('logout', logoutResponse.status === 200 ? 'PASS' : 'FAIL', `HTTP ${logoutResponse.status}`);
  assert.equal(logoutResponse.status, 200, 'Logout did not return HTTP 200');
  assert.equal(logoutBody.message, 'Logged out successfully', 'Unexpected logout response');

  // Deliberately send the saved access JWT only; do not send the refresh cookie.
  const replayResponse = await request('/api/auth/me', {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const replayBody = await readJson(replayResponse);
  step('replay saved JWT after logout, without refresh cookie', replayResponse.status === 401 ? 'PASS' : 'FAIL', `HTTP ${replayResponse.status}`);
  assert.equal(replayResponse.status, 401, 'Saved access JWT was not rejected with HTTP 401 after logout');
  assert.equal(replayBody.message, 'Session revoked or expired', 'JWT was rejected, but not for the expected revoked/expired session reason');

  console.log('RESULT | PASS | Full production logout/replay flow verified; no tokens or cookies were printed.');
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`RESULT | FAIL | ${message}`);
  process.exitCode = 1;
}
