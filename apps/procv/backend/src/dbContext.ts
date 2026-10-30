import { Prisma } from '@prisma/client';
import prisma from './prismaClient';

export type ProCVTransaction = Prisma.TransactionClient;
type ContextOperation<T> = (tx: ProCVTransaction) => Promise<T>;

async function withContext<T>(
  userId: string | null,
  isAdmin: boolean,
  operation: ContextOperation<T>,
): Promise<T> {
  if (userId !== null && (typeof userId !== 'string' || !userId.trim())) {
    throw new Error('A non-empty ProIdentity user ID is required');
  }

  return prisma.$transaction(async tx => {
    // The login role is intentionally not the policy role. Assume the restricted
    // application role explicitly inside every transaction that touches data.
    await tx.$queryRaw`SELECT set_config('role', 'procv_app', true)`;
    const [role] = await tx.$queryRaw<Array<{ current_role: string }>>`
      SELECT current_user::text AS current_role
    `;
    if (role?.current_role !== 'procv_app') {
      throw new Error('Unable to assume the restricted procv_app database role');
    }

    await tx.$queryRaw`
      SELECT
        set_config('procv.user_id', ${userId ?? ''}, true),
        set_config('procv.is_admin', ${isAdmin ? 'true' : 'false'}, true)
    `;

    return operation(tx);
  });
}

export function withUserContext<T>(userId: string, operation: ContextOperation<T>): Promise<T> {
  return withContext(userId, false, operation);
}

export function withAdminContext<T>(
  userId: string,
  operation: ContextOperation<T>,
): Promise<T> {
  return withContext(userId, true, operation);
}

export function withPublicContext<T>(operation: ContextOperation<T>): Promise<T> {
  return withContext(null, false, operation);
}
