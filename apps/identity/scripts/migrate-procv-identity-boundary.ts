import { PrismaClient } from '@prisma/client';

/**
 * Cut over ProCV ownership from legacy ProCV.User IDs to ProIdentity.User IDs.
 *
 * DATABASE_URL       -> ProIdentity database (authoritative identity)
 * PROCV_DATABASE_URL -> ProCV database (product data)
 *
 * Run with --prepare --dry-run first. Pass --apply to execute the selected phase.
 * Prepare creates the minimal local IdentityAccount reference, remaps CV owners
 * by normalized email across both databases, and repairs the existing AuditLog
 * schema. Finalize removes only the obsolete local credential/session tables.
 * No CV, CVVersion, CVAtsAnalysis, PlatformSetting, or audit history is deleted.
 */

interface LegacyUser {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IdentityUser {
  id: string;
  email: string;
}

interface CVOwner {
  userId: string;
  cvCount: number;
}

const apply = process.argv.includes('--apply');
const prepare = process.argv.includes('--prepare');
const finalize = process.argv.includes('--finalize');
const identityPrisma = new PrismaClient();
const procvPrisma = new PrismaClient({
  datasourceUrl: process.env.PROCV_DATABASE_URL,
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await procvPrisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    'SELECT to_regclass($1) IS NOT NULL AS exists',
    `public."${tableName}"`,
  );
  return Boolean(rows[0]?.exists);
}

type RawSqlExecutor = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: any[]): Promise<number>;
};

async function tableColumns(
  db: RawSqlExecutor,
  tableName: string,
): Promise<Set<string>> {
  const rows = await db.$queryRawUnsafe<Array<{ column_name: string }>>(
    'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
    'public',
    tableName,
  );
  return new Set(rows.map((row) => row.column_name));
}

async function repairAuditLogSchema(tx: RawSqlExecutor): Promise<void> {
  const hasAuditLog = await tableExists('AuditLog');
  if (!hasAuditLog) throw new Error('ProCV table AuditLog is missing; refusing schema cutover.');

  await tx.$executeRawUnsafe(`
    ALTER TABLE public."AuditLog"
      ADD COLUMN IF NOT EXISTS "adminId" TEXT,
      ADD COLUMN IF NOT EXISTS "adminEmail" TEXT,
      ADD COLUMN IF NOT EXISTS "resource" TEXT
  `);

  const columns = await tableColumns(tx, 'AuditLog');
  const adminIdFallback = columns.has('userId')
    ? `COALESCE(NULLIF("adminId", ''), NULLIF("userId", ''), 'system')`
    : `COALESCE(NULLIF("adminId", ''), 'system')`;
  const resourceFallback = columns.has('resourceType')
    ? `COALESCE(NULLIF("resource", ''), NULLIF("resourceType", ''), 'legacy')`
    : `COALESCE(NULLIF("resource", ''), 'legacy')`;

  await tx.$executeRawUnsafe(`
    UPDATE public."AuditLog"
    SET "adminId" = ${adminIdFallback},
        "adminEmail" = COALESCE(NULLIF("adminEmail", ''), 'system@procv.local'),
        "resource" = ${resourceFallback}
  `);
  await tx.$executeRawUnsafe(`
    ALTER TABLE public."AuditLog"
      ALTER COLUMN "adminId" SET NOT NULL,
      ALTER COLUMN "adminEmail" SET NOT NULL,
      ALTER COLUMN "resource" SET NOT NULL
  `);

  if (columns.has('userId')) {
    await tx.$executeRawUnsafe('ALTER TABLE public."AuditLog" DROP COLUMN "userId"');
  }
  if (columns.has('resourceType')) {
    await tx.$executeRawUnsafe('ALTER TABLE public."AuditLog" DROP COLUMN "resourceType"');
  }
  await tx.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "AuditLog_adminId_idx" ON public."AuditLog" ("adminId")',
  );
}

