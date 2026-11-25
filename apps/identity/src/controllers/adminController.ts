import { Module, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { IdentityRequest } from '../middleware/auth';
import { getUserPermissions } from '../services/adminAuthorization';
import { summarizeUsers, ModuleErasureError } from '../services/moduleData';
import {
  cancelUserDeletion,
  checkLifecycleAction,
  countActiveOwners,
  eraseUserNow,
  isPlatformOwner,
  parseDeletionRequest,
  revokeUserSessions,
  scheduleUserDeletion,
  setUserActive,
  updateUserProfile,
  type LifecycleAction,
} from '../services/userLifecycle';

const STATUSES = ['active', 'suspended', 'unverified', 'scheduled'] as const;
type Status = (typeof STATUSES)[number];
const MODULES = new Set<string>(Object.values(Module));
const activeGrant = () => ({ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] });

function actorOf(req: Request) {
  const identityReq = req as IdentityRequest;
  return { id: identityReq.userId!, email: identityReq.email ?? null, ipAddress: req.ip || null, userAgent: req.get('user-agent') || null };
}

/** Filters for the user directory: search, status, module and admin role. */
export function buildUserFilter(query: Record<string, unknown>): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [];
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search) and.push({ OR: [{ email: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }] });
  const status = typeof query.status === 'string' && (STATUSES as readonly string[]).includes(query.status) ? (query.status as Status) : null;
  if (status === 'active') and.push({ isActive: true, deletionScheduledAt: null });
  if (status === 'suspended') and.push({ isActive: false, deletionScheduledAt: null });
  if (status === 'unverified') and.push({ emailVerified: false });
  if (status === 'scheduled') and.push({ deletionScheduledAt: { not: null } });
  if (typeof query.module === 'string' && MODULES.has(query.module)) {
    and.push({ moduleAccess: { some: { module: query.module as Module, active: true, ...activeGrant() } } });
  }
  if (typeof query.role === 'string' && query.role) {
    and.push(query.role === 'none'
      ? { adminRoleAssignments: { none: activeGrant() } }
      : { adminRoleAssignments: { some: { role: { key: query.role }, ...activeGrant() } } });
  }
  return and.length ? { AND: and } : {};
}

const SORTS: Record<string, Prisma.UserOrderByWithRelationInput> = {
  created: { createdAt: 'desc' },
  name: { name: 'asc' },
  email: { email: 'asc' },
  lastLogin: { lastLoginAt: { sort: 'desc', nulls: 'last' } },
};

export async function listIdentityUsers(req: Request, res: Response) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit as string, 10) || 25));
    const where = buildUserFilter(req.query as Record<string, unknown>);
    const orderBy = SORTS[String(req.query.sort)] ?? SORTS.created!;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, name: true, role: true, isActive: true, emailVerified: true,
          createdAt: true, lastLoginAt: true, deletionScheduledAt: true, googleSub: true, mfaEnabledAt: true,
          moduleAccess: { where: { active: true, ...activeGrant() }, select: { module: true, expiresAt: true }, orderBy: { module: 'asc' } },
          adminRoleAssignments: { where: activeGrant(), select: { module: true, role: { select: { key: true } } } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const content = req.query.withContent === '1' ? await summarizeUsers(users.map((user) => user.id)) : null;

    return res.json({
      users: users.map(({ moduleAccess, adminRoleAssignments, googleSub, ...user }) => ({
        ...user,
        signInWithGoogle: Boolean(googleSub),
        status: user.deletionScheduledAt ? 'scheduled' : user.isActive ? 'active' : 'suspended',
        modules: moduleAccess.map((access) => access.module),
        adminRoles: adminRoleAssignments.map((assignment) => ({ key: assignment.role.key, module: assignment.module })),
        ...(content ? { content: content[user.id] } : {}),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Unable to list Identity users' });
  }
}

/** Everything the admin needs about one account, including its module content. */
export async function getIdentityUser(req: Request, res: Response) {
  const userId = String(req.params.userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true, isActive: true, emailVerified: true, createdAt: true, lastLoginAt: true,
      deletionScheduledAt: true, googleSub: true, mfaEnabledAt: true,
      moduleAccess: { where: { active: true, ...activeGrant() }, select: { module: true, grantedAt: true, expiresAt: true } },
      adminRoleAssignments: { where: activeGrant(), select: { id: true, module: true, expiresAt: true, createdAt: true, role: { select: { key: true, name: true } } } },
      sessions: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, createdAt: true, lastAccessedAt: true, expiresAt: true, deviceName: true, userAgent: true, ipAddress: true, rememberMe: true },
        orderBy: { lastAccessedAt: 'desc' },
      },
    },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  const [content, activity] = await Promise.all([
    summarizeUsers([user.id]),
    prisma.auditLog.findMany({
      where: { OR: [{ userId: user.id }, { resourceId: user.id }] },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, action: true, adminEmail: true, createdAt: true, ipAddress: true, details: true },
    }),
  ]);
  const { googleSub, ...rest } = user;
  return res.json({
    user: {
      ...rest,
      signInWithGoogle: Boolean(googleSub),
      status: user.deletionScheduledAt ? 'scheduled' : user.isActive ? 'active' : 'suspended',
      content: content[user.id],
      activity,
    },
  });
}

async function authorize(req: Request, res: Response, targetId: string, action: LifecycleAction): Promise<boolean> {
  const actor = actorOf(req);
  const exists = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!exists) {
    res.status(404).json({ message: 'User not found' });
    return false;
  }
  const [targetIsOwner, activeOwnerCount, actorPermissions] = await Promise.all([
    isPlatformOwner(targetId),
    countActiveOwners(),
    getUserPermissions(actor.id),
  ]);
  const decision = checkLifecycleAction({ action, actorId: actor.id, targetId, targetIsOwner, activeOwnerCount, actorPermissions });
  if (!decision.ok) {
    res.status(decision.status).json({ message: decision.message, code: decision.code });
    return false;
  }
  return true;
}

