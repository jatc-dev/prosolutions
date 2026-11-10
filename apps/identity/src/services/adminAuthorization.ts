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