async function readCutoverPlan() {
  if (!(await tableExists('CV'))) throw new Error('ProCV table CV is missing; refusing cutover.');

  const hasLegacyUserTable = await tableExists('User');
  const identityUsers = await identityPrisma.user.findMany({
    select: { id: true, email: true },
  });
  const identityByEmail = new Map<string, IdentityUser>();
  const identityIds = new Set<string>();
  for (const user of identityUsers) {
    const key = normalizeEmail(user.email);
    if (identityByEmail.has(key)) {
      throw new Error('Duplicate normalized emails were found in ProIdentity; refusing automatic mapping.');
    }
    identityByEmail.set(key, user);
    identityIds.add(user.id);
  }

  const legacyUsers = hasLegacyUserTable
    ? await procvPrisma.$queryRawUnsafe<LegacyUser[]>(
        'SELECT "id", "email", "createdAt", "updatedAt" FROM public."User" ORDER BY "id"',
      )
    : [];

  const mapping = new Map<string, { identity: IdentityUser; legacy: LegacyUser }>();
  const unmapped: string[] = [];
  for (const legacy of legacyUsers) {
    const identity = identityByEmail.get(normalizeEmail(legacy.email));
    if (!identity) {
      unmapped.push(legacy.id);
      continue;
    }
    mapping.set(legacy.id, { identity, legacy });
  }
  if (unmapped.length > 0) {
    throw new Error(
      `${unmapped.length} legacy ProCV account(s) have no normalized-email match in ProIdentity. No data was changed; reconcile those accounts first.`,
    );
  }

  const cvOwners = await procvPrisma.$queryRawUnsafe<CVOwner[]>(
    'SELECT "userId", COUNT(*)::int AS "cvCount" FROM public."CV" GROUP BY "userId" ORDER BY "userId"',
  );
  const legacyIds = new Set(legacyUsers.map((user) => user.id));
  const unmatchedOwners = cvOwners.filter(
    (owner) => !legacyIds.has(owner.userId) && !identityIds.has(owner.userId),
  );
  if (unmatchedOwners.length > 0) {
    throw new Error(
      `${unmatchedOwners.length} CV owner reference(s) do not match either a legacy ProCV account or a current ProIdentity subject. No data was changed.`,
    );
  }

  const connectionTestExists = await tableExists('_conn_test');
  let connectionTestRows = 0;
  if (connectionTestExists) {
    const rows = await procvPrisma.$queryRawUnsafe<Array<{ count: number }>>(
      'SELECT COUNT(*)::int AS count FROM public."_conn_test"',
    );
    connectionTestRows = Number(rows[0]?.count ?? 0);
  }

  return {
    hasLegacyUserTable,
    legacyUsers,
    identityUsers,
    identityIds,
    mapping,
    cvOwners,
    connectionTestExists,
    connectionTestRows,
  };
}

async function prepare() {
  const plan = await readCutoverPlan();
  const ownerCount = plan.cvOwners.reduce((total, item) => total + Number(item.cvCount), 0);
  const remaps = [...plan.mapping.values()].filter(({ identity, legacy }) => identity.id !== legacy.id).length;

  console.log('[ProCV Identity cutover] Phase: prepare');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Legacy local user rows: ${plan.legacyUsers.length}`);
  console.log(`Matched central Identity accounts: ${plan.mapping.size}`);
  console.log(`CV rows to preserve: ${ownerCount}`);
  console.log(`Legacy owner IDs that must be remapped: ${remaps}`);
  console.log(`Orphaned or unrecognized CV owners: 0`);
  console.log(`_conn_test rows: ${plan.connectionTestRows}`);
  if (!apply) {
    console.log('Dry run only. Re-run with --prepare --apply after reviewing this summary.');
    return;
  }

  await procvPrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public."IdentityAccount" (
        "id" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "IdentityAccount_pkey" PRIMARY KEY ("id")
      )
    `);
    await tx.$executeRawUnsafe(
      'ALTER TABLE public."CV" DROP CONSTRAINT IF EXISTS "CV_userId_fkey"',
    );

    for (const { identity, legacy } of plan.mapping.values()) {
      await tx.$executeRawUnsafe(
        `INSERT INTO public."IdentityAccount" ("id", "createdAt", "updatedAt")
         VALUES ($1, $2, $3)
         ON CONFLICT ("id") DO UPDATE
         SET "createdAt" = LEAST(public."IdentityAccount"."createdAt", EXCLUDED."createdAt"),
             "updatedAt" = GREATEST(public."IdentityAccount"."updatedAt", EXCLUDED."updatedAt")`,
        identity.id,
        legacy.createdAt,
        legacy.updatedAt,
      );
      if (identity.id !== legacy.id) {
        await tx.$executeRawUnsafe(
          'UPDATE public."CV" SET "userId" = $1 WHERE "userId" = $2',
          identity.id,
          legacy.id,
        );
        if (await tableExists('PlatformSetting')) {
          await tx.$executeRawUnsafe(
            'UPDATE public."PlatformSetting" SET "updatedBy" = $1 WHERE "updatedBy" = $2',
            identity.id,
            legacy.id,
          );
        }
      }
    }

    // Accounts that own no CV and do not represent a current Identity subject
    // are only legacy aliases. Remove them after their CVs have been remapped.
    for (const { identity, legacy } of plan.mapping.values()) {
      if (identity.id === legacy.id || plan.identityIds.has(legacy.id)) continue;
      await tx.$executeRawUnsafe(
        'DELETE FROM public."IdentityAccount" WHERE "id" = $1 AND NOT EXISTS (SELECT 1 FROM public."CV" WHERE "userId" = $1)',
        legacy.id,
      );
    }

    await tx.$executeRawUnsafe(
      'ALTER TABLE public."CV" ADD CONSTRAINT "CV_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."IdentityAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await tx.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "CV_userId_idx" ON public."CV" ("userId")',
    );
    await repairAuditLogSchema(tx);

    // Keep audit attribution consistent when a legacy ProCV subject was
    // replaced by its canonical ProIdentity subject ID.
    for (const { identity, legacy } of plan.mapping.values()) {
      if (identity.id === legacy.id) continue;
      await tx.$executeRawUnsafe(
        'UPDATE public."AuditLog" SET "adminId" = $1, "adminEmail" = $2 WHERE "adminId" = $3 OR ("adminId" IS NULL AND "resourceId" = $3)',
        identity.id,
        identity.email,
        legacy.id,
      );
    }
  });

  console.log('Prepare phase completed. Legacy auth tables remain intact until the new ProCV code is deployed and verified.');
}

