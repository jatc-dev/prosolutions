# ProJobs platform architecture

## Decision

**Keep a static, pre-rendered public job catalog; add a separate authenticated API and a dedicated ProJobs database for personal and transactional features. Do not rebuild the entire module as a server-rendered application yet.**

This is a deliberate hybrid architecture:
- Public search, filters, SEO metadata and job pages remain statically generated and served by the CDN.
- Job aggregation and normalization run as scheduled ingestion/build tasks, not in the request path.
- Saved jobs, application activity, preferences and future alerts use the ProJobs API.
- ProIdentity remains the only account/session/entitlement authority.
- ProJobs owns its product data in its own database project. It must not reuse ProIdentity credentials/tables or couple its schema to ProCV's CV data.

## Why not a static-only product?

A static catalog is fast, inexpensive to serve, cacheable and indexable. It is a good fit for public read-only listings and for the current aggregation sources (Arbeitnow and Remotive).

Static HTML alone cannot securely persist cross-device user state, enforce per-user ownership, manage saved searches/alerts, or provide a reliable application history. The existing Express API has JWT middleware, but the saved-jobs and applications routes were placeholders that returned generated IDs and empty lists. The API also was not present as a separate Render service in the inspected workspaces. Those are functional gaps, not reasons to throw away static delivery.

## Proposed deployment shape

1. **ProJobs web** — current Render Static Site. Serves public listings and SEO-friendly content.
2. **ProJobs API** — separate Render Web Service rooted at apps/projobs/server. Exposes /health, /api/saved-jobs, /api/applications, and later /api/job-alerts. Uses the same Identity issuer, audience (prosolutions-api) and signing secret as ProIdentity; each personal route requires the PROJOBS module entitlement.
3. **ProJobs data** — dedicated Neon database `projobs` in the existing `Prosolutions.page` project. The API connects with the restricted `projobs_login` role, switches to `projobs_api` inside each transaction, and relies on forced RLS. Browser clients never receive database credentials and do not query personal tables directly.
4. **Ingestion** — scheduled refresh of external sources, normalization, canonical URL deduplication, stale listing handling and source-health telemetry. The current static build can remain the first delivery path; move ingestion into a cron/worker when its schedule or volume outgrows build-time generation.

## Data boundaries and security

- user_id is the immutable sub claim from a validated ProIdentity JWT, never a body/query parameter.
- The API scopes every personal query by that subject.
- Public/anonymous users can browse and follow external apply links without an account.
- Saving a job requires a valid ProIdentity session with the PROJOBS entitlement.
- Clicking an external apply link is tracked as redirected_to_employer; ProJobs must not claim that an external application was submitted or accepted.
- Personal tables have RLS enabled and no browser-role policies. Only the server-side service role can access them.
- The Supabase service-role key must never be included in generated HTML, static environment variables, logs or client JavaScript.
- The dedicated Neon database `projobs` is provisioned and the schema/RLS migration has been applied. The saved-jobs and applications tables currently contain no user data. Do not apply 001_projobs_core.sql to the ProIdentity or ProCV databases.

## Phase plan

### Phase 1 — public discovery (current)
- Shared ProSolutions header/footer and responsive layout.
- Search/filter UX, stable identifiers and saved-job action.
- Keep public job browsing accessible to anonymous visitors.

### Phase 2 — persistence foundation (this branch)
- Dedicated-schema SQL for saved jobs and application activity.
- Server-side persistence adapter with safe 503 behavior until database credentials are configured.
- API routes persist and list only data owned by the authenticated Identity subject.
- Application action records an outbound application attempt but always lets the user reach the employer's site.
- Neon schema and RLS are now provisioned; deploy the API only after the restricted `projobs_login` connection and matching ProIdentity JWT settings are configured.

### Phase 3 — candidate product
- Saved-jobs page and application activity/history UI.
- Search alerts (email + frequency preferences), consent and unsubscribe.
- Job freshness/expiry status and better source attribution.
- Job detail pages with structured data only when the listing data and publisher terms support it.
- Monitoring for source failures, empty catalog, duplicate rate, expired listings and broken apply URLs.

### Phase 4 — scale if evidence requires it
Consider replacing static public delivery with a dynamic application only if there is a demonstrated need for personalized ranking at request time, high-frequency updates, complex server-side search, or a sustained catalog volume that makes build-time generation unsuitable. Prefer adding a search index or ingestion worker before a full rewrite.

## Acceptance criteria before production API rollout

- The dedicated Neon `projobs` database exists, the migration is applied, and a real Neon transaction smoke test verified row-level isolation.
- ProJobs API is deployed as a separate Render Web Service (not yet completed).
- IDENTITY_JWT_SECRET matches ProIdentity; IDENTITY_ISSUER=https://identity.prosolutions.page; IDENTITY_AUDIENCE=prosolutions-api.
- The public static service points PROJOBS_API_URL at the API origin.
- API verifies no token (401), wrong entitlement (403), user A cannot read/delete user B's data, invalid external URLs are rejected, and database outage returns a safe 503.
- Smoke tests pass against the deployed /health, saved-job create/list/delete, and application activity create/list routes.
