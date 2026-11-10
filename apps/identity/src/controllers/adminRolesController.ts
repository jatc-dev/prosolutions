import { Module, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { IdentityRequest } from '../middleware/auth';
import { userHasPermission } from '../services/adminAuthorization';

const MODULES = new Set<string>(Object.values(Module));

function actor(req: Request) {
  const identityReq = req as IdentityRequest;
  return { id: identityReq.userId!, email: identityReq.email ?? null };
}

async function writeAdminAudit(req: Request, action: string, resourceId: string, details: Record<string, unknown>) {
  const current = actor(req);
  await prisma.auditLog.create({
    data: {
      adminId: current.id,
      adminEmail: current.email,
      action,
      resource: 'admin_role_assignment',
      resourceId,
      details: details as Prisma.InputJsonObject,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    },
  });
}

export async function listAdminRoles(_req: Request, res: Response) {
  const roles = await prisma.adminRole.findMany({
    include: {
      permissions: {
        include: { permission: { select: { key: true, description: true } } },
        orderBy: { permission: { key: 'asc' } },
      },
    },
    orderBy: { name: 'asc' },
  });
  return res.json({
    roles: roles.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((entry) => entry.permission),
    })),
  });
}

export async function listAdminAssignments(req: Request, res: Response) {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  const assignments = await prisma.userAdminRole.findMany({
    where: userId ? { userId } : undefined,
    include: {
      user: { select: { id: true, email: true, name: true } },
      role: { select: { key: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return res.json({
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      user: assignment.user,
      role: assignment.role,
      module: assignment.module,
      assignedById: assignment.assignedById,
      expiresAt: assignment.expiresAt,
      createdAt: assignment.createdAt,
    })),
  });
}

export async function assignAdminRole(req: Request, res: Response) {
  const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
  const roleKey = typeof req.body?.roleKey === 'string' ? req.body.roleKey.trim() : '';
  const moduleValue = typeof req.body?.module === 'string' ? req.body.module : undefined;
  const expiresAtValue = req.body?.expiresAt;
  if (!userId || !roleKey) return res.status(400).json({ message: 'userId and roleKey are required' });
  if (moduleValue && !MODULES.has(moduleValue)) return res.status(400).json({ message: 'Invalid module scope' });

  const role = await prisma.adminRole.findUnique({ where: { key: roleKey } });
  if (!role) return res.status(404).json({ message: 'Administrative role not found' });
  if (role.key === 'module_admin' && !moduleValue) {
    return res.status(400).json({ message: 'module_admin assignments require an explicit module scope' });
  }
  if (role.key !== 'module_admin' && moduleValue) {
    return res.status(400).json({ message: 'Only module_admin assignments may have a module scope' });
  }
  if (role.key === 'platform_owner') {
    const allowed = await userHasPermission(actor(req).id, 'identity.roles.owner_manage');
    if (!allowed) return res.status(403).json({ message: 'Only a platform owner can assign platform_owner' });
  }
  if (['platform_admin', 'security_admin'].includes(role.key)) {
    const allowed = await userHasPermission(actor(req).id, 'identity.roles.privileged_manage');
    if (!allowed) return res.status(403).json({ message: 'Only a platform owner can assign privileged administrator roles' });
  }

  let expiresAt: Date | null = null;
  if (expiresAtValue !== undefined && expiresAtValue !== null && expiresAtValue !== '') {
    expiresAt = new Date(expiresAtValue);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return res.status(400).json({ message: 'expiresAt must be a future date' });
    }
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const current = actor(req);
  const assignment = await prisma.userAdminRole.create({
    data: {
      userId,
      roleId: role.id,
      module: moduleValue as Module | undefined,
      assignedById: current.id,
      expiresAt,
    },
    include: { role: { select: { key: true, name: true } } },
  });
  await writeAdminAudit(req, 'admin.role.assigned', assignment.id, {
    targetUserId: userId,
    roleKey,
    module: moduleValue ?? null,
    expiresAt: expiresAt?.toISOString() ?? null,
  });
  return res.status(201).json({
    assignment: {
      id: assignment.id,
      userId: assignment.userId,
      role: assignment.role,
      module: assignment.module,
      expiresAt: assignment.expiresAt,
    },
  });
}

export async function revokeAdminRole(req: Request, res: Response) {
  const assignment = await prisma.userAdminRole.findUnique({
    where: { id: req.params.assignmentId },
    include: { role: { select: { key: true } } },
  });
  if (!assignment) return res.status(404).json({ message: 'Role assignment not found' });

  if (['platform_owner', 'platform_admin', 'security_admin'].includes(assignment.role.key)) {
    const allowed = await userHasPermission(actor(req).id, 'identity.roles.privileged_manage');
    if (!allowed) return res.status(403).json({ message: 'Only a platform owner can revoke privileged administrator roles' });
  }

  if (assignment.role.key === 'platform_owner' && !assignment.module) {
    const activeOwners = await prisma.userAdminRole.count({
      where: {
        role: { key: 'platform_owner' },
        module: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (activeOwners <= 1) {
      return res.status(409).json({ message: 'The last active platform owner cannot be removed' });
    }
  }

  await prisma.userAdminRole.delete({ where: { id: assignment.id } });
  await writeAdminAudit(req, 'admin.role.revoked', assignment.id, {
    targetUserId: assignment.userId,
    roleKey: assignment.role.key,
    module: assignment.module ?? null,
  });
  return res.status(204).send();
}
