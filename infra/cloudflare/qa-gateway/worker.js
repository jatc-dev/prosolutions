/**
 * ProSolutions QA gateway (Cloudflare Worker).
 *
 * Render's free plan allows two custom domains per workspace and production
 * uses them all, so QA services only have *.onrender.com hostnames. Because
 * onrender.com is a public suffix, every QA app was a different "site" and the
 * ProIdentity refresh cookie became a blocked third-party cookie (no SSO).
 *
 * This Worker serves the QA apps under first-level subdomains of
 * prosolutions.page (same site, covered by Cloudflare's free certificate) and
 * proxies each one to its unchanged onrender.com service. ProIdentity QA then
 * sets its cookies on ".prosolutions.page" with a "_qa" name suffix so they
 * never overwrite production cookies.
 */
const UPSTREAMS = {
  'qa.prosolutions.page': 'prosolutions-qa-portal.onrender.com',
  'identity-qa.prosolutions.page': 'proidentity-qa-v2.onrender.com',
  'procv-qa.prosolutions.page': 'prosolutions-qa-preview.onrender.com',
  'projobs-qa.prosolutions.page': 'projobs-qa.onrender.com',
};

const PUBLIC_HOST = Object.fromEntries(Object.entries(UPSTREAMS).map(([pub, up]) => [up, pub]));

/** Keep redirects on the public QA hostname instead of leaking the onrender.com origin. */
function rewriteLocation(location) {
  try {
    const target = new URL(location);
    const publicHost = PUBLIC_HOST[target.hostname];
    if (publicHost) target.hostname = publicHost;
    return target.toString();
  } catch {
    return location; // relative redirects need no rewriting
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const upstream = UPSTREAMS[url.hostname];
    if (!upstream) return new Response('Not found', { status: 404 });

    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.set('X-Forwarded-Host', url.hostname);
    headers.set('X-Forwarded-Proto', 'https');

    const hasBody = !['GET', 'HEAD'].includes(request.method);
    const response = await fetch(`https://${upstream}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
    });

    const proxied = new Response(response.body, response);
    const location = proxied.headers.get('Location');
    if (location) proxied.headers.set('Location', rewriteLocation(location));
    // QA must never be indexed by search engines.
    proxied.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return proxied;
  },
};
