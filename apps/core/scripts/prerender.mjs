#!/usr/bin/env node
/**
 * Static site generation for Core's public pages. Runs after:
 *   vite build                                              -> dist/ (SPA shell)
 *   vite build --ssr src/entry-server.tsx --outDir dist-ssr -> server renderer
 *
 * Writes:
 *   dist/index.html          landing page (full HTML, replaces the SPA shell)
 *   dist/app.html            noindex SPA shell for the catch-all rewrite (/* -> /app.html)
 *   dist/<route>/index.html  full HTML (content + title, meta, OG, JSON-LD)
 *   dist/sitemap.xml         sitemap index (Core pages + other public apps)
 *   dist/sitemap-pages.xml   Core public pages
 *   dist/robots.txt          crawl rules (private areas disallowed)
 *   dist/ads.txt             only when ADS_TXT_CONTENT is set (else 404)
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const ssrEntry = join(root, "dist-ssr", "entry-server.js");

if (!existsSync(join(dist, "index.html")) || !existsSync(ssrEntry)) {
  console.error("prerender: run `vite build` and `vite build --ssr src/entry-server.tsx --outDir dist-ssr` first.");
  process.exit(1);
}

const { render, publicRoutes, SITE } = await import(pathToFileURL(ssrEntry).href);
// A previous run already replaced dist/index.html with the landing page; the
// untouched shell then lives in app.html (same markup, empty #root), which
// keeps this script idempotent.
const shellPath = existsSync(join(dist, "app.html")) ? join(dist, "app.html") : join(dist, "index.html");
const template = readFileSync(shellPath, "utf8");

const SEO_BLOCK = /<!--seo:start-->[\s\S]*?<!--seo:end-->/;
const ROOT_DIV = '<div id="root"></div>';
if (!SEO_BLOCK.test(template) || !template.includes(ROOT_DIV)) {
  console.error("prerender: dist/index.html must contain the <!--seo:start-->…<!--seo:end--> block and an empty #root.");
  process.exit(1);
}

// SPA shell for every URL that is not a prerendered page (app screens such as
// /login or /dashboard, unknown paths, public paths without the trailing
// slash). It must never be indexed: the static host's catch-all rewrite
// points here (/* -> /app.html), so without noindex every unknown URL would be
// a soft-404 copy of the landing page.
const APP_SHELL_HEAD = [
  "<title>ProSolutions</title>",
  '<meta name="robots" content="noindex, follow" />',
].join("\n    ");
writeFileSync(join(dist, "app.html"), template.replace(SEO_BLOCK, `<!--seo:start-->\n    ${APP_SHELL_HEAD}\n    <!--seo:end-->`));

const writePage = (path, { html, head }) => {
  if (!html.includes("<h1")) throw new Error(`prerender: ${path} rendered without an <h1>`);
  const page = template
    .replace(SEO_BLOCK, `<!--seo:start-->\n    ${head}\n    <!--seo:end-->`)
    .replace(ROOT_DIV, `<div id="root">${html}</div>`);
  const outDir = join(dist, path.replace(/^\//, ""));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), page);
};

// The landing page replaces dist/index.html (served for "/").
writePage("/", render("/"));

const routes = publicRoutes();
for (const route of routes) writePage(route.path, render(route.path));

const xmlEscape = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Deterministic dates: the newest content date, not the build time.
const today = routes.reduce((max, route) => (route.lastmod > max ? route.lastmod : max), "1970-01-01");

const urls = [
  { path: "/", lastmod: today, priority: 1, changefreq: "weekly" },
  ...routes,
].map(
  (route) =>
    `  <url><loc>${xmlEscape(`${SITE.url}${route.path === "/" ? "/" : `${route.path}/`}`)}</loc><lastmod>${route.lastmod}</lastmod><changefreq>${route.changefreq}</changefreq><priority>${route.priority.toFixed(1)}</priority></url>`,
);
writeFileSync(
  join(dist, "sitemap-pages.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
);

// Sitemap index: Core pages plus the other public apps of the ecosystem
// (same registrable domain, covered by a Search Console domain property).
const extraSitemaps = (process.env.EXTRA_SITEMAPS ?? "https://procv.prosolutions.page/sitemap.xml,https://projobs.prosolutions.page/sitemap.xml")
  .split(",")
  .map((url) => url.trim())
  .filter((url) => /^https:\/\/([a-z0-9-]+\.)*prosolutions\.page\//.test(url));
const sitemapIndex = [`${SITE.url}/sitemap-pages.xml`, ...extraSitemaps]
  .map((loc) => `  <sitemap><loc>${xmlEscape(loc)}</loc><lastmod>${today}</lastmod></sitemap>`)
  .join("\n");
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapIndex}\n</sitemapindex>\n`,
);

// Private areas only. The sign-in screens (/login, /register,
// /forgot-password, /reset-password, /verify-email, /auth) must stay
// crawlable: they are served by the noindex app shell, and blocking them made
// Google index them anyway from links ("indexed, though blocked by
// robots.txt"), without ever reading their noindex.
const disallow = [
  "/admin",
  "/settings",
  "/dashboard",
  "/modules",
  "/security",
];
writeFileSync(
  join(dist, "robots.txt"),
  ["User-agent: *", "Allow: /", ...disallow.map((path) => `Disallow: ${path}`), "", `Sitemap: ${SITE.url}/sitemap.xml`, ""].join("\n"),
);

// ads.txt is published only from configuration; without it the file does not
// exist (404) instead of advertising a stale or wrong publisher.
const adsTxt = (process.env.ADS_TXT_CONTENT ?? "").replace(/\\n/g, "\n").trim();
const adsTxtPath = join(dist, "ads.txt");
if (adsTxt) {
  if (!/^[a-z0-9.-]+,\s*(pub-\d+|[\w-]+),\s*(DIRECT|RESELLER)(,\s*[\w]+)?$/im.test(adsTxt)) {
    console.error("prerender: ADS_TXT_CONTENT does not look like an ads.txt record (e.g. google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0).");
    process.exit(1);
  }
  writeFileSync(adsTxtPath, `${adsTxt}\n`);
} else if (existsSync(adsTxtPath)) {
  rmSync(adsTxtPath);
}

console.log(`prerender: ${routes.length} pages, sitemap.xml (${extraSitemaps.length + 1} sitemaps), robots.txt${adsTxt ? ", ads.txt" : " (ads.txt not published: ADS_TXT_CONTENT is empty)"}.`);
