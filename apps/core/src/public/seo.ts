import { useEffect } from "react";
import { ARTICLES, AUTHORS, CATEGORIES, getArticle } from "../content/academy";
import { ABOUT_PAGE, LEGAL_DOCUMENTS } from "../content/legal";
import { SITE, absoluteUrl } from "../content/site";
import { TOOLS, getTool } from "../content/tools";
import { DAFP_FAQ, FORMAT_1003_FAQ, FORMAT_PAGES_UPDATED, TEMPLATE_CARDS, type FaqItem } from "../content/formats";

export interface PageHead {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  robots?: string;
  publishedAt?: string;
  modifiedAt?: string;
  jsonLd?: Record<string, unknown>[];
}

/** A public, indexable route: prerendered and listed in the sitemap. */
export interface PublicRoute {
  path: string;
  lastmod: string;
  priority: number;
  changefreq: "weekly" | "monthly" | "yearly";
}

const ORGANIZATION = {
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  logo: { "@type": "ImageObject", url: `${SITE.url}/favicon.svg` },
};

function breadcrumb(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Inicio", path: "/" }, ...items].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

function webPage(type: string, title: string, description: string, path: string, extra: Record<string, unknown> = {}) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name: title,
    description,
    url: absoluteUrl(path),
    inLanguage: SITE.language,
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
    publisher: ORGANIZATION,
    ...extra,
  };
}

const latest = (dates: string[]) => dates.reduce((max, date) => (date > max ? date : max), "1970-01-01");

export const ACADEMY_HEAD: PageHead = {
  title: "ProAcademy: guías de empleo, hoja de vida y salarios | ProSolutions",
  description:
    "Guías prácticas y gratuitas para conseguir empleo: hoja de vida ATS, entrevistas con método STAR, salarios y contratos en Colombia, trabajo remoto y cambios de carrera.",
  path: "/academy",
};

export const TOOLS_HEAD: PageHead = {
  title: "ProTools: calculadoras laborales gratuitas para Colombia | ProSolutions",
  description:
    "Calculadoras gratuitas y sin registro: prima de servicios, salario neto y costo empresa, liquidación laboral, contrato laboral vs. prestación de servicios y evaluador de hoja de vida.",
  path: "/tools",
};

/** Landing page head (Spanish; the client localizes it when the locale is English). */
export const HOME_HEAD: PageHead = {
  title: "ProSolutions — Herramientas para tu carrera profesional",
  description:
    "ProSolutions reúne herramientas para tu carrera profesional: crea tu CV optimizado para ATS con ProCV y encuentra empleo en cualquier sector con ProJobs.",
  path: "/",
};

export const CREATE_CV_HEAD: PageHead = {
  title: "Crear hoja de vida gratis, sin registro y compatible con ATS | ProSolutions",
  description:
    "Crea tu hoja de vida gratis y sin registro: plantillas compatibles con ATS, importación desde PDF o Word y descarga en PDF o Word. Lista en pocos minutos.",
  path: "/crear-hoja-de-vida",
};
const CREATE_CV_UPDATED = "2026-11-19";

/** Landing pages for the CV formats people search for, and the template gallery. */
export const FORMAT_HEADS: Record<string, PageHead> = {
  "/formato-unico-hoja-de-vida": {
    title: "Formato único de hoja de vida Función Pública: llénalo en línea gratis | ProSolutions",
    description:
      "Diligencia el Formato Único de Hoja de Vida (Función Pública, Ley 190 de 1995) en línea y descárgalo en PDF o Word. Gratis, sin registro y con guía paso a paso.",
    path: "/formato-unico-hoja-de-vida",
  },
  "/hoja-de-vida-formato-1003": {
    title: "Hoja de vida formato 1003 para llenar en línea gratis | ProSolutions",
    description:
      "Llena la hoja de vida formato 1003 desde el celular o el computador, con foto y referencias, y descárgala en PDF o Word. Gratis, sin registro y con guía paso a paso.",
    path: "/hoja-de-vida-formato-1003",
  },
  "/plantillas-hoja-de-vida": {
    title: "Plantillas de hoja de vida gratis para descargar en Word y PDF | ProSolutions",
    description:
      "13 plantillas de hoja de vida gratis, 11 compatibles con ATS, más el formato único de Función Pública y el formato 1003. Llénalas en línea y descárgalas en Word o PDF.",
    path: "/plantillas-hoja-de-vida",
  },
};

const faqPage = (items: FaqItem[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
});

export const CONTACT_HEAD: PageHead = {
  title: "Contacto | ProSolutions",
  description: "Escríbenos para soporte, alianzas con empresas, prensa o solicitudes sobre tus datos personales (Habeas Data).",
  path: "/contacto",
};

