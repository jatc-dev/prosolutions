/**
 * Public, non-secret facts about the site used by pages, SEO tags and the
 * prerender step. Legal-entity fields that are not confirmed yet stay empty:
 * pages only render them when they have a value (never placeholders).
 */
export const SITE = {
  name: "ProSolutions",
  url: "https://prosolutions.page",
  locale: "es_CO",
  language: "es",
  /** 1200×630 social card (Open Graph / X) shared by every public page. */
  ogImage: "https://prosolutions.page/og-image.png",
  description:
    "Herramientas gratuitas para tu carrera profesional: crea tu hoja de vida, encuentra empleo en todos los sectores, calcula tu salario neto y aprende con guías prácticas.",
  /** Institutional inbox for support, companies and Habeas Data requests. */
  contactEmail: "contacto@prosolutions.page",
  operator: {
    /** Brand that operates the platform. */
    name: "JATC.DEV",
    url: "https://jatc.dev",
    /** Legal identification (NIT/registration) — fill in once confirmed. */
    taxId: "",
    /** Registered address — fill in once confirmed. */
    address: "",
    city: "Colombia",
  },
} as const;

/**
 * Public pages are served as /route/index.html, and the static host only finds
 * them with a trailing slash (without it the SPA fallback answers). Every
 * canonical, sitemap and internal link therefore uses the slash form.
 */
export const pagePath = (path: string) => (path === "/" || path.endsWith("/") || /[?#.]/.test(path) ? path : `${path}/`);

export const absoluteUrl = (path: string) => `${SITE.url}${pagePath(path)}`;
