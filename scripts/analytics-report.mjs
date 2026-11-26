#!/usr/bin/env node
/**
 * Read-only usage report from Google Analytics 4 and Search Console.
 *
 *   node scripts/analytics-report.mjs [days=90]
 *
 * Needs (user environment, never in the repo):
 *   GOOGLE_APPLICATION_CREDENTIALS  path to the service-account JSON key
 *   GA_PROPERTY_ID                  numeric GA4 property id
 *   GSC_SITE_URL                    e.g. sc-domain:prosolutions.page
 * The service account only has "Lector" (GA4) and "Restringido" (Search
 * Console) access, and the token requests read-only scopes. No dependencies:
 * the OAuth token is signed with node:crypto.
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const days = Number(process.argv[2]) || 90;
const { GOOGLE_APPLICATION_CREDENTIALS: keyPath, GA_PROPERTY_ID: propertyId, GSC_SITE_URL: siteUrl } = process.env;
if (!keyPath || !propertyId || !siteUrl) {
  console.error("Faltan variables: GOOGLE_APPLICATION_CREDENTIALS, GA_PROPERTY_ID o GSC_SITE_URL.");
  process.exit(1);
}

const key = JSON.parse(readFileSync(keyPath, "utf8"));
const b64 = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly",
    aud: key.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64(claims)}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const response = await fetch(claims.aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Token: ${data.error_description || data.error || response.status}`);
  return data.access_token;
}

const token = await accessToken();
const post = async (url, body) => {
  const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);
  return data;
};

const range = [{ startDate: `${days}daysAgo`, endDate: "yesterday" }];
async function ga(title, dimensions, metrics, extra = {}) {
  try {
    const data = await post(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      dateRanges: range,
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      limit: extra.limit ?? 25,
      ...(extra.orderBy ? { orderBys: [extra.orderBy] } : { orderBys: [{ metric: { metricName: metrics[0] }, desc: true }] }),
      ...(extra.filter ? { dimensionFilter: extra.filter } : {}),
    });
    console.log(`\n## ${title}`);
    const rows = (data.rows || []).map((row) => [...(row.dimensionValues || []).map((v) => v.value), ...row.metricValues.map((v) => v.value)]);
    console.log([...dimensions, ...metrics].join(" | "));
    for (const row of rows) console.log(row.join(" | "));
    if (!rows.length) console.log("(sin datos)");
  } catch (error) {
    console.log(`\n## ${title}\n(no disponible: ${error.message})`);
  }
}

async function gsc(title, dimensions, rowLimit = 25) {
  try {
    const end = new Date(Date.now() - 3 * 86400000);
    const start = new Date(end.getTime() - days * 86400000);
    const iso = (date) => date.toISOString().slice(0, 10);
    const data = await post(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      startDate: iso(start), endDate: iso(end), dimensions, rowLimit,
    });
    console.log(`\n## ${title}`);
    console.log([...dimensions, "clicks", "impressions", "ctr", "position"].join(" | "));
    for (const row of data.rows || []) {
      console.log([...(row.keys || []), row.clicks, row.impressions, (row.ctr * 100).toFixed(1) + "%", row.position.toFixed(1)].join(" | "));
    }
    if (!data.rows?.length) console.log("(sin datos)");
  } catch (error) {
    console.log(`\n## ${title}\n(no disponible: ${error.message})`);
  }
}

console.log(`# Informe de uso — últimos ${days} días`);
await ga("Totales", [], ["activeUsers", "newUsers", "sessions", "screenPageViews", "engagementRate", "averageSessionDuration"], { orderBy: undefined, limit: 1 });
await ga("Usuarios por semana", ["isoYearIsoWeek"], ["activeUsers", "newUsers", "sessions"], { orderBy: { dimension: { dimensionName: "isoYearIsoWeek" } }, limit: 20 });
await ga("Por sitio (subdominio)", ["hostName"], ["activeUsers", "sessions", "screenPageViews"]);
await ga("Páginas más vistas", ["hostName", "pagePath"], ["screenPageViews", "activeUsers"], { limit: 30 });
await ga("Canales de llegada", ["sessionDefaultChannelGroup"], ["sessions", "activeUsers"]);
await ga("Fuente / medio", ["sessionSourceMedium"], ["sessions"], { limit: 15 });
await ga("Dispositivo", ["deviceCategory"], ["activeUsers", "sessions"]);
await ga("País", ["country"], ["activeUsers"], { limit: 10 });
await ga("Eventos", ["eventName"], ["eventCount", "totalUsers"], { limit: 40 });
await ga("Descargas por plantilla y formato", ["customEvent:template", "customEvent:format"], ["eventCount"], {
  filter: { filter: { fieldName: "eventName", stringFilter: { value: "document_download" } } },
});
await gsc("Search Console — consultas", ["query"], 30);
await gsc("Search Console — páginas", ["page"], 20);
await gsc("Search Console — dispositivo", ["device"], 5);
await gsc("Search Console — país", ["country"], 10);