/** Head metadata for a path, or null when the path is not a public page. */
export function headForPath(rawPath: string): PageHead | null {
  const path = rawPath.replace(/\/+$/, "") || "/";

  if (path === "/") {
    return {
      ...HOME_HEAD,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE.name,
          url: `${SITE.url}/`,
          description: SITE.description,
          inLanguage: SITE.language,
          publisher: ORGANIZATION,
        },
        { "@context": "https://schema.org", ...ORGANIZATION, email: SITE.contactEmail },
      ],
    };
  }

  if (path === "/academy") {
    return {
      ...ACADEMY_HEAD,
      jsonLd: [
        webPage("CollectionPage", ACADEMY_HEAD.title, ACADEMY_HEAD.description, path, {
          hasPart: ARTICLES.map((article) => ({ "@type": "Article", headline: article.title, url: absoluteUrl(`/academy/${article.slug}`) })),
        }),
        breadcrumb([{ name: "Academia", path }]),
      ],
    };
  }

  const articleMatch = path.match(/^\/academy\/([a-z0-9-]+)$/);
  if (articleMatch) {
    const article = getArticle(articleMatch[1]!);
    if (!article) return null;
    const author = AUTHORS[article.author]!;
    return {
      title: `${article.title} | ProAcademy`,
      description: article.description,
      path,
      type: "article",
      publishedAt: article.publishedAt,
      modifiedAt: article.updatedAt,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.description,
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          inLanguage: SITE.language,
          articleSection: CATEGORIES[article.category].label,
          wordCount: article.body.split(/\s+/).filter(Boolean).length,
          author: { "@type": "Organization", name: author.name, url: absoluteUrl("/nosotros") },
          publisher: ORGANIZATION,
          mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(path) },
          url: absoluteUrl(path),
        },
        breadcrumb([
          { name: "Academia", path: "/academy" },
          { name: article.title, path },
        ]),
      ],
    };
  }

  if (path === CREATE_CV_HEAD.path) {
    return {
      ...CREATE_CV_HEAD,
      modifiedAt: CREATE_CV_UPDATED,
      jsonLd: [
        webPage("WebPage", CREATE_CV_HEAD.title, CREATE_CV_HEAD.description, path, { dateModified: CREATE_CV_UPDATED }),
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "ProCV",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: absoluteUrl(path),
          description: "Editor de hojas de vida con plantillas compatibles con ATS, importación desde PDF o Word y descarga en PDF o Word.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "COP" },
          publisher: ORGANIZATION,
        },
        breadcrumb([{ name: "Crear hoja de vida", path }]),
      ],
    };
  }

  const formatHead = FORMAT_HEADS[path];
  if (formatHead) {
    const isGallery = path === "/plantillas-hoja-de-vida";
    const crumbs = isGallery
      ? [{ name: "Plantillas", path }]
      : [{ name: "Plantillas", path: "/plantillas-hoja-de-vida" }, { name: formatHead.title.split(":")[0]!.split(" (")[0]!, path }];
    return {
      ...formatHead,
      modifiedAt: FORMAT_PAGES_UPDATED,
      jsonLd: [
        webPage(isGallery ? "CollectionPage" : "WebPage", formatHead.title, formatHead.description, path, {
          dateModified: FORMAT_PAGES_UPDATED,
          ...(isGallery
            ? {
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: TEMPLATE_CARDS.length,
                  itemListElement: TEMPLATE_CARDS.map((template, index) => ({ "@type": "ListItem", position: index + 1, name: `Plantilla ${template.name}`, image: absoluteUrl(`/plantillas/${template.key}.webp`) })),
                },
              }
            : {}),
        }),
        ...(path === "/formato-unico-hoja-de-vida" ? [faqPage(DAFP_FAQ)] : path === "/hoja-de-vida-formato-1003" ? [faqPage(FORMAT_1003_FAQ)] : []),
        breadcrumb(crumbs),
      ],
    };
  }

  if (path === "/tools") {
    return {
      ...TOOLS_HEAD,
      jsonLd: [webPage("CollectionPage", TOOLS_HEAD.title, TOOLS_HEAD.description, path), breadcrumb([{ name: "Herramientas", path }])],
    };
  }

  const toolMatch = path.match(/^\/tools\/([a-z0-9-]+)$/);
  if (toolMatch) {
    const tool = getTool(toolMatch[1]!);
    if (!tool) return null;
    return {
      title: `${tool.title} | ProTools`,
      description: tool.description,
      path,
      modifiedAt: tool.updatedAt,
      jsonLd: [
        webPage("WebPage", tool.title, tool.description, path, { dateModified: tool.updatedAt }),
        breadcrumb([
          { name: "Herramientas", path: "/tools" },
          { name: tool.shortTitle, path },
        ]),
      ],
    };
  }

  const legal = LEGAL_DOCUMENTS.find((doc) => doc.path === path);
  if (legal) {
    return {
      title: `${legal.title} | ProSolutions`,
      description: legal.description,
      path,
      modifiedAt: legal.updatedAt,
      jsonLd: [
        webPage("WebPage", legal.title, legal.description, path, { dateModified: legal.updatedAt }),
        breadcrumb([{ name: legal.title, path }]),
      ],
    };
  }

  if (path === ABOUT_PAGE.path) {
    return {
      title: `${ABOUT_PAGE.title} | ProSolutions`,
      description: ABOUT_PAGE.description,
      path,
      jsonLd: [webPage("AboutPage", ABOUT_PAGE.title, ABOUT_PAGE.description, path), breadcrumb([{ name: "Nosotros", path }])],
    };
  }

  if (path === CONTACT_HEAD.path) {
    return {
      ...CONTACT_HEAD,
      jsonLd: [
        webPage("ContactPage", "Contacto", CONTACT_HEAD.description, path, {
          mainEntity: { ...ORGANIZATION, email: SITE.contactEmail },
        }),
        breadcrumb([{ name: "Contacto", path }]),
      ],
    };
  }

  return null;
}

