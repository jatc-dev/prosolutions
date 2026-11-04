import { randomBytes, randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createDbContext } from '../src/dbContext';
import { writeAuditLog } from '../src/utils/auditLogger';

const runtimeUrl = process.env.PROCV_TEST_DATABASE_URL;
const runtimeAltUrl = process.env.PROCV_TEST_RUNTIME_URL;
const adminUrl = process.env.PROCV_TEST_ADMIN_ROLE_DATABASE_URL;
const operatorUrl = process.env.PROCV_TEST_OPERATOR_DATABASE_URL;
const suite = runtimeUrl && runtimeAltUrl && adminUrl && operatorUrl ? describe : describe.skip;

function assertIsolatedLocalDatabase(url: string, expectedUser?: string): URL {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, '').split('?')[0];
  if (
    !['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname) ||
    !/^procv_test(?:_[a-z0-9]+)?$/i.test(database)
  ) {
    throw new Error(
      'RLS integration tests require an isolated loopback database named procv_test[_suffix]',
    );
  }
  if (expectedUser && parsed.username !== expectedUser) {
    throw new Error(`RLS runtime tests must connect as ${expectedUser}`);
  }
  return parsed;
}

suite('PostgreSQL RLS integration (isolated local database only)', () => {
  const secret = randomBytes(32).toString('hex');
  let runtime: PrismaClient;
  let adminRuntime: PrismaClient;
  let operator: PrismaClient;
  let withUser: ReturnType<typeof createDbContext>['withUserContext'];
  let withAdmin: ReturnType<typeof createDbContext>['withAdminContext'];
  let withPublic: ReturnType<typeof createDbContext>['withPublicContext'];

  beforeAll(async () => {
    const runtimeParsed = assertIsolatedLocalDatabase(runtimeUrl!, 'procv_login');
    const runtimeAltParsed = assertIsolatedLocalDatabase(runtimeAltUrl!, 'procv_runtime');
    const adminParsed = assertIsolatedLocalDatabase(adminUrl!);
    if (adminParsed.username !== 'procv_admin_login') {
      throw new Error(
        'The administrative pool must connect as the separate procv_admin_login role',
      );
    }
    const operatorParsed = assertIsolatedLocalDatabase(operatorUrl!);
    if (
      runtimeParsed.host !== adminParsed.host ||
      runtimeParsed.port !== adminParsed.port ||
      runtimeAltParsed.host !== adminParsed.host ||
      runtimeAltParsed.port !== adminParsed.port ||
      operatorParsed.host !== adminParsed.host ||
      operatorParsed.port !== adminParsed.port
    ) {
      throw new Error(
        'Runtime and operator URLs must target the same isolated local PostgreSQL server',
      );
    }

    process.env.PROCV_RLS_CONTEXT_KEY = secret;
    operator = new PrismaClient({ datasources: { db: { url: operatorUrl! } } });
    adminRuntime = new PrismaClient({
      datasources: {
        db: { url: `${adminUrl!}${adminUrl!.includes('?') ? '&' : '?'}connection_limit=1` },
      },
    });
    runtime = new PrismaClient({
      datasources: {
        db: { url: `${runtimeUrl!}${runtimeUrl!.includes('?') ? '&' : '?'}connection_limit=1` },
      },
    });

    const roles = await operator.$queryRaw<
      Array<{
        rolname: string;
        rolsuper: boolean;
        rolbypassrls: boolean;
        rolreplication: boolean;
        rolcanlogin: boolean;
      }>
    >`
      SELECT rolname, rolsuper, rolbypassrls, rolreplication, rolcanlogin
      FROM pg_roles WHERE rolname IN ('procv_login','procv_runtime','procv_app','procv_admin_login','procv_admin_app')
    `;
    expect(roles).toHaveLength(5);
    for (const role of roles) {
      expect(role.rolsuper).toBe(false);
      expect(role.rolbypassrls).toBe(false);
      expect(role.rolreplication).toBe(false);
      if (['procv_app', 'procv_admin_app'].includes(role.rolname))
        expect(role.rolcanlogin).toBe(false);
    }
    const memberships = await operator.$queryRaw<
      Array<{
        login_is_admin_member: boolean;
        runtime_is_admin_member: boolean;
        admin_login_is_user_member: boolean;
      }>
    >`
      SELECT pg_has_role('procv_admin_login', 'procv_admin_app', 'MEMBER') AS login_is_admin_member,
        pg_has_role('procv_login', 'procv_admin_app', 'MEMBER') AS runtime_is_admin_member,
        pg_has_role('procv_admin_login', 'procv_app', 'MEMBER') AS admin_login_is_user_member
    `;
    expect(memberships[0]).toEqual({
      login_is_admin_member: true,
      runtime_is_admin_member: false,
      admin_login_is_user_member: false,
    });

    await operator.$executeRaw`TRUNCATE TABLE public."AuditLog", public."CVAtsAnalysis", public."CVVersion", public."CV", public."PlatformSetting" CASCADE`;
    await operator.$executeRaw`
      INSERT INTO procv_private.context_signing_keys (key_id, secret_hex)
      VALUES ('v1', ${secret})
      ON CONFLICT (key_id) DO UPDATE SET secret_hex = EXCLUDED.secret_hex
    `;
    const context = createDbContext(runtime, () => adminRuntime);
    withUser = context.withUserContext;
    withAdmin = context.withAdminContext;
    withPublic = context.withPublicContext;
  });

  afterAll(async () => {
    if (runtime) await runtime.$disconnect();
    if (adminRuntime) await adminRuntime.$disconnect();
    if (operator) await operator.$disconnect();
    delete process.env.PROCV_RLS_CONTEXT_KEY;
  });

  it('isolates CVs, versions, ATS and audit rows for two users; blocks forged admin GUC context', async () => {
    const cvA = await withUser('user-a', async tx => {
      const cv = await tx.cV.create({
        data: { userId: 'user-a', title: 'A', data: '{"owner":"a"}' },
      });
      await tx.cVVersion.create({ data: { cvId: cv.id, snapshot: '{"v":1}' } });
      await tx.cVAtsAnalysis.create({ data: { cvId: cv.id, analysis: '{"score":1}' } });
      await writeAuditLog(tx, {
        actorId: 'user-a',
        action: 'create',
        resourceType: 'cv',
        resourceId: cv.id,
      });
      return cv;
    });
    const cvB = await withUser('user-b', async tx => {
      const cv = await tx.cV.create({
        data: { userId: 'user-b', title: 'B', data: '{"owner":"b"}' },
      });
      await tx.cVVersion.create({ data: { cvId: cv.id, snapshot: '{"v":2}' } });
      await tx.cVAtsAnalysis.create({ data: { cvId: cv.id, analysis: '{"score":2}' } });
      await writeAuditLog(tx, {
        actorId: 'user-b',
        action: 'create',
        resourceType: 'cv',
        resourceId: cv.id,
      });
      return cv;
    });

    await withUser('user-a', async tx => {
      expect(await tx.cV.findMany()).toEqual([expect.objectContaining({ id: cvA.id })]);
      expect(await tx.cV.findFirst({ where: { id: cvB.id } })).toBeNull();
      expect(await tx.cVVersion.findMany({ where: { cvId: cvB.id } })).toHaveLength(0);
      expect(await tx.cVAtsAnalysis.findMany({ where: { cvId: cvB.id } })).toHaveLength(0);
      expect(await tx.auditLog.findMany()).toEqual([expect.objectContaining({ userId: 'user-a' })]);
      await expect(
        tx.cV.update({ where: { id: cvB.id }, data: { title: 'stolen' } }),
      ).rejects.toThrow();
      await expect(tx.cV.delete({ where: { id: cvB.id } })).rejects.toThrow();
      await expect(
        tx.cVVersion.create({ data: { cvId: cvB.id, snapshot: '{}' } }),
      ).rejects.toThrow();
      await expect(tx.cVAtsAnalysis.create({ data: { cvId: cvB.id } })).rejects.toThrow();
    });

    await withUser('user-b', async tx => {
      expect(await tx.cV.findMany()).toEqual([expect.objectContaining({ id: cvB.id })]);
      expect(await tx.cVVersion.findMany({ where: { cvId: cvA.id } })).toHaveLength(0);
      expect(await tx.cVAtsAnalysis.findMany({ where: { cvId: cvA.id } })).toHaveLength(0);
    });

    await withAdmin('admin-1', async tx => {
      expect(await tx.cV.count()).toBe(2);
      expect(await tx.cVVersion.count()).toBe(2);
      expect(await tx.cVAtsAnalysis.count()).toBe(2);
      expect(await tx.auditLog.count()).toBe(2);
    });

    // Any SQL session can set custom GUCs. An unsigned admin claim must still
    // resolve to no verified context and reveal no CV rows.
    const forged = JSON.stringify({
      aud: 'procv-rls',
      kid: 'v1',
      role: 'admin',
      sub: 'attacker',
      iat: 1,
      exp: 4102444800,
      jti: randomUUID(),
    });
    await runtime.$transaction(async tx => {
      await tx.$queryRaw`SELECT set_config('role', 'procv_app', true)`;
      await tx.$queryRaw`
        SELECT set_config('procv.context_payload', ${forged}, true),
          set_config('procv.context_signature', ${'0'.repeat(64)}, true)
      `;
      expect(
        await tx.$queryRaw<
          Array<{ claims: unknown }>
        >`SELECT procv_private.verified_context() AS claims`,
      ).toEqual([{ claims: null }]);
      expect(await tx.cV.count()).toBe(0);
    });
    await expect(
      runtime.$transaction(async tx => {
        await tx.$queryRaw`SELECT set_config('role', 'procv_admin_app', true)`;
      }),
    ).rejects.toThrow();
  });

  it('allows public settings only when isPublic and keeps private settings admin-only', async () => {
    await withAdmin('admin-1', async tx => {
      await tx.platformSetting.create({
        data: { key: 'public-test', value: 'ok', isPublic: true },
      });
      await tx.platformSetting.create({
        data: { key: 'private-test', value: 'secret', isPublic: false },
      });
    });
    await withUser('user-a', async tx => {
      expect(await tx.platformSetting.findMany()).toEqual([
        expect.objectContaining({ key: 'public-test' }),
      ]);
      expect(await tx.platformSetting.findUnique({ where: { key: 'private-test' } })).toBeNull();
    });
    await withPublic(async tx => {
      expect(await tx.platformSetting.findMany()).toEqual([
        expect.objectContaining({ key: 'public-test' }),
      ]);
    });
    await withAdmin('admin-1', async tx => expect(await tx.platformSetting.count()).toBe(2));
  });

  it('returns no protected rows without signed context and clears local context after rollback', async () => {
    await runtime.$transaction(async tx => {
      await tx.$queryRaw`SELECT set_config('role', 'procv_app', true)`;
      expect(await tx.cV.count()).toBe(0);
      expect(await tx.auditLog.count()).toBe(0);
      expect(await tx.platformSetting.findMany({ where: { isPublic: false } })).toHaveLength(0);
      expect(await tx.platformSetting.count({ where: { isPublic: true } })).toBe(1);
    });

    await expect(
      withUser('user-a', async tx => {
        expect(await tx.cV.count()).toBe(1);
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    const [session] = await runtime.$queryRaw<
      Array<{ current_user: string; role_setting: string; payload: string }>
    >`
      SELECT current_user::text, current_setting('role', true) AS role_setting,
        current_setting('procv.context_payload', true) AS payload
    `;
    expect(session.current_user).toBe('procv_login');
    expect(session.role_setting).not.toBe('procv_app');
    expect(session.payload).not.toBeTruthy();
    await withUser('user-b', async tx => expect(await tx.cV.count()).toBe(1));
  });

  it('rolls back setting mutations and bulk writes when audit insertion fails', async () => {
    await operator.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.procv_test_reject_audit() RETURNS trigger
      LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$
    `);
    await operator.$executeRawUnsafe(
      `CREATE TRIGGER procv_test_reject_audit BEFORE INSERT ON public."AuditLog" FOR EACH ROW EXECUTE FUNCTION public.procv_test_reject_audit()`,
    );
    try {
      await expect(
        withAdmin('admin-1', async tx => {
          await tx.platformSetting.upsert({
            where: { key: 'atomic-single' },
            update: { value: 'changed' },
            create: { key: 'atomic-single', value: 'changed' },
          });
          await writeAuditLog(tx, {
            actorId: 'admin-1',
            action: 'update',
            resourceType: 'setting',
            resourceId: 'atomic-single',
          });
        }),
      ).rejects.toThrow('synthetic audit failure');

      await expect(
        withAdmin('admin-1', async tx => {
          await tx.platformSetting.upsert({
            where: { key: 'atomic-bulk-a' },
            update: { value: 'a' },
            create: { key: 'atomic-bulk-a', value: 'a' },
          });
          await tx.platformSetting.upsert({
            where: { key: 'atomic-bulk-b' },
            update: { value: 'b' },
            create: { key: 'atomic-bulk-b', value: 'b' },
          });
          await writeAuditLog(tx, {
            actorId: 'admin-1',
            action: 'bulk_update',
            resourceType: 'setting',
          });
        }),
      ).rejects.toThrow('synthetic audit failure');
    } finally {
      await operator.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS procv_test_reject_audit ON public."AuditLog"',
      );
      await operator.$executeRawUnsafe('DROP FUNCTION IF EXISTS public.procv_test_reject_audit()');
    }

    await withAdmin('admin-1', async tx => {
      expect(await tx.platformSetting.findUnique({ where: { key: 'atomic-single' } })).toBeNull();
      expect(
        await tx.platformSetting.findMany({ where: { key: { startsWith: 'atomic-bulk-' } } }),
      ).toHaveLength(0);
    });
  });

  it('cascades CV deletion to versions and ATS analyses and verifies both login roles', async () => {
    const cv = await withUser('delete-owner', async tx => {
      const created = await tx.cV.create({
        data: { userId: 'delete-owner', title: 'Delete cascade' },
      });
      await tx.cVVersion.create({ data: { cvId: created.id } });
      await tx.cVAtsAnalysis.create({ data: { cvId: created.id } });
      return created;
    });
    await withUser('delete-owner', tx => tx.cV.delete({ where: { id: cv.id } }));
    await withAdmin('admin-1', async tx => {
      expect(await tx.cVVersion.count({ where: { cvId: cv.id } })).toBe(0);
      expect(await tx.cVAtsAnalysis.count({ where: { cvId: cv.id } })).toBe(0);
    });

    const runtimeClient = new PrismaClient({
      datasources: { db: { url: runtimeAltUrl! } },
    });
    try {
      const runtimeContext = createDbContext(runtimeClient);
      await expect(runtimeContext.withUserContext('user-a', tx => tx.cV.count())).resolves.toBe(1);
    } finally {
      await runtimeClient.$disconnect();
    }
  });
});
