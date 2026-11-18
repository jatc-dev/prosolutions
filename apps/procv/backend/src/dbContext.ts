import { createHmac, randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import prisma from './prismaClient';

export type ProCVTransaction = Prisma.TransactionClient;
type ContextOperation<T> = (tx: ProCVTransaction) => Promise<T>;
type TransactionRunnerClient = {
  $transaction<T>(operation: (tx: ProCVTransaction) => Promise<T>): Promise<T>;
};
type ContextRole = 'user' | 'public';

interface SignedContext {
  iss: 'procv-backend';
  aud: 'procv-rls';
  kid: string;
  role: ContextRole;
  sub: string | null;
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Key id of PROCV_RLS_CONTEXT_KEY in procv_private.context_signing_keys.
 * Zero-downtime rotation: insert the new key under a new id (e.g. v2), then
 * deploy PROCV_RLS_CONTEXT_KEY + PROCV_RLS_CONTEXT_KID=v2, then delete v1.
 */
export function signingKeyId(): string {
  const kid = (process.env.PROCV_RLS_CONTEXT_KID || 'v1').trim();
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(kid)) {
    throw new Error('PROCV_RLS_CONTEXT_KID must be 1-32 safe characters');
  }
  return kid;
}

function signingKey(): Buffer {
  const key = process.env.PROCV_RLS_CONTEXT_KEY;
  if (!key || !/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error('PROCV_RLS_CONTEXT_KEY must be configured as 32 bytes of hex');
  }
  return Buffer.from(key, 'hex');
}

function encodeContext(
  role: ContextRole,
  userId: string | null,
): { payload: string; signature: string } {
  const now = Math.floor(Date.now() / 1000);
  const context: SignedContext = {
    iss: 'procv-backend',
    aud: 'procv-rls',
    kid: signingKeyId(),
    role,
    sub: userId,
    iat: now,
    // Keep the signed context within the database verifier's 120-second maximum.
    exp: now + 60,
    jti: randomUUID(),
  };
  const payload = JSON.stringify(context);
  const signature = createHmac('sha256', signingKey()).update(payload, 'utf8').digest('hex');
  return { payload, signature };
}

export function createDbContext(
  client: TransactionRunnerClient,
  adminClientProvider?: () => TransactionRunnerClient,
) {
  async function withContext<T>(
    role: ContextRole,
    userId: string | null,
    operation: ContextOperation<T>,
    databaseClient: TransactionRunnerClient,
    databaseRole: 'procv_app' | 'procv_admin_app',
  ): Promise<T> {
    if (role === 'public' ? userId !== null : typeof userId !== 'string' || !userId.trim()) {
      throw new Error(
        role === 'public'
          ? 'Public context cannot carry a user ID'
          : 'A non-empty ProIdentity user ID is required',
      );
    }

    // All state is transaction-local. The signature makes freely-settable GUCs
    // untrusted; PostgreSQL validates them against its private key table in RLS.
    const { payload, signature } = encodeContext(role, userId);
    return databaseClient.$transaction(async tx => {
      await tx.$queryRaw`SELECT set_config('role', ${databaseRole}, true)`;
      await tx.$queryRaw`
        SELECT
          set_config('procv.context_payload', ${payload}, true),
          set_config('procv.context_signature', ${signature}, true)
      `;
      const [current] = await tx.$queryRaw<Array<{ current_role: string }>>`
        SELECT current_user::text AS current_role
      `;
      if (current?.current_role !== databaseRole) {
        throw new Error(`Unable to assume the restricted ${databaseRole} database role`);
      }
      const [verified] = await tx.$queryRaw<
        Array<{ claims: { role?: string; sub?: string | null } | null }>
      >`SELECT procv_private.verified_context() AS claims`;
      if (
        !verified?.claims ||
        verified.claims.role !== role ||
        verified.claims.sub !== userId
      ) {
        throw new Error(
          `ProCV RLS context was rejected; verify PROCV_RLS_CONTEXT_KEY matches the database verifier key '${signingKeyId()}'`,
        );
      }
      return operation(tx);
    });
  }

  return {
    withUserContext: <T>(userId: string, operation: ContextOperation<T>) =>
      withContext('user', userId, operation, client, 'procv_app'),
    withAdminContext: async <T>(userId: string, operation: ContextOperation<T>) => {
      if (!adminClientProvider) {
        throw new Error('ProCV administrative database credentials are not configured');
      }
      return withContext('user', userId, operation, adminClientProvider(), 'procv_admin_app');
    },
    withPublicContext: <T>(operation: ContextOperation<T>) =>
      withContext('public', null, operation, client, 'procv_app'),
  };
}

let adminPrisma: PrismaClient | undefined;
function getAdminPrisma(): PrismaClient {
  if (adminPrisma) return adminPrisma;
  const url = process.env.PROCV_ADMIN_DATABASE_URL;
  if (!url)
    throw new Error('PROCV_ADMIN_DATABASE_URL must use the isolated procv_admin_login role');
  let username: string;
  try {
    username = new URL(url).username;
  } catch {
    throw new Error('PROCV_ADMIN_DATABASE_URL must use the isolated procv_admin_login role');
  }
  if (username !== 'procv_admin_login') {
    throw new Error('PROCV_ADMIN_DATABASE_URL must use the isolated procv_admin_login role');
  }
  adminPrisma = new PrismaClient({ datasources: { db: { url } } });
  return adminPrisma;
}

const dbContext = createDbContext(prisma, getAdminPrisma);
export const withUserContext = dbContext.withUserContext;
/** Uses a distinct DB login whose only elevated membership is procv_admin_app. */
export const withAdminContext = dbContext.withAdminContext;
export const withPublicContext = dbContext.withPublicContext;
