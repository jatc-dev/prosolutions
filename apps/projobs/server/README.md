# ProJobs API v2

Job marketplace and lightweight ATS for ProSolutions. Express + `pg` (no ORM), PostgreSQL on Neon.

## Responsibilities and boundaries

| Concern | Owner | How ProJobs uses it |
|---|---|---|
| Accounts, sessions, roles | **ProIdentity** | Verifies access tokens locally (HS256, issuer, audience, expiry). Capabilities come from the `modules[]` claim: `PROJOBS` = candidate, `PRORECRUIT` = recruiter (granted by an admin through `POST /api/modules/grant`). |
| CV data | **ProCV** | One-click apply calls `GET /api/cvs` and `GET /api/cvs/:id` on ProCV **with the candidate's own bearer token**; an immutable snapshot is stored with the application. |
| Jobs, companies, applications, pipeline | **ProJobs** | Dedicated `projobs` database. |

Company-level authorization (who can manage which company/jobs) is ProJobs domain data (`company_members`), enforced in SQL and by row level security.

## API

Public (optional auth adds `viewer` flags):
- `GET /api/jobs` — instant search. Params: `q`, `workplace`, `type`, `seniority`, `skills`, `mySkills`, `country`, `location`, `salaryMin`, `postedWithin`, `sort=relevance|recent|salary|match`, `page`, `pageSize`. Returns items + facets.
- `GET /api/jobs/:idOrSlug` — detail + similar jobs. `GET /api/companies/:slug`.

Candidate (`PROJOBS`): `GET /api/me`, `GET /api/me/cvs`, `GET /api/me/skills`, `GET /api/jobs/:id/match?cvId=`, `POST /api/jobs/:id/applications` (`{cvId}` or `{profile}`), `GET /api/me/applications`, `POST /api/me/applications/:id/withdraw`, `GET|PUT|DELETE /api/me/saved-jobs[/:jobId]`.

Employer (`PRORECRUIT`): `GET|POST /api/employer/companies`, `PATCH /api/employer/companies/:id`, `GET|POST /api/employer/jobs`, `GET|PUT /api/employer/jobs/:id`, `POST /api/employer/jobs/:id/publish|close`, `GET /api/employer/jobs/:id/applications`, `PATCH /api/employer/applications/:id` (`{stage, note}`).

Internal (service token): `GET /internal/events?after=<id>&limit=` — transactional outbox (`projobs.job.published|closed`, `projobs.application.submitted|stage_changed|withdrawn`).

Contracts: [`src/contracts.ts`](src/contracts.ts) (pure types shared with the web app and future modules).

## Database

`migrations/001_projobs_v2.sql`: companies, company_members, jobs (generated `tsvector` + GIN indexes, partial index on published jobs), applications (+ events), saved_jobs, outbox_events. Candidate-private tables use RLS bound to `projobs.user_id`; every request runs in a transaction that assumes the restricted role `projobs_api`.

## Commands

```bash
npm ci --workspaces=false   # standalone lockfile (same as Render)
npm run dev                 # no DATABASE_URL -> in-memory PGlite with demo data
npm test                    # vitest: real PostgreSQL (PGlite) incl. RLS under projobs_api
npm run build && npm start
MIGRATION_DATABASE_URL=<owner URL> npm run migrate
MIGRATION_DATABASE_URL=<owner URL> SEED_RECRUITER_ID=<user id> npm run seed   # QA/dev only
```

See [.env.example](.env.example) for configuration.
