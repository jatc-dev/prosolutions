import prisma from '../prismaClient';
import { ProSolutionsModule } from '../types/modules';

/** Modules every account receives automatically on login, refresh and registration. */
const AVAILABLE_MODULES: ProSolutionsModule[] = [
  ProSolutionsModule.PROCV,
  ProSolutionsModule.PROJOBS,
];

/**
 * Capability modules that are never granted by default. They only become
 * effective after an explicit administrative grant (POST /api/modules/grant).
 * PRORECRUIT marks a user as employer/recruiter in ProJobs.
 */
const GRANT_ONLY_MODULES: ProSolutionsModule[] = [ProSolutionsModule.PRORECRUIT];

/** Every module that may appear in access tokens and introspection responses. */
const EFFECTIVE_MODULES: ProSolutionsModule[] = [...AVAILABLE_MODULES, ...GRANT_ONLY_MODULES];

export function isAvailableModule(module: string): module is ProSolutionsModule {
  return AVAILABLE_MODULES.some((availableModule) => availableModule === module);
}

export function isEffectiveModule(module: string): module is ProSolutionsModule {
  return EFFECTIVE_MODULES.some((effectiveModule) => effectiveModule === module);
}

export function getDefaultModules(_role: string): ProSolutionsModule[] {
  // Admin role does not grant access to future or unavailable modules.
  return [...AVAILABLE_MODULES];
}

/**
 * Create missing default grants, then return only effective persisted grants.
 *
 * Important: the upsert update branch must remain empty. Login and refresh are
 * not authorization-management operations and must never reactivate a revoked
 * grant or remove its expiry. Grant-only modules are never created here.
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
      module: { in: EFFECTIVE_MODULES },
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { module: true },
  });

  return activeGrants
    .map(({ module }) => module)
    .filter(isEffectiveModule);
}
