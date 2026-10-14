import prisma from '../prismaClient';
import { logger } from './logger';

interface ColumnRequirement {
  table: string;
  column: string;
  ddl: string;
}

interface TableRequirement {
  name: string;
  statements: string[];
}

// Additive schema changes that production databases can be missing because
// `prisma migrate deploy` cannot run through the Supabase PgBouncer pooler.
// Every statement below is idempotent, so it is safe to run on every boot.
const REQUIRED_COLUMNS: ColumnRequirement[] = [
  {
    table: 'User',
    column: 'emailVerified',
    ddl: 'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false',
  },
  {
    table: 'Session',
    column: 'lastAccessedAt',
    ddl: 'ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
  },
  {
    table: 'Session',
    column: 'revokedAt',
    ddl: 'ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3)',
  },
];

const REQUIRED_TABLES: TableRequirement[] = [
  {
    name: 'EmailVerificationToken',
    statements: [
      `CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
)`,
      'CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash")',
      'CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId")',
      'CREATE INDEX IF NOT EXISTS "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt")',
      `DO $$ BEGIN
  ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    ],
  },
  {
    name: 'PasswordResetToken',
    statements: [
      `CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
)`,
      'CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash")',
      'CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId")',
      'CREATE INDEX IF NOT EXISTS "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt")',
      `DO $$ BEGIN
  ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    ],
  },
];

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = ${table}
      AND column_name = ${column}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name = ${table}
  `;
  return Number(rows[0]?.count ?? 0) > 0;
}

/**
 * Ensures the database contains the additive schema changes the application
 * depends on. Migrations remain the source of truth (run `prisma migrate
 * deploy` against the direct Supabase connection on every release); this guard
 * exists so a missed migration surfaces as a boot-time repair instead of
 * runtime 500s on login/register.
 *
 * Never throws: a database outage must not prevent the HTTP server from
 * starting (health checks still report database status).
 */
export async function ensureSchemaCompatibility(): Promise<void> {
  try {
    for (const requirement of REQUIRED_COLUMNS) {
      if (await columnExists(requirement.table, requirement.column)) {
        continue;
      }
      logger.warn(
        `Schema drift detected: ${requirement.table}.${requirement.column} is missing. Applying additive fix.`,
      );
      await prisma.$executeRawUnsafe(requirement.ddl);
      logger.info(`Applied additive schema fix: ${requirement.table}.${requirement.column}`);
    }

    for (const requirement of REQUIRED_TABLES) {
      if (await tableExists(requirement.name)) {
        continue;
      }
      logger.warn(`Schema drift detected: table ${requirement.name} is missing. Creating it.`);
      for (const statement of requirement.statements) {
        await prisma.$executeRawUnsafe(statement);
      }
      logger.info(`Created missing table: ${requirement.name}`);
    }

    logger.info('Schema compatibility check completed');
  } catch (error: unknown) {
    logger.error('Schema compatibility check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
