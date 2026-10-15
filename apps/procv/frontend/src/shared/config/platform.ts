export interface PlatformModule {
  id: "procv" | "projobs";
  name: string;
  tagline: string;
  path: string;
  status: "active" | "beta" | "planned";
  description: string;
}

/** Ecosystem registry consumed by module pages (home, nav, SEO metadata). */
export const MODULES: PlatformModule[] = [
  {
    id: "procv",
    name: "ProCV",
    tagline: "Hojas de vida profesionales",
    path: "/procv",
    status: "active",
    description:
      "Crea, edita y exporta tu hoja de vida con plantillas optimizadas para ATS, edición en tiempo real y exportación a PDF, JSON y XML.",
  },
  {
    id: "projobs",
    name: "ProJobs",
    tagline: "Empleos tech remotos",
    path: "/projobs",
    status: "beta",
    description: "Vacantes tech remotas curadas con filtros por stack y búsqueda en vivo.",
  },
];

export function getModule(id: PlatformModule["id"]): PlatformModule | undefined {
  return MODULES.find((module) => module.id === id);
}
