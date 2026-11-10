import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { Module } from '@prisma/client';
import prisma from '../../src/prismaClient';
import { requirePermission, type IdentityRequest } from '../../src/middleware/auth';

const originalFindMany = prisma.userAdminRole.findMany;

after(() => {
  (prisma.userAdminRole as any).findMany = originalFindMany;
});

function harness(userId?: string) {
  const response: { statusCode: number; body?: unknown } = { statusCode: 200 };
  const res: any = {
    status(code: number) { response.statusCode = code; return this; },
    json(body: unknown) { response.body = body; return this; },
  };
  let nextCalled = false;
  let nextError: unknown;
  const req = {
    userId,
    email: 'qa-admin@example.invalid',
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Node test' },
  } as unknown as IdentityRequest;
  const next = (error?: unknown) => { nextCalled = true; nextError = error; };
  return { req, res, response, next, wasNextCalled: () => nextCalled, nextError: () => nextError };
}

beforeEach(() => {
  (prisma.userAdminRole as any).findMany = async () => [];
});

test('rejects unauthenticated requests before checking permissions', async () => {
  const h = harness();
  await requirePermission('identity.users.read')(h.req, h.res, h.next as any);
  assert.equal(h.response.statusCode, 401);
  assert.equal(h.wasNextCalled(), false);
});

test('denies a user who lacks the requested capability', async () => {
  const h = harness('user-1');
  await requirePermission('procv.cvs.support_access', Module.PROCV)(h.req, h.res, h.next as any);
  assert.equal(h.response.statusCode, 403);
  assert.deepEqual(h.response.body, {
    message: 'Insufficient permission',
    requiredPermission: 'procv.cvs.support_access',
  });
  assert.equal(h.wasNextCalled(), false);
});

test('allows only the requested capability in its module scope', async () => {
  (prisma.userAdminRole as any).findMany = async () => [{
    role: { permissions: [{ permission: { key: 'procv.templates.manage' } }] },
  }];
  const h = harness('module-admin-1');
  await requirePermission('procv.templates.manage', Module.PROCV)(h.req, h.res, h.next as any);
  assert.equal(h.response.statusCode, 200);
  assert.equal(h.wasNextCalled(), true);
});

test('forwards authorization lookup failures to the error handler', async () => {
  const failure = new Error('database unavailable');
  (prisma.userAdminRole as any).findMany = async () => { throw failure; };
  const h = harness('user-1');
  await requirePermission('identity.users.read')(h.req, h.res, h.next as any);
  assert.equal(h.response.statusCode, 200);
  assert.equal(h.nextError(), failure);
});
