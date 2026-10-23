// Runtime module identifiers are stored in the central Module registry, not a code enum.
export type ProSolutionsModule = string;

export interface ModuleGrant {
  module: string;
  grantedAt: Date;
  expiresAt?: Date;
  active: boolean;
}

export interface IdentityClaims {
  sub: string;
  email?: string;
  role?: string;
  modules?: string[];
  iss?: string;
  aud?: string | string[];
}

export function hasModuleAccess(claims: IdentityClaims, requiredModule: string): boolean {
  return Array.isArray(claims.modules) && claims.modules.includes(requiredModule);
}

export function hasAnyModuleAccess(claims: IdentityClaims, requiredModules: string[]): boolean {
  if (!Array.isArray(claims.modules)) return false;
  return requiredModules.some((module) => claims.modules!.includes(module));
}
