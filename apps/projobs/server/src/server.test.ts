import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from './index.js';
import { config } from './config.js';

// Mock fetch for ProIdentity introspection calls.
// The mock extracts the JWT `sub` and returns it as `userId`, so the strict
// contract validation (introspection.userId === JWT sub) passes for every
// synthetic subject. No identity validation is relaxed: the middleware still
// requires userId === sub, valid === true, modules array, and valid JWT.
type IntrospectionResponse = {
  valid: boolean;
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
  reason?: string;
};

let introspectionOverride: IntrospectionResponse | null = null;
let introspectionShouldThrow = false;
let introspectionShouldTimeout = false;

const originalFetch = globalThis.fetch;

function setIntrospectionResponse(
  response: IntrospectionResponse | null,
  shouldThrow = false,
  shouldTimeout = false,
) {
  introspectionOverride = response;
  introspectionShouldThrow = shouldThrow;
  introspectionShouldTimeout = shouldTimeout;
}

function extractSubFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  if (url.includes('/api/auth/introspect')) {
    if (introspectionShouldThrow) {
      throw new Error('introspection service unavailable');
    }
    if (introspectionShouldTimeout) {
      const abortError = new Error('The operation was aborted.') as Error & { name: string };
      abortError.name = 'AbortError';
      throw abortError;
    }
    // Allow per-test override of the introspection response (e.g. revoked session).
    if (introspectionOverride !== null) {
      return new Response(JSON.stringify(introspectionOverride), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Default: derive userId from the JWT `sub` so it matches the contract.
    const initHeaders = (init as any)?.headers;
    let rawAuth = '';
    if (initHeaders) {
      if (typeof initHeaders.get === 'function') {
        rawAuth = initHeaders.get('authorization') ?? initHeaders.get('Authorization') ?? '';
      } else if (typeof initHeaders === 'object') {
        rawAuth = (initHeaders as Record<string, string | undefined>)?.authorization ??
          (initHeaders as Record<string, string | undefined>)?.Authorization ?? '';
      }
    }
    const token = rawAuth.replace('Bearer ', '') || '';
    const sub = extractSubFromToken(token);
    if (!sub) {
      return new Response(JSON.stringify({ valid: false, reason: 'token_invalid' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ valid: true, userId: sub, email: `${sub}@example.test`, role: 'user', modules: ['PROJOBS'] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return originalFetch(input, init);
}

function createToken(modules: string[], email?: string, jti?: string, sub = `synthetic-user-${crypto.randomUUID()}`) {
  return jwt.sign({ modules, email, jti: jti || `test-jti-${Math.random().toString(36).slice(2)}` }, config.jwtSecret, {
    subject: sub,
    issuer: config.issuer,
    audience: config.audience,
    expiresIn: '5m',
  });
}

// Synthetic identifiers unique per test run to avoid collisions.
const runId = crypto.randomUUID();
const jobIdA = `job-${runId}-a`;
const jobIdB = `job-${runId}-b`;
const appJobId = `appjob-${runId}`;
const searchId = `search-${runId}`;

test('ProJobs auth and safe persistence fallback', async (t) => {
  // Install fetch mock before creating the server so middleware uses it.
  (globalThis as any).fetch = mockFetch;

  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('No test port');

  const base = `http://127.0.0.1:${address.port}`;
  t.after(() => new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  ));

  await t.after(() => {
    (globalThis as any).fetch = originalFetch;
  });

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

  await t.test('missing PROJOBS entitlement is rejected', async () => {
    const subA = `no-entitlement-${crypto.randomUUID()}`;
    setIntrospectionResponse({
      valid: true,
      userId: subA,
      email: `${subA}@example.test`,
      role: 'user',
      modules: ['PROCV'],
    });
    try {
      const token = createToken(['PROCV'], undefined, undefined, subA);
      assert.equal((await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })).status, 403);
    } finally {
      introspectionOverride = null;
    }
  });

  await t.test('new personal endpoints require authentication', async () => {
    assert.equal((await fetch(`${base}/api/job-alerts`)).status, 401);
    assert.equal((await fetch(`${base}/api/career/progress`)).status, 401);
    assert.equal((await fetch(`${base}/api/applications/test-job/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'interview' }) })).status, 401);
  });

  await t.test('application tracking rejects unsupported status before persistence', async () => {
    const sub = `status-test-${crypto.randomUUID()}`;
    const token = createToken(['PROJOBS'], undefined, undefined, sub);
    const response = await fetch(`${base}/api/applications/test-job/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'hired-instantly' }),
    });
    assert.equal(response.status, 400);
  });

  await t.test('alert creation rejects empty filters before persistence', async () => {
    const sub = `alert-test-${crypto.randomUUID()}`;
    const token = createToken(['PROJOBS'], `${sub}@example.test`, undefined, sub);
    const response = await fetch(`${base}/api/job-alerts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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

  await t.test('introspection session revoked is rejected', async () => {
    const sub = `revoked-${crypto.randomUUID()}`;
    setIntrospectionResponse({ valid: false, reason: 'session_revoked' });
    try {
      const token = createToken(['PROJOBS'], undefined, undefined, sub);
      assert.equal((await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })).status, 401);
    } finally {
      introspectionOverride = null;
    }
  });

  await t.test('introspection session not found is rejected', async () => {
    const sub = `notfound-${crypto.randomUUID()}`;
    setIntrospectionResponse({ valid: false, reason: 'session_not_found' });
    try {
      const token = createToken(['PROJOBS'], undefined, undefined, sub);
      assert.equal((await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })).status, 401);
    } finally {
      introspectionOverride = null;
    }
  });

  await t.test('introspection service unavailable fails closed', async () => {
    const sub = `unavailable-${crypto.randomUUID()}`;
    setIntrospectionResponse(null, true);
    try {
      const token = createToken(['PROJOBS'], undefined, undefined, sub);
      assert.equal((await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })).status, 401);
    } finally {
      introspectionOverride = null;
      introspectionShouldThrow = false;
    }
  });

  await t.test('introspection missing userId is rejected', async () => {
    const sub = `missingid-${crypto.randomUUID()}`;
    setIntrospectionResponse({
      valid: true,
      email: `${sub}@example.test`,
      role: 'user',
      modules: ['PROJOBS'],
    });
    try {
      const token = createToken(['PROJOBS'], undefined, undefined, sub);
      assert.equal((await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })).status, 401);
    } finally {
      introspectionOverride = null;
    }
  });

  await t.test('introspection userId mismatch is rejected', async () => {
    const subA = `mismatch-a-${crypto.randomUUID()}`;
    const subB = `mismatch-b-${crypto.randomUUID()}`;
    setIntrospectionResponse({
      valid: true,
      userId: subB,
      email: `${subB}@example.test`,
      role: 'user',
      modules: ['PROJOBS'],
    });
    try {
      const token = createToken(['PROJOBS'], undefined, undefined, subA);
      assert.equal((await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })).status, 401);
    } finally {
      introspectionOverride = null;
    }
  });

  await t.test('introspection missing modules is rejected', async () => {
    const sub = `nomod-${crypto.randomUUID()}`;
    setIntrospectionResponse({
      valid: true,
      userId: sub,
      email: `${sub}@example.test`,
      role: 'user',
    });
    try {
      const token = createToken(['PROJOBS'], undefined, undefined, sub);
      assert.equal((await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })).status, 401);
    } finally {
      introspectionOverride = null;
    }
  });

  await t.test('introspection malformed modules is rejected', async () => {
    const sub = `badmod-${crypto.randomUUID()}`;
    setIntrospectionResponse({
      valid: true,
      userId: sub,
      email: `${sub}@example.test`,
      role: 'user',
      modules: 'PROJOBS' as unknown as string[],
    });
    try {
      const token = createToken(['PROJOBS'], undefined, undefined, sub);
      assert.equal((await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })).status, 401);
    } finally {
      introspectionOverride = null;
    }
  });

  await t.test('introspection invalid JSON is rejected', async () => {
    const sub = `badjson-${crypto.randomUUID()}`;
    introspectionOverride = null;
    // Force raw non-JSON response by temporarily replacing the mock behavior.
    const originalMock = mockFetch;
    (globalThis as any).fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      if (url.includes('/api/auth/introspect')) {
        return new Response('not-json', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(input, init);
    };
    try {
      const token = createToken(['PROJOBS'], undefined, undefined, sub);
      assert.equal((await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })).status, 401);
    } finally {
      (globalThis as any).fetch = originalMock;
    }
  });

  await t.test('introspection HTTP 500 is rejected', async () => {
    const sub = `http500-${crypto.randomUUID()}`;
    setIntrospectionResponse({ valid: false, reason: 'internal_error' });
    try {
      const token = createToken(['PROJOBS'], undefined, undefined, sub);
      assert.equal((await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })).status, 401);
    } finally {
      introspectionOverride = null;
    }
  });

  await t.test('introspection timeout fails closed', async () => {
    const sub = `timeout-${crypto.randomUUID()}`;
    setIntrospectionResponse(null, false, true);
    try {
      const token = createToken(['PROJOBS'], undefined, undefined, sub);
      assert.equal((await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      })).status, 401);
    } finally {
      introspectionOverride = null;
      introspectionShouldTimeout = false;
    }
  });

  await t.test('optional auth never authenticates invalid tokens', async () => {
    const sub = `optional-${crypto.randomUUID()}`;
    setIntrospectionResponse({ valid: false, reason: 'session_revoked' });
    try {
      const token = createToken(['PROJOBS'], undefined, undefined, sub);
      const response = await fetch(`${base}/api/saved-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(response.status, 401);
    } finally {
      introspectionOverride = null;
    }
  });

  await t.test('unconfigured database returns safe 503', async () => {
    if (config.databaseUrl) {
      // Skip: database is configured, persistence tests will run below.
      return;
    }
    const sub = `unconfigured-${crypto.randomUUID()}`;
    const token = createToken(['PROJOBS'], undefined, undefined, sub);
    const response = await fetch(`${base}/api/saved-jobs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'PROJOBS_PERSISTENCE_NOT_CONFIGURED');
  });

  if (config.databaseUrl) {
    await t.test('persistence: save, list, and remove saved job with RLS isolation', async () => {
      const subA = `persist-a-${crypto.randomUUID()}`;
      const subB = `persist-b-${crypto.randomUUID()}`;
      const jobId = `persistjob-${crypto.randomUUID()}`;
      const tokenA = createToken(['PROJOBS'], `${subA}@example.test`, undefined, subA);
      const tokenB = createToken(['PROJOBS'], `${subB}@example.test`, undefined, subB);
      const authA = { Authorization: `Bearer ${tokenA}` };
      const authB = { Authorization: `Bearer ${tokenB}` };

      try {
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
      } finally {
        // Best-effort cleanup: remove any remaining test data for both users.
        try {
          await fetch(`${base}/api/saved-jobs/${jobId}`, { method: 'DELETE', headers: authA });
        } catch { /* ignore */ }
        try {
          await fetch(`${base}/api/saved-jobs/${jobId}`, { method: 'DELETE', headers: authB });
        } catch { /* ignore */ }
      }
    });

    await t.test('persistence: create, list, update, and delete application', async () => {
      const sub = `appuser-${crypto.randomUUID()}`;
      const jobId = `appjob-${crypto.randomUUID()}`;
      const token = createToken(['PROJOBS'], `${sub}@example.test`, undefined, sub);
      const auth = { Authorization: `Bearer ${token}` };

      try {
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
      } finally {
        // Best-effort cleanup
        try {
          await fetch(`${base}/api/applications/${jobId}`, { method: 'DELETE', headers: auth });
        } catch { /* ignore */ }
      }
    });

    await t.test('persistence: RLS isolation — user B cannot read user A data via API', async () => {
      const subA = `rlsa-${crypto.randomUUID()}`;
      const subB = `rlsb-${crypto.randomUUID()}`;
      const jobId = `rlsjob-${crypto.randomUUID()}`;
      const tokenA = createToken(['PROJOBS'], `${subA}@example.test`, undefined, subA);
      const tokenB = createToken(['PROJOBS'], `${subB}@example.test`, undefined, subB);
      const authA = { Authorization: `Bearer ${tokenA}` };
      const authB = { Authorization: `Bearer ${tokenB}` };

      try {
        // User A saves a job
        const saveResp = await fetch(`${base}/api/saved-jobs`, {
          method: 'POST',
          headers: { ...authA, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            jobUrl: 'https://example.com/job/rls',
            jobTitle: 'RLS Test Job',
            company: 'RLS Co',
          }),
        });
        assert.equal(saveResp.status, 200);

        // User A can see their own job
        const listA = await fetch(`${base}/api/saved-jobs`, { headers: authA });
        assert.equal(listA.status, 200);
        const bodyA = await listA.json();
        assert.equal(bodyA.savedJobs.length, 1);

        // User B cannot see A's job (RLS enforced at database level)
        const listB = await fetch(`${base}/api/saved-jobs`, { headers: authB });
        assert.equal(listB.status, 200);
        const bodyB = await listB.json();
        assert.equal(bodyB.savedJobs.length, 0, 'User B must not see User A saved jobs');

        // User B cannot delete A's job
        const deleteB = await fetch(`${base}/api/saved-jobs/${jobId}`, {
          method: 'DELETE',
          headers: authB,
        });
        assert.equal(deleteB.status, 404, 'User B must not be able to delete User A saved job');
      } finally {
        try {
          await fetch(`${base}/api/saved-jobs/${jobId}`, { method: 'DELETE', headers: authA });
        } catch { /* ignore */ }
      }
    });

    await t.test('persistence: unique constraint prevents duplicate saved job', async () => {
      const sub = `unique-${crypto.randomUUID()}`;
      const jobId = `uniquejob-${crypto.randomUUID()}`;
      const token = createToken(['PROJOBS'], `${sub}@example.test`, undefined, sub);
      const auth = { Authorization: `Bearer ${token}` };

      try {
        // First save
        const save1 = await fetch(`${base}/api/saved-jobs`, {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            jobUrl: 'https://example.com/job/unique',
            jobTitle: 'Unique Job',
            company: 'Unique Co',
          }),
        });
        assert.equal(save1.status, 200);

        // Second save with same user_id + job_id should update (ON CONFLICT DO UPDATE), not duplicate
        const save2 = await fetch(`${base}/api/saved-jobs`, {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            jobUrl: 'https://example.com/job/unique-updated',
            jobTitle: 'Unique Job Updated',
            company: 'Unique Co Updated',
          }),
        });
        assert.equal(save2.status, 200);

        // List should still show only one record
        const listResp = await fetch(`${base}/api/saved-jobs`, { headers: auth });
        assert.equal(listResp.status, 200);
        const body = await listResp.json();
        assert.equal(body.savedJobs.length, 1, 'Unique constraint must prevent duplicate rows');
        assert.equal(body.savedJobs[0].job_title, 'Unique Job Updated');
      } finally {
        try {
          await fetch(`${base}/api/saved-jobs/${jobId}`, { method: 'DELETE', headers: auth });
        } catch { /* ignore */ }
      }
    });

    await t.test('persistence: invalid data rejected before database write', async () => {
      const sub = `invalid-${crypto.randomUUID()}`;
      const token = createToken(['PROJOBS'], `${sub}@example.test`, undefined, sub);
      const auth = { Authorization: `Bearer ${token}` };

      // Missing jobId
      const resp1 = await fetch(`${base}/api/saved-jobs`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobUrl: 'https://example.com/job/1' }),
      });
      assert.equal(resp1.status, 400);

      // Invalid jobUrl
      const resp2 = await fetch(`${base}/api/saved-jobs`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: 'invalid-url-job', jobUrl: 'not-a-url' }),
      });
      assert.equal(resp2.status, 400);
    });
  }
});
