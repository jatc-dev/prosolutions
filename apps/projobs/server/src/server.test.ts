import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from './index.js';
import { config } from './config.js';

// Mock ProIdentity introspection so tests never call the live identity service.
const originalFetch = globalThis.fetch;
let introspectionOverride: Record<string, unknown> | null = null;
async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  if (url.includes('/api/auth/introspect')) {
    if (introspectionOverride) {
      return new Response(JSON.stringify(introspectionOverride), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
    const headers = init?.headers as Record<string, string> | undefined;
    const rawAuth = headers?.authorization || headers?.Authorization || '';
    const rawToken = rawAuth.replace(/^Bearer\s+/i, '');
    const payload = jwt.decode(rawToken) as { sub?: string; modules?: string[]; email?: string } | null;
    if (!payload?.sub) {
      return new Response(JSON.stringify({ valid: false, reason: 'token_invalid' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      valid: true, userId: payload.sub, email: payload.email,
      role: 'user', modules: payload.modules || [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return originalFetch(input, init);
}

test('ProJobs auth and safe persistence fallback', async (t) => {
  globalThis.fetch = mockFetch;
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No test port');

  const base = `http://127.0.0.1:${address.port}`;
  const token = (modules: string[], email?: string) =>
    jwt.sign({ modules, email, jti: 'synthetic-test-jti' }, config.jwtSecret, {
      subject: 'synthetic-test-user',
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: '5m',
    });
  t.after(() => new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  ));
  t.after(() => { globalThis.fetch = originalFetch; });

  await t.test('health endpoint', async () => {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', service: 'projobs-server' });
  });

  await t.test('root returns API JSON 404 rather than missing frontend file', async () => {
    const response = await fetch(base);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Not found' });
  });

  await t.test('missing credentials are rejected', async () =>
    assert.equal((await fetch(`${base}/api/saved-jobs`)).status, 401),
  );

  await t.test('invalid token is rejected', async () =>
    assert.equal((await fetch(`${base}/api/saved-jobs`, {
      headers: { Authorization: 'Bearer invalid' },
    })).status, 401),
  );

  await t.test('revoked ProIdentity session is rejected', async () => {
    introspectionOverride = { valid: false, reason: 'session_revoked' };
    try {
      const response = await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token(['PROJOBS'])}` },
      });
      assert.equal(response.status, 401);
      assert.equal((await response.json()).reason, 'session_revoked');
    } finally {
      introspectionOverride = null;
    }
  });

  await t.test('missing PROJOBS entitlement is rejected', async () =>
    assert.equal((await fetch(`${base}/api/saved-jobs`, {
      headers: { Authorization: `Bearer ${token(['PROCV'])}` },
    })).status, 403),
  );

  await t.test('new personal endpoints require authentication', async () => {
    assert.equal((await fetch(`${base}/api/job-alerts`)).status, 401);
    assert.equal((await fetch(`${base}/api/career/progress`)).status, 401);
    assert.equal((await fetch(`${base}/api/applications/test-job/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'interview' }) })).status, 401);
  });

  await t.test('application tracking rejects unsupported status before persistence', async () => {
    const response = await fetch(`${base}/api/applications/test-job/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token(['PROJOBS'])}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'hired-instantly' }),
    });
    assert.equal(response.status, 400);
  });

  await t.test('alert creation rejects empty filters before persistence', async () => {
    const response = await fetch(`${base}/api/job-alerts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token(['PROJOBS'], 'synthetic@example.com')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test alert', frequency: 'daily', filters: {} }),
    });
    assert.equal(response.status, 400);
  });

  await t.test('unconfigured database returns safe 503', async () => {
    if (config.databaseUrl) return;
    const response = await fetch(`${base}/api/saved-jobs`, {
      headers: { Authorization: `Bearer ${token(['PROJOBS'])}` },
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'PROJOBS_PERSISTENCE_NOT_CONFIGURED');
  });
});
