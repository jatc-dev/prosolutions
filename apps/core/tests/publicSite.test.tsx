import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { describe, expect, it } from "vitest";
import { APP_URLS, RESOURCE_URLS } from "@prosolutions/ui";
import { AppRoutes } from "../src/App";
import { ARTICLES, getArticle } from "../src/content/academy";
import { LEGAL_DOCUMENTS } from "../src/content/legal";
import { parseMarkdown, renderInline, wordCount } from "../src/content/markdown";
import { CoreLocaleProvider } from "../src/i18n";
import { validateAdsSettings } from "../src/pages/ProAdminPage";
import { validateContact } from "../src/public/pages/InfoPages";
import { parseMoney } from "../src/public/pages/ToolsPages";
import { headForPath, publicRoutes, renderHeadTags, safeJsonLd } from "../src/public/seo";

const renderRoute = (url: string) =>
  renderToString(
    <CoreLocaleProvider>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </CoreLocaleProvider>,
  );

describe("ProAcademy content", () => {
  it("ships 12 original articles of at least 900 words with complete metadata", () => {
    expect(ARTICLES).toHaveLength(12);
    for (const article of ARTICLES) {
      expect(wordCount(article.body), article.slug).toBeGreaterThanOrEqual(900);
      expect(article.description.length, article.slug).toBeGreaterThanOrEqual(80);
      expect(article.description.length, article.slug).toBeLessThanOrEqual(200);
      expect(article.readingMinutes).toBeGreaterThanOrEqual(4);
      expect(article.related.length).toBeGreaterThan(0);
      for (const slug of article.related) expect(getArticle(slug), `${article.slug} -> ${slug}`).toBeDefined();
    }
  });

  it("every internal link in articles and legal pages points to an existing route", () => {
    const known = new Set(["/", ...publicRoutes().map((route) => route.path)]);
    const sources = [...ARTICLES.map((a) => a.body), ...LEGAL_DOCUMENTS.map((d) => d.body)];
    for (const source of sources) {
      for (const match of source.matchAll(/\]\((\/[^)\s#]*)/g)) expect(known, match[1]).toContain(match[1]);
    }
  });
});

describe("markdown renderer", () => {
  it("parses headings, lists, tables and callouts", () => {
    const blocks = parseMarkdown("## Título uno\n\nTexto **fuerte**.\n\n- a\n- b\n\n1. x\n2. y\n\n> nota\n\n| A | B |\n|---|---|\n| 1 | 2 |\n");
    expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "list", "list", "callout", "table"]);
    expect(blocks[0]).toMatchObject({ level: 2, id: "titulo-uno" });
    expect(blocks[5]).toMatchObject({ header: ["A", "B"], rows: [["1", "2"]] });
  });

  it("opens only external links in a new tab and never renders raw HTML", () => {
    const html = renderToString(<p>{renderInline("[ext](https://example.com) [int](/tools) <script>x</script>")}</p>);
    expect(html).toContain('href="https://example.com" target="_blank" rel="noopener noreferrer"');
    expect(html).toMatch(/href="\/tools\/"(?! target)/);
    expect(html).not.toContain("<script>");
  });
});

describe("SEO and prerender", () => {
  it("lists every public page with head metadata and no private areas", () => {
    const routes = publicRoutes();
    expect(routes.length).toBe(1 + 3 + 1 + 13 + 1 + 1 + 12 + 1 + 7 + 4 + 2);
    for (const route of routes) {
      const head = headForPath(route.path);
      expect(head, route.path).not.toBeNull();
      expect(head!.title.length).toBeLessThanOrEqual(110);
      expect(head!.description.length).toBeGreaterThan(50);
      expect(route.path).not.toMatch(/^\/(admin|settings|auth|dashboard|login|register)/);
    }
    expect(headForPath("/admin")).toBeNull();
    expect(headForPath("/academy/no-existe")).toBeNull();
  });

  it("emits Article + BreadcrumbList JSON-LD for articles and canonical/OG tags", () => {
    const tags = renderHeadTags(headForPath("/academy/como-negociar-salario")!);
    expect(tags).toContain('<link rel="canonical" href="https://prosolutions.page/academy/como-negociar-salario/" />');
    expect(tags).toContain('<meta property="og:type" content="article" />');
    expect(tags).toContain('"@type":"Article"');
    expect(tags).toContain('"@type":"BreadcrumbList"');
    expect(tags).toContain('"datePublished":"2026-11-18"');
  });

  it("emits BreadcrumbList for tools and legal pages", () => {
    for (const path of ["/tools/salario-neto", "/legal/privacidad"]) {
      expect(renderHeadTags(headForPath(path)!)).toContain('"@type":"BreadcrumbList"');
    }
  });

  it("gives the landing page its own canonical, WebSite JSON-LD and social image", () => {
    const tags = renderHeadTags(headForPath("/")!);
    expect(tags).toContain('<link rel="canonical" href="https://prosolutions.page/" />');
    expect(tags).toContain('"@type":"WebSite"');
    expect(tags).toContain('<meta property="og:image" content="https://prosolutions.page/og-image.png" />');
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(renderRoute("/")).toContain("<h1");
  });

  it("landing sends guests to the guest editor and searches ProJobs", () => {
    const html = renderRoute("/");
    expect(html).toContain(`href="${APP_URLS.procvEditor}"`);
    expect(html).toContain(`action="${APP_URLS.projobs}" method="get"`);
    expect(html).toContain('name="q"');
    expect(html).toContain('name="location"');
    expect(html).toContain(`href="${RESOURCE_URLS.createCv}"`);
  });

  it("create-CV page is prerendered with SoftwareApplication data and links to the editor", () => {
    const tags = renderHeadTags(headForPath("/crear-hoja-de-vida")!);
    expect(tags).toContain('<link rel="canonical" href="https://prosolutions.page/crear-hoja-de-vida/" />');
    expect(tags).toContain('"@type":"SoftwareApplication"');
    const html = renderRoute("/crear-hoja-de-vida");
    expect(html).toContain("Crea tu hoja de vida gratis");
    expect(html).toContain(`href="${APP_URLS.procvEditor}"`);
    expect(html).toContain('href="/plantillas-hoja-de-vida/"');
    expect(html).toContain('href="/formato-unico-hoja-de-vida/"');
  });

  it("format landing pages are prerendered with FAQ data and open the editor with their template", () => {
    const dafpTags = renderHeadTags(headForPath("/formato-unico-hoja-de-vida")!);
    expect(dafpTags).toContain('<link rel="canonical" href="https://prosolutions.page/formato-unico-hoja-de-vida/" />');
    expect(dafpTags).toContain('"@type":"FAQPage"');
    expect(renderRoute("/formato-unico-hoja-de-vida")).toContain(`href="${APP_URLS.procvEditor}?plantilla=dafp"`);
    expect(renderRoute("/hoja-de-vida-formato-1003")).toContain(`href="${APP_URLS.procvEditor}?plantilla=employment"`);
    const gallery = renderRoute("/plantillas-hoja-de-vida");
    for (const key of ["dafp", "employment", "ats", "sidebar"]) expect(gallery).toContain(`src="/plantillas/${key}.webp"`);
    expect(renderHeadTags(headForPath("/plantillas-hoja-de-vida")!)).toContain('"@type":"ItemList"');
  });

  it("prima calculator is listed and prerendered", () => {
    expect(headForPath("/tools/prima")!.title).toMatch(/prima de servicios/i);
    expect(renderRoute("/tools/prima")).toContain("Prima de servicios");
    expect(renderRoute("/tools")).toContain('href="/tools/prima/"');
  });

  it("escapes JSON-LD against script breakouts", () => {
    expect(safeJsonLd({ text: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });

  it.each(publicRoutes().map((route) => route.path))("server-renders %s with an h1 and no ad markup", (path) => {
    const html = renderRoute(path);
    expect(html).toContain("<h1");
    expect(html).not.toContain("adsbygoogle");
    expect(html).not.toContain('aria-label="Publicidad"');
  });

  it("links public pages only through their trailing-slash URL (served as /route/index.html)", () => {
    const publicPaths = new Set(publicRoutes().map((route) => route.path));
    for (const path of ["/academy", "/academy/hoja-de-vida-ats-2026", "/tools/evaluador-cv", "/legal/cookies"]) {
      const html = renderRoute(path);
      for (const match of html.matchAll(/href="(\/[^"#?]*)"/g)) {
        const href = match[1]!;
        if (href === "/" || href.endsWith("/")) continue;
        expect(publicPaths.has(href), `${path} links to ${href} without a trailing slash`).toBe(false);
      }
    }
  });

  it("renders the full article body on the server", () => {
    const html = renderRoute("/academy/preguntas-entrevista-metodo-star");
    expect(html).toContain("Las 20 preguntas más frecuentes");
    expect(html).toContain("Equipo editorial de ProSolutions");
  });
});

describe("forms", () => {
  const valid = { topic: "datos-personales", name: "Ana Pérez", email: "ana@example.com", message: "Quiero conocer qué datos tienen sobre mí.", acceptPrivacyPolicy: true, website: "" };

  it("validates the contact form like the server does", () => {
    expect(validateContact(valid)).toEqual({});
    const errors = validateContact({ ...valid, topic: "x", name: "A", email: "ana@", message: "corto", acceptPrivacyPolicy: false });
    expect(Object.keys(errors).sort()).toEqual(["acceptPrivacyPolicy", "email", "message", "name", "topic"]);
  });

  it("validates the AdSense publisher id before saving", () => {
    const placements = { "academy-article": true, "academy-index": true, "tools-result": true, "jobs-listing": true };
    expect(validateAdsSettings({ enabled: true, publisherId: "ca-pub-1234567890123456", placements })).toBeNull();
    expect(validateAdsSettings({ enabled: false, publisherId: null, placements })).toBeNull();
    expect(validateAdsSettings({ enabled: true, publisherId: "", placements })).toMatch(/Publisher ID/);
    expect(validateAdsSettings({ enabled: false, publisherId: "pub-123", placements })).toMatch(/ca-pub/);
  });

  it("parses Colombian money input", () => {
    expect(parseMoney("4.500.000")).toBe(4_500_000);
    expect(parseMoney("$ 1,750,905")).toBe(1_750_905);
    expect(parseMoney("")).toBe(0);
  });
});
