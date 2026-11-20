# Services — inventory and contracts

Services, runtimes, databases and integration contracts. Render's dashboard is the source of truth for deployed services; `render.yaml` documents it (reconciled 2026-11-20, no Blueprint Sync).

## 1. Service catalog

| Service | Path | Production (Render) | QA (Render, via Cloudflare Worker) | Local port |
|---|---|---|---|---|
| Core | `apps/core` | Static site `ProSolutions` → prosolutions.page | `ProSolutions-QA` → qa.prosolutions.page | 5174 |
| ProIdentity | `apps/identity` | Docker `ProIdentity` → identity.prosolutions.page | `ProIdentity-QA` → identity-qa.prosolutions.page | 4001 |
| ProCV frontend | `apps/procv/frontend` | Static site `ProCVFrontEnd` → procv.prosolutions.page | `ProCVFrontEnd-QA` → procv-qa.prosolutions.page | 5173 |
| ProCV backend | `apps/procv/backend` | Node `ProCVBackEnd` (procvbkn.onrender.com) | Docker `ProCVBackEnd-QA` | 4000 |
| ProJobs web | `apps/projobs` | Static site `ProJobs` → projobs.prosolutions.page | `ProJobs-QA` → projobs-qa.prosolutions.page | 5175 |
| ProJobs API | `apps/projobs/server` | Node `ProJobs API` (projobs-api-0clw.onrender.com, manual deploys) | `ProJobs-API-QA` | 5176 |

All web services run on the free plan (sleep after 15 minutes; 750 instance hours per workspace per month).

## 2. Databases (Neon)

| Database | Schema source | Runtime access |
|---|---|---|
| `proidentity` | `apps/identity/prisma/schema.prisma` + `prisma/migrations` | Prisma |
| `procv` | `apps/procv/backend/prisma/schema.prisma` | Prisma, restricted roles `procv_app` / `procv_admin_app`, RLS via signed context |
| `projobs` | `apps/projobs/server/migrations/*.sql` | `pg`, restricted runtime role, RLS |

Migrations are applied by hand in Neon before merging; no service migrates on start.

## 3. Key endpoints

### ProIdentity
- `GET /health`, `GET /health/db`
- `POST /api/auth/register | login | refresh | logout`, `GET /api/auth/me`, Google sign-in, password reset, email verification
- `GET /.well-known/jwks.json` (ES256 keys when configured)
- `POST /api/auth/introspect` (module backends)
- `/api/account/*` (data export, deletion, consents), `/api/public/*` (platform settings, contact form)
- `/api/admin/*` (roles, permissions, platform settings, ProJobs moderation proxy)

### ProCV backend
- `GET /health`
- `GET|POST /api/cvs`, `GET|PUT|DELETE /api/cvs/:id`, `POST /api/cvs/:id/versions`, `POST /api/cvs/:id/ats-analysis`
- `POST /api/ai/improve` (authenticated, rate limited), `GET /api/ai/status`
- `GET /api/me`, `/api/admin/*`, `GET /api/csrf-token`

### ProJobs API
- Public: `GET /api/jobs`, `GET /api/jobs/:idOrSlug`, `GET /api/companies/:slug`, `POST /api/jobs/:jobId/reports`, `GET /api/sitemap.xml`, `GET /api/alerts/unsubscribe`, `GET /api/external-jobs` (Jooble/Remotive/Careerjet, see `docs/deployment/EXTERNAL_JOBS.md`)
- Candidate: `/api/me`, `/api/me/cvs`, `/api/me/skills`, `/api/jobs/:jobId/match`, `/api/jobs/:jobId/applications`, `/api/me/applications`, `/api/me/saved-jobs`, `/api/me/alerts`, `/api/me/export`
- Employer (`PRORECRUIT`): `/api/employer/companies`, `/api/employer/jobs` (create, publish, close), `/api/employer/jobs/:jobId/applications`, `/api/employer/applications/:applicationId`
- Internal (`PROJOBS_INTERNAL_TOKEN`, used by ProIdentity): `/internal/events`, company verification, job moderation

## 4. Integration contracts

- **JWT (ProIdentity → modules):** claims `iss`, `aud`, `sub`, `email`, `role`, `modules[]`, `iat`, `exp`. Each module verifies signature, issuer, audience and expiry; entitlements come from `modules[]`, never from client input.
- **ProCV RLS context:** the backend signs a 60-second context (HMAC-SHA256, `PROCV_RLS_CONTEXT_KEY`, kid `v1`) and sets it inside each transaction; PostgreSQL verifies it with `procv_private.verified_context()` before RLS policies apply.
- **ProJobs → ProCV:** ProJobs reads the candidate's CVs from ProCV with the candidate's own bearer token (no stored credentials).
- **ProIdentity → ProJobs:** server-to-server calls with `PROJOBS_INTERNAL_TOKEN` for moderation.

## 5. Build and test

| Service | Build | Test |
|---|---|---|
| Core | `npm run build --workspace=apps/core` (tsc, Vite, SSR, prerender) | `npm run test --workspace=apps/core` |
| ProIdentity | `npm run build --workspace=apps/identity` | `npm run test:regression --prefix apps/identity` |
| ProCV frontend | `npm run build --workspace=apps/procv/frontend` | `npm --prefix apps/procv/frontend test` |
| ProCV backend | `npm --prefix apps/procv/backend run build` | `npm --prefix apps/procv/backend test` |
| ProJobs web | `npm run build --workspace=apps/projobs` | `npm test --workspace=apps/projobs` |
| ProJobs API | `npm run build --prefix apps/projobs/server` | `npm test --prefix apps/projobs/server` |
