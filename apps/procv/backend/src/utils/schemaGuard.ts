import prisma from '../prismaClient';
import { logger } from './logger';

// ProCV stores CV business data only. Accounts, passwords, sessions, verification
// tokens and module entitlements belong to ProIdentity and are never recreated here.
const REQUIRED_BUSINESS_TABLES = ['CV', 'CVVersion', 'CVAtsAnalysis', 'AuditLog', 'PlatformSetting'];

export async function ensureSchemaCompatibility(): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY(${REQUIRED_BUSINESS_TABLES})
    `;
    const present = new Set(rows.map((row) => row.table_name));
    const missing = REQUIRED_BUSINESS_TABLES.filter((tableName) => !present.has(tableName));

    if (missing.length > 0) {
      logger.error('ProCV business schema is incomplete; apply Prisma migrations before serving CV requests', {
        missingTables: missing,
      });
      return;
    }

    logger.info('ProCV business schema check completed; no local authentication tables are managed by this service');
  } catch (error: unknown) {
    logger.error('ProCV schema check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
