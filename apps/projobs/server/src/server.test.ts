import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from './index.js';
import { config } from './config.js';

test('ProJobs auth and safe persistence fallback', async (t) => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No test port');

  const base = `http://127.0.0.1:${address.port}`;
  const token = (modules: string[]) =>
    jwt.sign({ modules }, config.jwtSecret, {
      subject: 'synthetic-test-user',
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: '5m',
    });
  t.after(() => new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  ));

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

  await t.test('missing PROJOBS entitlement is rejected', async () =>
    assert.equal((await fetch(`${base}/api/saved-jobs`, {
      headers: { Authorization: `Bearer ${token(['PROCV'])}` },
    })).status, 403),
  );

  await t.test('unconfigured database returns safe 503', async () => {
    if (config.databaseUrl) return;
    const response = await fetch(`${base}/api/saved-jobs`, {
      headers: { Authorization: `Bearer ${token(['PROJOBS'])}` },
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'PROJOBS_PERSISTENCE_NOT_CONFIGURED');
  });
});
