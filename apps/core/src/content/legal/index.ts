import privacy from "./privacidad.md?raw";
import terms from "./terminos.md?raw";
import cookies from "./cookies.md?raw";
import ai from "./uso-ia.md?raw";
import about from "./nosotros.md?raw";

export type LegalSlug = "privacidad" | "terminos" | "cookies" | "uso-ia";

export interface LegalDocument {
  slug: LegalSlug;
  path: string;
  title: string;
  description: string;
  /** Effective date of this version (ISO). */
  updatedAt: string;
  body: string;
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: "privacidad",
    path: "/legal/privacidad",
    title: "Política de privacidad y tratamiento de datos personales",
    description:
      "Cómo ProSolutions recolecta, usa y protege tus datos personales conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y el RGPD, y cómo ejercer tus derechos.",
    updatedAt: "2026-11-25",
    body: privacy,
  },
  {
    slug: "terminos",
    path: "/legal/terminos",
    title: "Términos y condiciones de uso",
    description: "Condiciones para usar ProSolutions, ProCV, ProJobs, ProTools y ProAcademy como candidato o empresa.",
    updatedAt: "2026-11-18",
    body: terms,
  },
  {
    slug: "cookies",
    path: "/legal/cookies",
    title: "Política de cookies",
    description: "Qué cookies usa ProSolutions, para qué sirven, cómo funciona la publicidad de Google AdSense y cómo cambiar tus preferencias.",
    updatedAt: "2026-11-20",
    body: cookies,
  },
  {
    slug: "uso-ia",
    path: "/legal/uso-ia",
    title: "Política de uso de inteligencia artificial",
    description: "Dónde usa ProSolutions inteligencia artificial, qué datos intervienen y qué límites aplicamos para proteger a los usuarios.",
    updatedAt: "2026-11-25",
    body: ai,
  },
];

export const ABOUT_PAGE = {
  path: "/nosotros",
  title: "Sobre ProSolutions",
  description:
    "Quiénes somos y cómo trabajamos: herramientas gratuitas para buscar empleo en todos los sectores, con transparencia, privacidad y seguridad.",
  body: about,
};

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);
}
