import { Prisma } from '@prisma/client';
import prisma from './prismaClient';
import { getIdentityToken } from './identityContext';

export type ProCVTransaction = Prisma.TransactionClient;
type ContextOperation<T> = (tx: ProCVTransaction) => Promise<T>;

function getApplicationRole(): string {
  const role = process.env.PROCV_DB_ROLE || 'procv_app';
  if (!/^[a-z_][a-z0-9_]*$/.test(role)) {
    throw new Error('PROCV_DB_ROLE contains an invalid PostgreSQL role name');
  }
  return role;
}

async function withContext<T>(
  expectedUserId: string | null,
  expectedAdmin: boolean,
  operation: ContextOperation<T>,
): Promise<T> {
  const identityToken = getIdentityToken();
  if (expectedUserId !== null && !identityToken) {
    throw new Error('Missing verified ProIdentity database context');
  }

  return prisma.$transaction(async tx => {
    // Assume the restricted NOLOGIN role for every request transaction.
    await tx.$queryRaw`SELECT set_config('role', ${getApplicationRole()}, true)`;

    const [role] = await tx.$queryRaw<Array<{ current_role: string }>>`
      SELECT current_user::text AS current_role
    `;
    if (role?.current_role !== getApplicationRole()) {
      throw new Error('Unable to assume the restricted ProCV database role');
    }

    await tx.$queryRaw`
      SELECT set_config('procv.identity_token', ${identityToken ?? ''}, true)
    `;

    if (expectedUserId !== null) {
      const [context] = await tx.$queryRaw<Array<{ user_id: string | null; is_admin: boolean }>>`
        SELECT
          procv_private.current_user_id() AS user_id,
          procv_private.current_is_admin() AS is_admin
      `;
      if (context?.user_id !== expectedUserId) {
        throw new Error('Verified database subject does not match the requested user');
      }
      if (expectedAdmin && context.is_admin !== true) {
        throw new Error('Verified database context does not grant administrator access');
      }
    }

    return operation(tx);
  });
}

export function withUserContext<T>(userId: string, operation: ContextOperation<T>): Promise<T> {
  if (!userId || !userId.trim()) {
    throw new Error('A non-empty ProIdentity user ID is required');
  }
  return withContext(userId, false, operation);
}

export function withAdminContext<T>(userId: string, operation: ContextOperation<T>): Promise<T> {
  if (!userId || !userId.trim()) {
    throw new Error('A non-empty ProIdentity administrator ID is required');
  }
  return withContext(userId, true, operation);
}

export function withPublicContext<T>(operation: ContextOperation<T>): Promise<T> {
  return withContext(null, false, operation);
}
