import { Module } from '@prisma/client';
import prisma from '../prismaClient';

const activeAssignmentWhere = (userId: string, module?: Module, includeModuleScoped = false) => ({
  userId,
  AND: [
    { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    ...(module
      ? [{ OR: [{ module: null }, { module }] }]
      : includeModuleScoped ? [] : [{ module: null }]),
  ],
});

export async function getUserPermissions(
  userId: string,
  module?: Module,
  includeModuleScoped = false,
): Promise<string[]> {
  const assignments = await prisma.userAdminRole.findMany({
    where: activeAssignmentWhere(userId, module, includeModuleScoped),
    include: {
      role: {
        include: {
          permissions: { include: { permission: { select: { key: true } } } },
        },
      },
    },
  });

  return [...new Set(assignments.flatMap((assignment) =>
    assignment.role.permissions.map((entry) => entry.permission.key),
  ))].sort();
}

export async function userHasPermission(
  userId: string,
  permission: string,
  module?: Module,
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, module);
  return permissions.includes(permission);
}

export async function getUserAdminAssignments(userId: string) {
  return prisma.userAdminRole.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      role: {
        select: {
          key: true,
          name: true,
          permissions: { include: { permission: { select: { key: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}


/** Resolve global and per-module grants in one database read for API introspection. */
export async function getUserPermissionSets(userId: string): Promise<{
  permissions: string[];
  modulePermissions: Partial<Record<Module, string[]>>;
}> {
  const assignments = await prisma.userAdminRole.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      role: {
        include: {
          permissions: { include: { permission: { select: { key: true } } } },
        },
      },
    },
  });

  const globalPermissions = new Set<string>();
  const modulePermissions = new Map<Module, Set<string>>();
  for (const assignment of assignments) {
    const target = assignment.module
      ? (modulePermissions.get(assignment.module) ?? new Set<string>())
      : globalPermissions;
    for (const entry of assignment.role.permissions) target.add(entry.permission.key);
    if (assignment.module) modulePermissions.set(assignment.module, target);
  }

  return {
    permissions: [...globalPermissions].sort(),
    modulePermissions: Object.fromEntries(
      [...modulePermissions.entries()].map(([module, permissions]) => [module, [...permissions].sort()]),
    ) as Partial<Record<Module, string[]>>,
  };
}
