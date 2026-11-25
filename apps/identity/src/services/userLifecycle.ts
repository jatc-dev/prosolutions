import { Prisma } from '@prisma/client';
import prisma from '../prismaClient';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/auditLog';
import { eraseUserModuleData, ModuleErasureError, type ContentCounts } from './moduleData';

export type LifecycleAction = 'edit' | 'suspend' | 'reactivate' | 'delete';

export const DELETE_PERMISSION = 'identity.users.delete';
export const OWNER_PERMISSION = 'identity.roles.owner_manage';
export const MAX_SCHEDULE_DAYS = 90;

export type LifecycleDecision = { ok: true } | { ok: false; status: number; code: string; message: string };

/**
 * Who may do what to an account. Pure, so the rules are unit-tested:
 * - nobody suspends or deletes themselves;
 * - deleting is owner-only (identity.users.delete);
 * - only an owner may act on another owner;
 * - the platform always keeps at least one active owner.
 */
export function checkLifecycleAction(input: {
  action: LifecycleAction;
  actorId: string;
  targetId: string;
  targetIsOwner: boolean;
  activeOwnerCount: number;
  actorPermissions: string[];
}): LifecycleDecision {
  const { action, actorId, targetId, targetIsOwner, activeOwnerCount, actorPermissions } = input;
  const has = (permission: string) => actorPermissions.includes(permission);
  if (actorId === targetId && (action === 'suspend' || action === 'delete')) {
    return { ok: false, status: 400, code: 'self_action', message: 'You cannot suspend or delete your own account from the admin console' };
  }
  if (action === 'delete' && !has(DELETE_PERMISSION)) {
    return { ok: false, status: 403, code: 'owner_only', message: 'Only a platform owner can delete accounts' };
  }
  if (targetIsOwner && actorId !== targetId && !has(OWNER_PERMISSION)) {
    return { ok: false, status: 403, code: 'owner_protected', message: 'Only a platform owner can change another owner account' };
  }
  if (targetIsOwner && (action === 'suspend' || action === 'delete') && activeOwnerCount <= 1) {
    return { ok: false, status: 409, code: 'last_owner', message: 'The platform must keep at least one active owner' };
  }
  return { ok: true };
}

/** Validates "now" or a 1–90 day schedule. */
export function parseDeletionRequest(body: unknown): { mode: 'now' } | { mode: 'scheduled'; days: number } | { error: string } {
  const { mode, days } = (body ?? {}) as { mode?: unknown; days?: unknown };
  if (mode === 'now') return { mode: 'now' };
  if (mode === 'scheduled') {
    const value = Number(days);
    if (!Number.isInteger(value) || value < 1 || value > MAX_SCHEDULE_DAYS) return { error: `days must be an integer between 1 and ${MAX_SCHEDULE_DAYS}` };
    return { mode: 'scheduled', days: value };
  }
  return { error: 'mode must be "now" or "scheduled"' };
}

const activeOwnerWhere = () => ({
  role: { key: 'platform_owner' },
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  user: { isActive: true },
});

export async function isPlatformOwner(userId: string): Promise<boolean> {
  return (await prisma.userAdminRole.count({ where: { ...activeOwnerWhere(), userId } })) > 0;
}

export async function countActiveOwners(): Promise<number> {
  const owners = await prisma.userAdminRole.findMany({ where: activeOwnerWhere(), select: { userId: true }, distinct: ['userId'] });
  return owners.length;
}

type Actor = { id: string; email: string | null; ipAddress?: string | null; userAgent?: string | null };

async function adminAudit(tx: Prisma.TransactionClient, actor: Actor, action: string, targetId: string, details: Record<string, unknown> = {}) {
  await tx.auditLog.create({
    data: {
      adminId: actor.id,
      adminEmail: actor.email,
      userId: targetId,
      action,
      resource: 'user',
      resourceId: targetId,
      details: details as Prisma.InputJsonObject,
      ipAddress: actor.ipAddress ?? null,
      userAgent: actor.userAgent ?? null,
    },
  });
}

async function revokeAllSessions(tx: Prisma.TransactionClient, userId: string): Promise<number> {
  const result = await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  return result.count;
}

export async function updateUserProfile(userId: string, actor: Actor, data: { name?: string | null }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: userId }, data: { name: data.name }, select: { id: true, name: true } });
    await adminAudit(tx, actor, 'admin.user.updated', userId, { fields: Object.keys(data) });
    return user;
  });
}

export async function setUserActive(userId: string, actor: Actor, active: boolean) {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: active ? { isActive: true } : { isActive: false } });
    const revoked = active ? 0 : await revokeAllSessions(tx, userId);
    await adminAudit(tx, actor, active ? 'admin.user.reactivated' : 'admin.user.suspended', userId, { revokedSessions: revoked });
    return { revokedSessions: revoked };
  });
}

export async function revokeUserSessions(userId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    const revoked = await revokeAllSessions(tx, userId);
    await adminAudit(tx, actor, 'admin.user.sessions_revoked', userId, { revokedSessions: revoked });
    return { revokedSessions: revoked };
  });
}

/** Suspends the account now and erases it (with module data) after `days`. */
export async function scheduleUserDeletion(userId: string, actor: Actor, days: number) {
  const at = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive: false, deletionScheduledAt: at, deletionRequestedById: actor.id } });
    const revoked = await revokeAllSessions(tx, userId);
    await adminAudit(tx, actor, 'admin.user.deletion_scheduled', userId, { deleteAt: at.toISOString(), days, revokedSessions: revoked });
    return { deletionScheduledAt: at };
  });
}

/** Cancels a scheduled deletion and reactivates the account. */
export async function cancelUserDeletion(userId: string, actor: Actor) {
  return prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isActive: true, deletionScheduledAt: null, deletionRequestedById: null } });
    await adminAudit(tx, actor, 'admin.user.deletion_cancelled', userId);
  });
}

/**
 * Erases module data first, then the account (cascade: sessions, tokens,
 * profile, module access, roles, consents) and anonymises its audit trail.
 * If a module fails, the account is kept so the erasure can be retried.
 */
export async function eraseUserNow(userId: string, actor: Actor | null): Promise<{ deleted: Record<string, ContentCounts> }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new Error('User not found');
  const deleted = await eraseUserModuleData(userId);
  await prisma.$transaction([
    prisma.auditLog.updateMany({ where: { userId }, data: { userId: null, ipAddress: null, userAgent: null, details: { anonymized: true } } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  auditLog('admin.user.deleted', {
    details: { by: actor?.email ?? 'scheduled-deletion', modules: deleted, at: new Date().toISOString() },
    ...(actor ? { ipAddress: actor.ipAddress ?? undefined, userAgent: actor.userAgent ?? undefined } : {}),
  });
  return { deleted };
}

/** Erases every account whose scheduled deletion date has passed. */
export async function purgeDueDeletions(now = new Date()): Promise<number> {
  const due = await prisma.user.findMany({ where: { deletionScheduledAt: { lte: now } }, select: { id: true } });
  let erased = 0;
  for (const { id } of due) {
    try {
      await eraseUserNow(id, null);
      erased += 1;
    } catch (error) {
      logger.warn('Scheduled account deletion failed; will retry', {
        module: error instanceof ModuleErasureError ? error.module : undefined,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return erased;
}
