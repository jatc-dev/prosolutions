# Local development environment

How to run ProSolutions on a development machine. No credentials are recorded here.

## 1. Prerequisites

- Node.js 22 (`.node-version`; every `package.json` declares `engines: 22.x`).
- npm with workspaces. Install once from the repository root: `npm install`. The ProJobs API has its own lockfile: `npm install --prefix apps/projobs/server`.
- Optional: local PostgreSQL for ProIdentity/ProCV backends. Without `DATABASE_URL`, the ProJobs API uses an in-memory PGlite database.

## 2. Environment files (never read, print or commit their values)

Copy each `.env.example` to `.env` (or `.env.local` for Vite apps) and fill in local, non-production values:

- `apps/identity/.env.example`
- `apps/procv/backend/.env.example`, `apps/procv/frontend/.env.example`
- `apps/projobs/server/.env.example`

Core needs no env file for local work. Never copy production values into local files.

## 3. Running

| Command | Service | Port |
|---|---|---|
| `npm run dev:core` | Core (proxies `/api` to ProIdentity QA) | 5174 |
| `npm run dev:identity` | ProIdentity | 4001 |
| `npm run dev:procv` | ProCV frontend + backend | 5173 / 4000 |
| `npm run dev:projobs` | ProJobs web | 5175 |
| `npm run dev --prefix apps/projobs/server` | ProJobs API (PGlite without `DATABASE_URL`) | 5176 |

`scripts/start-local.ps1` opens Core and ProCV in separate windows; it checks that the ports are free and does not install dependencies. Stop each service with Ctrl+C in its window.

## 4. Testing

- Core: `npm run test --workspace=apps/core`
- ProIdentity: `npx prisma generate` in `apps/identity`, then `npm run test:regression --prefix apps/identity` (three DB integration tests need a reachable PostgreSQL)
- ProCV backend: `npm --prefix apps/procv/backend test`; `test:rls:integration` for RLS against a real database
- ProCV frontend: `npm --prefix apps/procv/frontend test`
- ProJobs API: `npm test --prefix apps/projobs/server` (PGlite with the production RLS role)
- ProJobs web: `npm test --workspace=apps/projobs`
- Design-system colour guard: `node packages/ui/scripts/check-palette.mjs`

Run lint for every touched workspace too.

## 5. Databases

- `PROCV_RLS_CONTEXT_KEY` (64 hex characters) must match the verifier key `v1` stored in the database for the ProCV backend to work.
- Use `prisma migrate dev` only against local databases. QA/production migrations are applied by hand in Neon with the owner's authorization (`docs/deployment/ETAPA3_DEPLOY.md` §3).
- Do not attempt to connect to QA/production databases from a local machine.