/** Every page that is prerendered at build time and listed in the sitemap. */
export function publicRoutes(): PublicRoute[] {
  const today = latest([...ARTICLES.map((a) => a.updatedAt), ...TOOLS.map((t) => t.updatedAt)]);
  return [
    { path: CREATE_CV_HEAD.path, lastmod: CREATE_CV_UPDATED, priority: 0.9, changefreq: "monthly" },
    ...Object.keys(FORMAT_HEADS).map((formatPath) => ({ path: formatPath, lastmod: FORMAT_PAGES_UPDATED, priority: 0.9, changefreq: "monthly" as const })),
    { path: "/academy", lastmod: latest(ARTICLES.map((a) => a.updatedAt)), priority: 0.9, changefreq: "weekly" },
    ...ARTICLES.map((article) => ({ path: `/academy/${article.slug}`, lastmod: article.updatedAt, priority: 0.8, changefreq: "monthly" as const })),
    { path: "/tools", lastmod: latest(TOOLS.map((t) => t.updatedAt)), priority: 0.9, changefreq: "monthly" },
    ...TOOLS.map((tool) => ({ path: `/tools/${tool.slug}`, lastmod: tool.updatedAt, priority: 0.8, changefreq: "monthly" as const })),
    ...LEGAL_DOCUMENTS.map((doc) => ({ path: doc.path, lastmod: doc.updatedAt, priority: 0.3, changefreq: "yearly" as const })),
    { path: ABOUT_PAGE.path, lastmod: today, priority: 0.5, changefreq: "yearly" },
    { path: CONTACT_HEAD.path, lastmod: today, priority: 0.4, changefreq: "yearly" },
  ];
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** JSON for a <script type="application/ld+json"> block, safe against `</script>` breakouts. */
export const safeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

/** Head tags written into each prerendered HTML file. */
export function renderHeadTags(head: PageHead): string {
  const url = absoluteUrl(head.path);
  const tags = [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeHtml(head.description)}" />`,
    `<meta name="robots" content="${head.robots ?? "index, follow, max-image-preview:large"}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${head.type ?? "website"}" />`,
    `<meta property="og:site_name" content="${SITE.name}" />`,
    `<meta property="og:locale" content="${SITE.locale}" />`,
    `<meta property="og:title" content="${escapeHtml(head.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(head.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE.ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${SITE.name}: herramientas gratuitas para tu carrera profesional" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${SITE.ogImage}" />`,
    `<meta name="twitter:title" content="${escapeHtml(head.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(head.description)}" />`,
  ];
  if (head.publishedAt) tags.push(`<meta property="article:published_time" content="${head.publishedAt}" />`);
  if (head.modifiedAt) tags.push(`<meta property="article:modified_time" content="${head.modifiedAt}" />`);
  for (const block of head.jsonLd ?? []) tags.push(`<script type="application/ld+json">${safeJsonLd(block)}</script>`);
  return tags.join("\n    ");
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

/**
 * Keeps the document head in sync during client-side navigation. Crawlers
 * read the prerendered HTML; this only matters for in-app navigation, tabs
 * and sharing from the browser.
 */
export function useDocumentHead(head: PageHead | null) {
  const title = head?.title;
  const description = head?.description;
  const path = head?.path;
  const robots = head?.robots;
  useEffect(() => {
    if (!title || !description || !path) return;
    document.title = title;
    setMeta("name", "description", description);
    setMeta("name", "robots", robots ?? "index, follow, max-image-preview:large");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", absoluteUrl(path));
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = absoluteUrl(path);
  }, [title, description, path, robots]);
}
