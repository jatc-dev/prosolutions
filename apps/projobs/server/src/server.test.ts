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
  const token = (modules: string[], email?: string, jti?: string) =>
    jwt.sign({ modules, email, jti: jti || 'test-jti-' + Math.random().toString(36).slice(2) }, config.jwtSecret, {
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

  await t.test('missing jti is rejected', async () => {
    const noJti = jwt.sign({ modules: ['PROJOBS'], email: 'synthetic@example.com' }, config.jwtSecret, {
      subject: 'synthetic-test-user',
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: '5m',
    });
    assert.equal((await fetch(`${base}/api/saved-jobs`, {
      headers: { Authorization: `Bearer ${noJti}` },
    })).status, 401);
  });

  await t.test('unconfigured database returns safe 503', async () => {
    if (config.databaseUrl) return;
    const response = await fetch(`${base}/api/saved-jobs`, {
      headers: { Authorization: `Bearer ${token(['PROJOBS'])}` },
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'PROJOBS_PERSISTENCE_NOT_CONFIGURED');
  });

  if (config.databaseUrl) {
    await t.test('persistence: save, list, and remove saved job with RLS isolation', async () => {
      const userA = 'persistence-test-user-a';
      const userB = 'persistence-test-user-b';
      const jobId = 'persistence-test-job-1';
      const tokenA = (modules: string[], sub: string) =>
        jwt.sign({ modules, email: `${sub}@example.test`, jti: 'persistence-jti-' + sub }, config.jwtSecret, {
          subject: sub,
          issuer: config.issuer,
          audience: config.audience,
          expiresIn: '5m',
        });

      const authA = { Authorization: `Bearer ${tokenA(['PROJOBS'], userA)}` };
      const authB = { Authorization: `Bearer ${tokenA(['PROJOBS'], userB)}` };

      // User A saves a job
      const saveResp = await fetch(`${base}/api/saved-jobs`, {
        method: 'POST',
        headers: { ...authA, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          jobUrl: 'https://example.com/job/1',
          jobTitle: 'Test Engineer',
          company: 'Test Co',
        }),
      });
      assert.equal(saveResp.status, 200);

      // User A lists their saved jobs - should see the job
      const listA = await fetch(`${base}/api/saved-jobs`, { headers: authA });
      assert.equal(listA.status, 200);
      const bodyA = await listA.json();
      assert.equal(bodyA.savedJobs.length, 1);
      assert.equal(bodyA.savedJobs[0].job_id, jobId);

      // User B lists their saved jobs - should NOT see A's job (RLS isolation)
      const listB = await fetch(`${base}/api/saved-jobs`, { headers: authB });
      assert.equal(listB.status, 200);
      const bodyB = await listB.json();
      assert.equal(bodyB.savedJobs.length, 0);

      // User B tries to remove A's job - should fail (404)
      const removeB = await fetch(`${base}/api/saved-jobs/${jobId}`, {
        method: 'DELETE',
        headers: authB,
      });
      assert.equal(removeB.status, 404);

      // User A removes their own job - should succeed
      const removeA = await fetch(`${base}/api/saved-jobs/${jobId}`, {
        method: 'DELETE',
        headers: authA,
      });
      assert.equal(removeA.status, 200);

      // Verify removal
      const listA2 = await fetch(`${base}/api/saved-jobs`, { headers: authA });
      const bodyA2 = await listA2.json();
      assert.equal(bodyA2.savedJobs.length, 0);
    });

    await t.test('persistence: create, list, update, and delete application', async () => {
      const user = 'persistence-test-app-user';
      const jobId = 'persistence-test-app-job-1';
      const token = (modules: string[], sub: string) =>
        jwt.sign({ modules, email: `${sub}@example.test`, jti: 'persistence-app-jti-' + sub }, config.jwtSecret, {
          subject: sub,
          issuer: config.issuer,
          audience: config.audience,
          expiresIn: '5m',
        });
      const auth = { Authorization: `Bearer ${token(['PROJOBS'], user)}` };

      // Create application
      const createResp = await fetch(`${base}/api/applications`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          jobUrl: 'https://example.com/job/app-1',
          jobTitle: 'Senior Developer',
          company: 'App Co',
          coverLetter: 'I am interested.',
        }),
      });
      assert.equal(createResp.status, 201);

      // List applications
      const listResp = await fetch(`${base}/api/applications`, { headers: auth });
      assert.equal(listResp.status, 200);
      const body = await listResp.json();
      assert.equal(body.applications.length, 1);
      assert.equal(body.applications[0].status, 'redirected_to_employer');

      // Update status
      const updateResp = await fetch(`${base}/api/applications/${jobId}/status`, {
        method: 'PATCH',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'interview', note: 'Good first round' }),
      });
      assert.equal(updateResp.status, 200);

      // Delete application
      const deleteResp = await fetch(`${base}/api/applications/${jobId}`, {
        method: 'DELETE',
        headers: auth,
      });
      assert.equal(deleteResp.status, 200);

      // Verify deletion
      const listResp2 = await fetch(`${base}/api/applications`, { headers: auth });
      const body2 = await listResp2.json();
      assert.equal(body2.applications.length, 0);
    });
  }
});
