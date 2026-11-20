# ProSolutions — Master context

Architectural overview of the platform. Working rules live in `AGENTS.md` (and `CLAUDE.md` for Claude Code); service contracts in `docs/architecture/SERVICES.md`; local setup in `docs/development/LOCAL_ENVIRONMENT.md`.

## 1. Product

ProSolutions is a free employability platform for every sector, focused on Colombia and Latin America:

- **Core** — `prosolutions.page`: landing, ProAcademy guides, ProTools calculators (net salary, severance, contract comparison, CV checker), "create a CV" landing, legal pages, login, dashboard and ProAdmin.
- **ProCV** — `procv.prosolutions.page`: CV editor without sign-up (13 templates, 11 ATS-friendly, including the Colombian 1003 and Función Pública formats), cover letter (optional AI improvement when ANTHROPIC_API_KEY is set), suggested phrases by job family, import from PDF/Word, PDF and Word export.
- **ProJobs** — `projobs.prosolutions.page`: job board with its own offers (companies, applications, alerts, moderation) plus partner feeds (Jooble, Remotive; Careerjet pending).
- **ProIdentity** — `identity.prosolutions.page`: accounts, sessions, JWT/JWKS, Google sign-in, module access, consents, contact form.

## 2. Modules

| Module | Path | Runtime on Render |
|---|---|---|
| Core | `apps/core` | Static site (prerendered public pages + noindex SPA shell `app.html`) |
| ProIdentity | `apps/identity` | Docker (`apps/identity/Dockerfile`) |
| ProCV frontend | `apps/procv/frontend` | Static site |
| ProCV backend | `apps/procv/backend` | Docker (production `ProCV-API` and QA, same image) |
| ProJobs web | `apps/projobs` | Static site (`/sitemap.xml` rewritten to the API) |
| ProJobs API | `apps/projobs/server` | Node |
| Shared UI | `packages/ui` | Library consumed from source by every frontend |

## 3. Data

- **ProIdentity** (`apps/identity/prisma/schema.prisma`): users, sessions (hashed refresh tokens), module access, admin roles/permissions, consents, platform settings (ads), audit log.
- **ProCV** (`apps/procv/backend/prisma/schema.prisma`): CVs (JSON document incl. cover letter and 1003 data), versions, ATS analyses. Rows owned by the ProIdentity `sub`; RLS through a signed context.
- **ProJobs** (`apps/projobs/server/migrations/*.sql`): companies, jobs, applications, saved jobs, alerts, reports, outbox. RLS with a restricted runtime role. Partner offers are never stored.

## 4. Authentication

- Short-lived access JWT + HttpOnly refresh cookie issued by ProIdentity; ES256 with JWKS when configured, HS256 fallback.
- Modules verify signature, issuer, audience and expiry locally and authorize with the `modules[]` claim; ProJobs recruiters need `PRORECRUIT`.
- CSRF protection on state-changing routes and rate limiting in every API.

## 5. Infrastructure

- Render, two workspaces: ProSolutions-ProCV (Core, ProCV) and ProJobs-ProIdentity (ProIdentity, ProJobs). Region Oregon.
- Neon PostgreSQL: production project `Prosolutions.page` (branch `production`), QA project `prosolutions-qa`.
- Cloudflare: DNS, QA gateway Worker, email routing for `contacto@prosolutions.page`.
- Google: Search Console (domain property), AdSense (ownership meta tag; ads load only after consent).

## 6. Quality gates

GitHub Actions (`.github/workflows/core-build.yml`) builds and tests every module on pull requests, verifies the prerendered pages, sitemap, robots and ads policy, and runs the design-system palette guard.
