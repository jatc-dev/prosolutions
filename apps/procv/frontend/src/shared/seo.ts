import { useEffect } from "react";
import type { PlatformModule } from "./config/platform";

export interface SeoOptions {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  jsonLd?: Array<Record<string, unknown>>;
}

const SITE_ORIGIN = "https://procv-platform.onrender.com";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function upsertJsonLd(payload: Array<Record<string, unknown>>) {
  document.head.querySelectorAll("script[data-seo-jsonld]").forEach((node) => node.remove());
  payload.forEach((entry, index) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-jsonld", String(index));
    script.textContent = JSON.stringify(entry);
    document.head.appendChild(script);
  });
}

/** Applies per-page SEO metadata: title, description, canonical, keywords and JSON-LD. */
export function useSeo({ title, description, path, keywords, jsonLd }: SeoOptions) {
  useEffect(() => {
    document.title = title;
    upsertMeta("name", "description", description);
    if (path) upsertLink("canonical", `${SITE_ORIGIN}${path}`);
    if (keywords && keywords.length > 0) upsertMeta("name", "keywords", keywords.join(", "));
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    if (jsonLd && jsonLd.length > 0) upsertJsonLd(jsonLd);
  }, [title, description, path, keywords, jsonLd]);
}

export function softwareApplicationSchema(module?: PlatformModule): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: module ? module.name : "ProCV",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    ...(module ? { description: module.description, url: `${SITE_ORIGIN}${module.path}` } : {}),
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ProSolutions",
    url: SITE_ORIGIN,
    brand: { "@type": "Brand", name: "ProSolutions" },
  };
}
