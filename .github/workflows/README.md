# GitHub Actions: CI/CD map

This directory validates the ProSolutions monorepo. Workflows are intentionally separated where triggers, permissions, or side effects differ; reducing YAML file count is not a goal by itself.

## Workflow inventory

| Workflow | Trigger | Scope | External effects |
|---|---|---|---|
| `core-build.yml` | Push/PR to `main` on Core, ProJobs, shared UI, root manifests or this workflow | Core build and ProJobs generator/API/static build; module jobs are path-filtered | None; uses CI data only |
| `procv-ci.yml` | Push/PR matching ProCV, Identity, shared UI, root manifests, Render config or this workflow; manual dispatch | ProCV backend/frontend, Identity regression/build, Trivy and ProCV Docker build; jobs are path-filtered | No image push or production deployment |
| `postgres-migration-readiness.yml` | Push/PR for ProIdentity/ProCV Prisma migrations, root npm manifests or workflow; manual dispatch | Applies both migration histories to empty PostgreSQL 16 databases and checks module boundaries | None; never connects to Neon |
| `projobs-postgres-rls.yml` | Push/PR for ProJobs server SQL/Prisma/package manifests, RLS docs or workflow; manual dispatch | Applies isolated RLS PoC and verifies cross-user isolation | None; never connects to Neon |
| `proidentity-logout-replay-e2e.yml` | Manual dispatch only | Login/logout and saved access-token replay against the Identity endpoint | Calls a deployed endpoint using a dedicated E2E account; logout revokes its test session |
| `projobs-update.yml` | Daily at 06:00 UTC or manual dispatch | Generates, validates and commits updated job catalogue files | Writes a commit to the checked-out branch using the workflow token |

## Path-filter contract

- Core and ProJobs share the root npm workspace and `packages/ui`; changes to either shared dependency or root manifests validate both relevant jobs.
- Changes only under `apps/core/**` must not start the ProJobs build job.
- Changes only under `apps/projobs/**` must not start the Core build job, except when a shared path or root manifest also changed.
- ProCV and Identity have separate job filters. A change confined to Identity should not start the ProCV backend, frontend, Trivy or Docker jobs. Changes to shared UI, root manifests, Render configuration, or this workflow validate the applicable modules.
- Database migration and RLS workflows are intentionally independent so each can use precise paths and a distinct PostgreSQL service.
- When adding a new shared package or moving a migration/policy file, update these filters and the matching workflow trigger in the same PR.

## Secrets and database policy

1. Ordinary CI uses ephemeral PostgreSQL service containers and non-production test credentials. Do not put a production Neon connection string in workflow-level `env`.
2. A real Neon operation, if ever required, belongs in a separate explicitly authorized workflow using a protected GitHub Environment, least-privilege credentials, and a non-production branch/database whenever possible. Production migration credentials must not be the application runtime role.
3. `IDENTITY_E2E_EMAIL` and `IDENTITY_E2E_PASSWORD` are available only to the manual logout-replay job. Use a dedicated test account, never a personal or general production account.
4. A Render API token is not needed when Render itself deploys from Git. If deployment orchestration is moved to Actions, place the token only in a protected deploy job/environment and require successful CI plus an approval gate.
5. Do not expose secrets to code from forked PRs. Keep workflow permissions minimal; `contents: write` is limited to the scheduled catalogue updater.

## Deployment ownership

Render remains the deployment authority under the current service configuration. This CI refactor must not toggle Render auto-deploy, change service branches, migrate databases, alter traffic, or introduce a second deployment mechanism. A GitHub-driven deployment workflow should only be added after an explicit decision to transfer deployment orchestration from Render to Actions.

## Concurrency and reliability

- CI jobs cancel stale runs for the same workflow/ref.
- The catalogue updater serializes runs without cancelling an in-flight write.
- Logout replay serializes runs and never cancels an in-flight security test.
- Keep explicit job timeouts, use lockfile-specific npm caching, and retain separate migration, RLS, security and Docker gates.
- After changing filters, validate at least: Core-only, ProJobs-only, ProCV-only, Identity-only, shared UI/root lockfile, Prisma migration, RLS SQL, workflow-only, and manual-dispatch cases. Check that no required status check is left permanently pending.

## Maintenance note

Use `npm ci` for reproducible installation. `actions/setup-node` npm caching stores package downloads; it does not share `node_modules` across runners. Cache each independent lockfile (root and `apps/projobs/server/package-lock.json`) with its own setup step.
