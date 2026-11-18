# QA gateway (Cloudflare Worker)

Serves the QA environment under `prosolutions.page` subdomains so cross-module SSO works like production, without using Render custom domains (free plan: 2 per workspace, all used by production).

| Public QA hostname | Render service (unchanged) |
|---|---|
| `qa.prosolutions.page` | ProSolutions-QA (Core) → `prosolutions-qa-portal.onrender.com` |
| `identity-qa.prosolutions.page` | ProIdentity-QA → `proidentity-qa-v2.onrender.com` |
| `procv-qa.prosolutions.page` | ProCVFrontEnd-QA → `prosolutions-qa-preview.onrender.com` |
| `projobs-qa.prosolutions.page` | ProJobs-QA → `projobs-qa.onrender.com` |

APIs that authenticate with bearer tokens (ProCV backend QA, ProJobs API QA) stay on their onrender.com URLs; they only need the new origins in `CORS_ORIGIN`.

## Required ProIdentity-QA settings

- `COOKIE_DOMAIN=.prosolutions.page`, `COOKIE_SAME_SITE=lax`
- `COOKIE_NAME_SUFFIX=_qa` → cookies `refreshToken_qa` / `csrfToken_qa`, so QA never overwrites production's `refreshToken` / `csrfToken` on the shared parent domain. **Never set `COOKIE_DOMAIN=.prosolutions.page` in QA without the suffix.**
- `ALLOWED_ORIGINS` / `ADDITIONAL_ALLOWED_ORIGINS` include the three QA frontends.

## Cloudflare resources (zone `prosolutions.page`)

- Worker script `prosolutions-qa-gateway` (this `worker.js`, ES module).
- Worker routes `<hostname>/*` → `prosolutions-qa-gateway` for the four hostnames.
- DNS: proxied `AAAA <hostname> 100::` placeholder records (the Worker answers every request).

Free plan limit: 100,000 Worker requests/day. Known QA trade-off: ProIdentity's per-IP rate limiting sees Cloudflare egress IPs, so QA users behind the gateway share limits.
