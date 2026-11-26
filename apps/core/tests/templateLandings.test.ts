import { describe, expect, it } from "vitest";
import { TEMPLATE_LANDINGS } from "../src/content/templateLandings";
import { TEMPLATE_CARDS } from "../src/content/formats";
import { ARTICLES } from "../src/content/academy";
import { TOOLS } from "../src/content/tools";
import { headForPath, publicRoutes } from "../src/public/seo";

describe("template landing pages", () => {
  it("each one opens a real template and is listed in the sitemap", () => {
    const routes = publicRoutes().map((route) => route.path);
    for (const landing of TEMPLATE_LANDINGS) {
      expect(TEMPLATE_CARDS.some((card) => card.key === landing.template), landing.slug).toBe(true);
      expect(routes).toContain(`/plantillas-hoja-de-vida/${landing.slug}`);
      expect(landing.faq.length).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(TEMPLATE_LANDINGS.map((landing) => landing.slug)).size).toBe(TEMPLATE_LANDINGS.length);
  });

  it("links only to pages that exist", () => {
    const existing = new Set([
      ...ARTICLES.map((article) => `/academy/${article.slug}/`),
      ...TOOLS.map((tool) => `/tools/${tool.slug}/`),
      "/ejemplos-hoja-de-vida/",
    ]);
    for (const landing of TEMPLATE_LANDINGS) {
      for (const link of landing.related) expect(existing.has(link.to), `${landing.slug} → ${link.to}`).toBe(true);
    }
  });

  it("has its own title and FAQ structured data", () => {
    const head = headForPath("/plantillas-hoja-de-vida/formato-harvard")!;
    expect(head.title).toContain("formato Harvard");
    expect(head.jsonLd?.some((item) => item["@type"] === "FAQPage")).toBe(true);
    expect(headForPath("/plantillas-hoja-de-vida/no-existe")).toBeNull();
  });
});
