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
    status: "beta",
    description:
      "Crea, edita y exporta tu hoja de vida con plantillas optimizadas para ATS, edición en tiempo real y exportación a PDF, JSON y XML.",
  },
  {
    id: "projobs",
    name: "ProJobs",
    tagline: "Empleo en todos los sectores",
    path: "/projobs",
    status: "beta",
    description: "Vacantes de todos los sectores con búsqueda instantánea y postulación en un clic.",
  },
];

export function getModule(id: PlatformModule["id"]): PlatformModule | undefined {
  return MODULES.find((module) => module.id === id);
}
