import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkLifecycleAction, parseDeletionRequest, DELETE_PERMISSION, OWNER_PERMISSION } from '../../src/services/userLifecycle';
import { configuredModules, eraseUserModuleData, ModuleErasureError, summarizeUsers, type ModuleEndpoint } from '../../src/services/moduleData';
import { buildUserFilter } from '../../src/controllers/adminController';

const base = { actorId: 'admin', targetId: 'user', targetIsOwner: false, activeOwnerCount: 1 };
const ADMIN = ['identity.users.manage'];
const OWNER = ['identity.users.manage', DELETE_PERMISSION, OWNER_PERMISSION];

test('only owners delete accounts; admins may suspend', () => {
  assert.equal(checkLifecycleAction({ ...base, action: 'delete', actorPermissions: ADMIN }).ok, false);
  assert.deepEqual(checkLifecycleAction({ ...base, action: 'delete', actorPermissions: OWNER }), { ok: true });
  assert.deepEqual(checkLifecycleAction({ ...base, action: 'suspend', actorPermissions: ADMIN }), { ok: true });
});

test('nobody suspends or deletes themselves', () => {
  const decision = checkLifecycleAction({ ...base, targetId: 'admin', action: 'suspend', actorPermissions: OWNER });
  assert.equal(decision.ok, false);
  assert.equal(!decision.ok && decision.code, 'self_action');
});

test('owners are protected and the last active owner is kept', () => {
  const byAdmin = checkLifecycleAction({ ...base, targetIsOwner: true, activeOwnerCount: 2, action: 'suspend', actorPermissions: ADMIN });
  assert.equal(!byAdmin.ok && byAdmin.code, 'owner_protected');
  const lastOwner = checkLifecycleAction({ ...base, targetIsOwner: true, activeOwnerCount: 1, action: 'delete', actorPermissions: OWNER });
  assert.equal(!lastOwner.ok && lastOwner.code, 'last_owner');
  assert.deepEqual(checkLifecycleAction({ ...base, targetIsOwner: true, activeOwnerCount: 2, action: 'delete', actorPermissions: OWNER }), { ok: true });
});

test('deletion request: now, or a 1-90 day schedule', () => {
  assert.deepEqual(parseDeletionRequest({ mode: 'now' }), { mode: 'now' });
  assert.deepEqual(parseDeletionRequest({ mode: 'scheduled', days: 30 }), { mode: 'scheduled', days: 30 });
  assert.ok('error' in parseDeletionRequest({ mode: 'scheduled', days: 0 }));
  assert.ok('error' in parseDeletionRequest({ mode: 'scheduled', days: 91 }));
  assert.ok('error' in parseDeletionRequest({ mode: 'later' }));
});

const modules: ModuleEndpoint[] = [
  { key: 'procv', baseUrl: 'https://procv.test/api/internal', token: 't1' },
  { key: 'projobs', baseUrl: 'https://projobs.test/internal', token: 't2' },
];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('modules are configured only with both URL and token', () => {
  assert.deepEqual(configuredModules({ PROCV_BACKEND_URL: 'https://a/', PROCV_INTERNAL_TOKEN: 'x', PROJOBS_API_URL: 'https://b' }).map((m) => m.key), ['procv']);
});

test('content summary merges modules and marks unreachable ones as null', async () => {
  const fetchImpl = (async (url: string, init: RequestInit) => {
    assert.match(String((init.headers as Record<string, string>).Authorization), /^Bearer t[12]$/);
    if (url.startsWith('https://procv.test')) return json({ users: { u1: { cvs: 3 } } });
    throw new Error('down');
  }) as unknown as typeof fetch;
  const summary = await summarizeUsers(['u1', 'u2'], modules, fetchImpl);
  assert.deepEqual(summary.u1, { procv: { cvs: 3 }, projobs: null });
  assert.deepEqual(summary.u2, { procv: {}, projobs: null });
});

test('erasure fails closed when a module does not confirm', async () => {
  const calls: string[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push(`${init.method} ${url}`);
    return url.startsWith('https://procv.test') ? json({ deleted: { cvs: 2 } }) : json({ message: 'boom' }, 500);
  }) as unknown as typeof fetch;
  await assert.rejects(eraseUserModuleData('u1', modules, fetchImpl), (error) => error instanceof ModuleErasureError && error.module === 'projobs');
  assert.deepEqual(calls, ['DELETE https://procv.test/api/internal/users/u1', 'DELETE https://projobs.test/internal/users/u1']);
});

test('user directory filters combine search, status, module and role', () => {
  const where = buildUserFilter({ search: 'ana', status: 'suspended', module: 'PROCV', role: 'none' });
  const and = (where as { AND: unknown[] }).AND;
  assert.equal(and.length, 4);
  assert.deepEqual(and[1], { isActive: false, deletionScheduledAt: null });
  assert.deepEqual(buildUserFilter({ status: 'bogus', module: 'NOPE' }), {});
});
