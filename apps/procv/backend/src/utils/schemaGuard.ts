import prisma from '../prismaClient';
import { logger } from './logger';

/**
 * The ProCV database contains product data only. Identity tables must never be
 * recreated here: credentials, verification and session state belong to ProIdentity.
 * The deploy migration creates the local, non-secret identity reference table.
 */
export async function ensureSchemaCompatibility(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ identity_account_exists: boolean }>>`
    SELECT to_regclass('public."IdentityAccount"') IS NOT NULL AS identity_account_exists
  `;
  if (!rows[0]?.identity_account_exists) {
    throw new Error(
      'ProCV database migration missing: public.IdentityAccount must be created before serving authenticated requests.',
    );
  }

  logger.info('ProCV schema readiness check completed');
}
