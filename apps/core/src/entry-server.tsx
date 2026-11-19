/**
 * Build-time renderer (vite build --ssr). scripts/prerender.mjs imports this
 * bundle to write static HTML for every public route, so crawlers and
 * visitors get full content, title, meta tags and JSON-LD without running
 * JavaScript. Browser-only effects (session, consent, ads) do not run here.
 */
import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { AppRoutes } from "./App";
import { CoreLocaleProvider } from "./i18n";
import { headForPath, publicRoutes, renderHeadTags } from "./public/seo";
import { SITE } from "./content/site";

export function render(url: string): { html: string; head: string } {
  const head = headForPath(url);
  if (!head) throw new Error(`No public head metadata for ${url}`);
  const html = renderToString(
    <StrictMode>
      <CoreLocaleProvider>
        <StaticRouter location={url}>
          <AppRoutes />
        </StaticRouter>
      </CoreLocaleProvider>
    </StrictMode>,
  );
  return { html, head: renderHeadTags(head) };
}

export { publicRoutes, SITE };
