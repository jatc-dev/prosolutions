# ProSolutions — Agent Context

Shared context for every agent working in this repository (Claude Code reads `CLAUDE.md`, which builds on this file). Keep it current: when something here stops being true, fix it in the same change.

## 1. Workflow

- Work directly on the `qa` branch (it deploys the QA environment). Do not create feature branches.
- Do NOT work on `main`. Production is promoted with a `qa` → `main` pull request.
- Do NOT commit, push, merge, reset, clean, force-push, drop stashes or touch worktrees without explicit authorization from the owner.
- Conventional Commits: `feat(scope):`, `fix(scope):`, `docs(scope):`, `chore(scope):`, `refactor(scope):`, `test(scope):`.
- Run lint + tests of every affected workspace before calling work done, and report real results.

## 2. Architecture

| Module | Path | Stack | Local port |
|---|---|---|---|
| Core (portal, public pages, admin) | `apps/core` | React 18, Vite, Tailwind, Vitest; public pages prerendered (SSR at build) | 5174 |
| ProIdentity (auth) | `apps/identity` | Express, Prisma 5.22, bcrypt, JWT, nodemailer | 4001 |
| ProCV frontend | `apps/procv/frontend` | React 18, Vite, Zustand, i18next, Vitest | 5173 |
| ProCV backend | `apps/procv/backend` | Express, Prisma 5.22, Puppeteer, mammoth, pdf-parse, Jest | 4000 |
| ProJobs web | `apps/projobs` | React 18, Vite, Tailwind, Vitest | 5175 |
| ProJobs API | `apps/projobs/server` | Express + `pg` (no ORM), zod, SQL migrations, RLS, Vitest + PGlite; own lockfile | 5176 |
| Shared UI | `packages/ui` | Design tokens, header/footer, consent, ads, links | — |

Node.js 22 everywhere (`.node-version`, `engines: 22.x`, Docker `node:22`, CI).

## 3. Databases

- Neon project `Prosolutions.page`, branch `production`; separate databases `proidentity`, `procv`, `projobs`. QA uses the Neon project `prosolutions-qa`.
- No Render service runs migrations on start: apply them in Neon by hand before merging (see `docs/deployment/ETAPA3_DEPLOY.md` §3). Breaking migrations go in two phases.
- Never read or print `.env` files or secrets. Do not run migrations against QA/production without authorization.

## 4. Commands (repository root)

```
npm install
npm run dev:core | dev:identity | dev:procv | dev:projobs
npm run build:ui | build:core | build:procv | build:projobs
npm run test --workspace=apps/core                 # Vitest
npm run test:regression --prefix apps/identity     # tsx --test (run `npx prisma generate` in apps/identity first)
npm --prefix apps/procv/backend test               # Jest
npm --prefix apps/procv/frontend test              # Vitest
npm test --prefix apps/projobs/server              # Vitest + PGlite
npm test --workspace=apps/projobs                  # Vitest
node packages/ui/scripts/check-palette.mjs         # design-system colour guard (CI)
```

`scripts/start-local.ps1` starts Core and ProCV in separate windows (it does not install dependencies).

## 5. Conventions

- ProIdentity is the only session authority: it issues JWTs (`iss` `https://identity.prosolutions.page`, `aud` `prosolutions-api`, `modules[]` claim) and SSO cookies on `.prosolutions.page`. Modules validate tokens locally.
- ProCV enforces RLS with a signed context (`PROCV_RLS_CONTEXT_KEY`) and restricted roles `procv_app` / `procv_admin_app`. ProJobs enforces RLS with its own runtime role.
- Never change RLS, auth or authorization as a side effect of frontend work.
- UI colours only from design tokens (`brand-*`, `slate-*`, `ui-*`); the palette guard fails CI otherwise.
- Public URLs carry a trailing slash (`/academy/`); prerendered pages are served as `/route/index.html`.
- New services or paid plans need an assessment of deployment and running cost.

## 6. Deployment

- Render is the source of truth. `render.yaml` documents the live configuration (reconciled 2026-11-20) but Blueprint Sync is NOT used.
- QA is served through the Cloudflare Worker `prosolutions-qa-gateway` (`qa.`, `identity-qa.`, `procv-qa.`, `projobs-qa.prosolutions.page`); all QA services deploy from `qa`.
- The production ProJobs API has auto-deploy off: deploy it by hand after merging.
- Free Render web services sleep after 15 minutes and share 750 instance hours per workspace per month.

## 7. Peer protocol

- Avoid editing the same files as another agent at the same time.
- Report modified files, dependencies and test results; document real results, not assumptions.