async function finalize() {
  const plan = await readCutoverPlan();
  console.log('[ProCV Identity cutover] Phase: finalize');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);

  if (plan.connectionTestRows > 0) {
    throw new Error(
      `public."_conn_test" contains ${plan.connectionTestRows} row(s); inspect and archive that test data before finalizing.`,
    );
  }

  const identityAccountExists = await tableExists('IdentityAccount');
  if (!identityAccountExists) {
    throw new Error('IdentityAccount does not exist. Run and verify the prepare phase first.');
  }

  const orphanRows = await procvPrisma.$queryRawUnsafe<Array<{ count: number }>>(`
    SELECT COUNT(*)::int AS count
    FROM public."CV" cv
    LEFT JOIN public."IdentityAccount" ia ON ia."id" = cv."userId"
    WHERE ia."id" IS NULL
  `);
  if (Number(orphanRows[0]?.count ?? 0) > 0) {
    throw new Error('CV rows reference missing IdentityAccount rows; refusing to drop legacy auth tables.');
  }

  const auditColumns = await tableColumns(procvPrisma, 'AuditLog');
  for (const required of ['adminId', 'adminEmail', 'resource']) {
    if (!auditColumns.has(required)) {
      throw new Error(`AuditLog.${required} is missing; apply the audit schema repair before finalizing.`);
    }
  }

  if (!apply) {
    console.log('Ready to remove ProCV-local User, Session and email-token tables.');
    console.log('All CV owners point to IdentityAccount; CV, version, ATS and platform settings rows will be retained.');
    console.log('Dry run only. Re-run with --finalize --apply after the new app version is healthy.');
    return;
  }

  await procvPrisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('DROP TABLE IF EXISTS public."EmailVerificationToken"');
    await tx.$executeRawUnsafe('DROP TABLE IF EXISTS public."PasswordResetToken"');
    await tx.$executeRawUnsafe('DROP TABLE IF EXISTS public."Session"');

    if (plan.connectionTestExists) {
      await tx.$executeRawUnsafe('DROP TABLE public."_conn_test"');
    }

    const legacyUserExists = await tableExists('User');
    if (legacyUserExists) {
      const dependencies = await tx.$queryRawUnsafe<Array<{ count: number }>>( `
        SELECT COUNT(*)::int AS count
        FROM pg_constraint
        WHERE contype = 'f'
          AND confrelid = to_regclass('public."User"')
      `);
      if (Number(dependencies[0]?.count ?? 0) > 0) {
        throw new Error('Other foreign keys still reference public.User; refusing to remove the legacy table.');
      }
      await tx.$executeRawUnsafe('DROP TABLE public."User"');
    }
  });

  console.log('Finalize phase completed. ProCV no longer has local credential/session tables.');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must point to ProIdentity.');
  }
  if (!process.env.PROCV_DATABASE_URL) {
    throw new Error('PROCV_DATABASE_URL must point to the ProCV database (use a direct connection for DDL).');
  }
  if (prepare === finalize) {
    throw new Error('Choose exactly one phase: --prepare or --finalize.');
  }

  if (prepare) await prepare();
  else await finalize();
}

main()
  .catch((error: unknown) => {
    console.error('[ProCV Identity cutover] Failed:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([identityPrisma.$disconnect(), procvPrisma.$disconnect()]);
  });
