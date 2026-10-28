# Neon cutover status — 2026-10-28

## Decision

ProSolutions is moving its backend database connections to the existing Neon project `Prosolutions.page`. Keep the module databases isolated:

- `proidentity` — ProIdentity authentication and account data
- `procv` — ProCV documents and analysis data
- `projobs` — ProJobs persistence

Supabase is no longer intended to be an application runtime dependency after cutover. Do not delete the source Supabase projects yet; retain them temporarily as rollback/reference copies until the Neon cutover and smoke tests have passed.

## Production connection cutover

The following Render secret environment variables were updated to use Neon connection strings for the matching restricted login roles:

- ProCV backend: `DATABASE_URL` and `DIRECT_DATABASE_URL` use `procv_login` against `procv`.
- ProJobs API: `DATABASE_URL` uses `projobs_login` against `projobs`.
- ProIdentity API: pending until the runtime container no longer attempts schema migrations with its application login.

Do not store or commit any connection string, password, or JWT secret in this file or the repository.

## Neon security checks

Read-only checks on the production branch confirmed:

- The three module databases exist on the same Neon project.
- `proidentity_login` is a member of `proidentity_app`; the Identity tables have policies scoped to that app role.
- `procv_login` is a member of `procv_app`; ProCV tables have policies scoped to that app role.
- `projobs_login` is a member of `projobs_api`; ProJobs tables have forced row-level security policies scoped to that API role.
- The restricted login roles have database CONNECT, public schema USAGE, and required table access.

## Identity deployment requirement

The previous Identity Docker startup command ran `prisma migrate deploy` on every service start using `DIRECT_DATABASE_URL` or `DATABASE_URL`. That is incompatible with a least-privilege application login and could require an administrative credential in the runtime service.

The cutover branch changes the container to start the API without automatically running migrations. Production migrations must be run as an explicit administrative operation, reviewed separately from the runtime credential. After this change is merged and the Identity deploy is healthy, set ProIdentity's `DATABASE_URL` and `DIRECT_DATABASE_URL` to the restricted `proidentity_login` connection for the `proidentity` database.

## Data and validation

- ProIdentity table counts on the current Neon production branch match Supabase for `User`, `EmailVerificationToken`, `ProfessionalProfile`, `ModuleAccess`, `PasswordResetToken`, and `AuditLog`. The only difference is `Session`: Neon has three rows while Supabase has zero. The build decision explicitly allows sessions to be discarded; no session tokens were inspected.
- ProCV data/schema were previously migrated and validated.
- ProJobs has its dedicated schema and forced RLS policies in Neon.
- Re-check Render deploy status and logs after each connection update. Run health checks and authenticated smoke tests for sign-in, token refresh, logout, ProCV CRUD, ProJobs persistence, and cross-user isolation before considering the cutover complete.

## Retirement boundary

“Remove Supabase connections” means remove Supabase connection strings from active application services and stop depending on Supabase at runtime. It does not mean deleting Supabase projects, credentials, or backups during the same cutover. Retire those only after a separate verification and retention decision.
