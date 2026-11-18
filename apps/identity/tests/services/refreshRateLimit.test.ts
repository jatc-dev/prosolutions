import assert from 'node:assert/strict';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import cookieParser from 'cookie-parser';
import express from 'express';
import { hasRefreshCookie, refreshLimiter } from '../../src/middleware/rateLimiter';
import { REFRESH_TOKEN_COOKIE_NAME } from '../../src/utils/cookies';

test('only requests carrying the refresh cookie are rate limited', () => {
  assert.equal(hasRefreshCookie({ cookies: {} } as never), false);
  assert.equal(hasRefreshCookie({ cookies: { [REFRESH_TOKEN_COOKIE_NAME]: '' } } as never), false);
  assert.equal(hasRefreshCookie({ cookies: { other: 'x' } } as never), false);
  assert.equal(hasRefreshCookie({ cookies: { [REFRESH_TOKEN_COOKIE_NAME]: 'token' } } as never), true);
});

test('anonymous /refresh calls never exhaust the limit; failed cookie refreshes still do', async () => {
  const app = express();
  app.use(cookieParser());
  app.post('/refresh', refreshLimiter, (_req, res) => res.status(401).json({ message: 'nope' }));
  const server = app.listen(0);
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/refresh`;
  try {
    // Far beyond the production budget (60): cookie-less calls are skipped entirely.
    for (let i = 0; i < 400; i += 1) {
      const res = await fetch(url, { method: 'POST' });
      assert.equal(res.status, 401);
    }
    // Requests with a (bad) cookie are counted and eventually throttled.
    let throttled = false;
    for (let i = 0; i < 400 && !throttled; i += 1) {
      const res = await fetch(url, { method: 'POST', headers: { Cookie: `${REFRESH_TOKEN_COOKIE_NAME}=forged` } });
      throttled = res.status === 429;
    }
    assert.equal(throttled, true);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
