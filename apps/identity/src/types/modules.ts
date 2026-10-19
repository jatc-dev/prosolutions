export enum ProSolutionsModule {
  PROCV = 'PROCV',
  PROJOBS = 'PROJOBS',
  PROSKILLS = 'PROSKILLS',
  PROCAREER = 'PROCAREER',
  PROINTERVIEW = 'PROINTERVIEW',
  PRORECRUIT = 'PRORECRUIT',
}

export const ALL_MODULES: ProSolutionsModule[] = [
  ProSolutionsModule.PROCV,
  ProSolutionsModule.PROJOBS,
  ProSolutionsModule.PROSKILLS,
  ProSolutionsModule.PROCAREER,
  ProSolutionsModule.PROINTERVIEW,
  ProSolutionsModule.PRORECRUIT,
];

export interface ModuleGrant {
  module: ProSolutionsModule;
  grantedAt: Date;
  expiresAt?: Date;
  active: boolean;
}

export interface IdentityClaims {
  sub: string;
  email?: string;
  role?: string;
  modules?: ProSolutionsModule[];
  iss?: string;
  aud?: string;
}

export function hasModuleAccess(
  claims: IdentityClaims,
  requiredModule: ProSolutionsModule,
): boolean {
  if (!claims.modules) return false;
  return claims.modules.includes(requiredModule);
}

export function hasAnyModuleAccess(
  claims: IdentityClaims,
  requiredModules: ProSolutionsModule[],
): boolean {
  if (!claims.modules) return false;
  return requiredModules.some((mod) => claims.modules!.includes(mod));
}