/** Edit the display name, or suspend / reactivate the account. */
export async function updateIdentityUser(req: Request, res: Response) {
  const userId = String(req.params.userId);
  const body = (req.body ?? {}) as { name?: unknown; isActive?: unknown };
  const hasName = body.name !== undefined;
  const hasActive = typeof body.isActive === 'boolean';
  if (!hasName && !hasActive) return res.status(400).json({ message: 'Nothing to update' });
  if (hasName && body.name !== null && (typeof body.name !== 'string' || body.name.trim().length > 120)) {
    return res.status(400).json({ message: 'name must be a string of at most 120 characters' });
  }
  const action: LifecycleAction = hasActive ? (body.isActive ? 'reactivate' : 'suspend') : 'edit';
  if (!(await authorize(req, res, userId, action))) return;
  const actor = actorOf(req);
  if (hasName) await updateUserProfile(userId, actor, { name: typeof body.name === 'string' ? body.name.trim() || null : null });
  const lifecycle = hasActive ? await setUserActive(userId, actor, body.isActive as boolean) : null;
  return res.json({ message: 'User updated', ...(lifecycle ?? {}) });
}

/** Owner only: erase now, or suspend and erase after N days. Requires typing the email. */
export async function deleteIdentityUser(req: Request, res: Response) {
  const userId = String(req.params.userId);
  const request = parseDeletionRequest(req.body);
  if ('error' in request) return res.status(400).json({ message: request.error });
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!target) return res.status(404).json({ message: 'User not found' });
  const confirmEmail = (req.body as { confirmEmail?: unknown })?.confirmEmail;
  if (typeof confirmEmail !== 'string' || confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()) {
    return res.status(400).json({ message: 'Type the account email to confirm', code: 'confirmation_mismatch' });
  }
  if (!(await authorize(req, res, userId, 'delete'))) return;
  const actor = actorOf(req);
  if (request.mode === 'scheduled') {
    const { deletionScheduledAt } = await scheduleUserDeletion(userId, actor, request.days);
    return res.json({ message: 'Deletion scheduled', deletionScheduledAt });
  }
  try {
    const { deleted } = await eraseUserNow(userId, actor);
    return res.json({ message: 'User deleted', deleted });
  } catch (error) {
    if (error instanceof ModuleErasureError) {
      return res.status(502).json({ message: `The account was kept: ${error.module} could not erase its data. Try again later.`, module: error.module });
    }
    return res.status(500).json({ message: 'User deletion failed' });
  }
}

/** Owner only: cancel a scheduled deletion and reactivate the account. */
export async function restoreIdentityUser(req: Request, res: Response) {
  const userId = String(req.params.userId);
  if (!(await authorize(req, res, userId, 'delete'))) return;
  await cancelUserDeletion(userId, actorOf(req));
  return res.json({ message: 'Deletion cancelled' });
}

/** Close every session of the account (forces sign-in everywhere). */
export async function revokeIdentityUserSessions(req: Request, res: Response) {
  const userId = String(req.params.userId);
  if (!(await authorize(req, res, userId, 'edit'))) return;
  return res.json(await revokeUserSessions(userId, actorOf(req)));
}

/** Identity audit trail with filters; CSV when ?format=csv (needs identity.audit.export). */
export async function listIdentityAudit(req: Request, res: Response) {
  const page = Math.max(1, Number.parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(req.query.limit as string, 10) || 50));
  const and: Prisma.AuditLogWhereInput[] = [];
  if (typeof req.query.action === 'string' && req.query.action) and.push({ action: { startsWith: req.query.action } });
  if (typeof req.query.actor === 'string' && req.query.actor) and.push({ adminEmail: { contains: req.query.actor, mode: 'insensitive' } });
  if (typeof req.query.userId === 'string' && req.query.userId) and.push({ OR: [{ userId: req.query.userId }, { resourceId: req.query.userId }] });
  const from = typeof req.query.from === 'string' ? new Date(req.query.from) : null;
  const to = typeof req.query.to === 'string' ? new Date(req.query.to) : null;
  if (from && !Number.isNaN(from.getTime())) and.push({ createdAt: { gte: from } });
  if (to && !Number.isNaN(to.getTime())) and.push({ createdAt: { lte: to } });
  const where: Prisma.AuditLogWhereInput = and.length ? { AND: and } : {};
  const select = { id: true, action: true, resource: true, resourceId: true, adminEmail: true, userId: true, ipAddress: true, createdAt: true, details: true } as const;

  if (req.query.format === 'csv') {
    const permissions = await getUserPermissions(actorOf(req).id);
    if (!permissions.includes('identity.audit.export')) return res.status(403).json({ message: 'Exporting the audit trail requires identity.audit.export' });
    const rows = await prisma.auditLog.findMany({ where, select, orderBy: { createdAt: 'desc' }, take: 5000 });
    const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = ['createdAt,action,resource,resourceId,adminEmail,userId,ipAddress,details', ...rows.map((row) =>
      [row.createdAt.toISOString(), row.action, row.resource, row.resourceId, row.adminEmail, row.userId, row.ipAddress, JSON.stringify(row.details ?? {})].map(cell).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="prosolutions-audit.csv"');
    return res.send(csv);
  }

  const [events, total] = await Promise.all([
    prisma.auditLog.findMany({ where, select, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.auditLog.count({ where }),
  ]);
  return res.json({ events, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}
