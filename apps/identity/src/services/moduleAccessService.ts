import prisma from '../prismaClient';
import { ProSolutionsModule } from '../types/modules';

const AVAILABLE_MODULES: ProSolutionsModule[] = [
  ProSolutionsModule.PROCV,
  ProSolutionsModule.PROJOBS,
];

function isAvailableModule(module: string): module is ProSolutionsModule {
  return AVAILABLE_MODULES.some((availableModule) => availableModule === module);
}

/**
 * Create missing default grants, then return only effective persisted grants.
 *
 * Important: the upsert update branch must remain empty. Login and refresh are
 * not authorization-management operations and must never reactivate a revoked
 * grant or remove its expiry.
 */
export async function ensureDefaultModuleAccess(
  userId: string,
  _role: string,
  client: typeof prisma = prisma,
): Promise<ProSolutionsModule[]> {
  await Promise.all(
    AVAILABLE_MODULES.map((module) =>
      client.moduleAccess.upsert({
        where: { userId_module: { userId, module } },
        update: {},
        create: { userId, module, active: true },
      }),
    ),
  );

  const activeGrants = await client.moduleAccess.findMany({
    where: {
      userId,
      module: { in: AVAILABLE_MODULES },
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { module: true },
  });

  return activeGrants
    .map(({ module }) => module)
    .filter(isAvailableModule);
}
