import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../../src/prismaClient';
import { ensureDefaultModuleAccess } from '../../src/services/moduleAccessService';

type Grant = {
  userId: string;
  module: string;
  active: boolean;
  expiresAt: Date | null;
};

test('login/refresh never reactivate revoked or expired module grants', async () => {
  const now = new Date();
  const grants: Grant[] = [
    { userId: 'user-1', module: 'PROCV', active: false, expiresAt: null },
    { userId: 'user-1', module: 'PROJOBS', active: true, expiresAt: new Date(now.getTime() - 60_000) },
  ];
  const upserts: Array<Record<string, any>> = [];
  let findManyArgs: Record<string, any> | undefined;

  const fakeClient = {
    moduleAccess: {
      upsert: async (args: Record<string, any>) => {
        upserts.push(args);
        const existing = grants.find(
          (grant) => grant.userId === args.where.userId_module.userId &&
            grant.module === args.where.userId_module.module,
        );
        if (!existing) {
          grants.push({
            userId: args.create.userId,
            module: args.create.module,
            active: args.create.active,
            expiresAt: null,
          });
        }
        // Existing rows deliberately remain untouched, matching Prisma upsert semantics.
        return existing ?? grants[grants.length - 1];
      },
      findMany: async (args: Record<string, any>) => {
        findManyArgs = args;
        const cutoff = args.where.OR[1].expiresAt.gt as Date;
        return grants
          .filter((grant) =>
            grant.userId === args.where.userId &&
            args.where.module.in.includes(grant.module) &&
            grant.active &&
            (grant.expiresAt === null || grant.expiresAt > cutoff),
          )
          .map((grant) => ({ module: grant.module }));
      },
    },
  } as unknown as typeof prisma;

  const modules = await ensureDefaultModuleAccess('user-1', 'admin', fakeClient);

  assert.equal(grants.find((grant) => grant.module === 'PROCV')?.active, false);
  assert.ok((grants.find((grant) => grant.module === 'PROJOBS')?.expiresAt ?? now) < now);
  assert.deepEqual(modules, []);
  assert.equal(upserts.length, 2);
  assert.ok(upserts.every((call) => Object.keys(call.update).length === 0));
  assert.equal(findManyArgs?.where.active, true);
  assert.deepEqual(findManyArgs?.where.module.in, ['PROCV', 'PROJOBS', 'PRORECRUIT']);
  assert.equal(findManyArgs?.where.OR.length, 2);
});

test('only active, unexpired supported grants are returned', async () => {
  const fakeClient = {
    moduleAccess: {
      upsert: async () => ({}),
      findMany: async () => [
        { module: 'PROCV' },
        { module: 'PROJOBS' },
        { module: 'PROSKILLS' },
      ],
    },
  } as unknown as typeof prisma;

  assert.deepEqual(
    await ensureDefaultModuleAccess('user-2', 'user', fakeClient),
    ['PROCV', 'PROJOBS'],
  );
});

test('PRORECRUIT is effective only through an explicit grant, never created by default', async () => {
  const upsertedModules: string[] = [];
  const fakeClient = {
    moduleAccess: {
      upsert: async (args: Record<string, any>) => {
        upsertedModules.push(args.create.module);
        return {};
      },
      findMany: async () => [{ module: 'PROJOBS' }, { module: 'PRORECRUIT' }],
    },
  } as unknown as typeof prisma;

  const modules = await ensureDefaultModuleAccess('recruiter-1', 'user', fakeClient);

  assert.deepEqual(upsertedModules, ['PROCV', 'PROJOBS']);
  assert.deepEqual(modules, ['PROJOBS', 'PRORECRUIT']);
});
