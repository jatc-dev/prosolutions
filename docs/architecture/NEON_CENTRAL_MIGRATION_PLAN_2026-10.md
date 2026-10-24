# Neon central database migration plan (2026-10)

## Status and scope

This document tracks the move of ProSolutions' PostgreSQL data stores to Neon. Module schemas are now present; ProCV data is migrated and verified; ProIdentity data is only partially transferred; ProJobs schema/RLS are installed. Production application connectivity has not been switched.

**Safety boundaries**
- Keep the existing Supabase ProCV and ProIdentity projects intact until each cutover is verified and a rollback window has passed.
- Schema setup was performed with reviewed SQL against Neon after validating each migration on a temporary branch. Do not replay schema creation or Prisma history blindly against the already-populated target.
- Never commit connection strings, passwords, JWT secrets, or production data.
- Supabase remains intact. Do not change Render services/environment variables until Identity data integrity, authentication, module-entitlement and API smoke-test gates pass.

## Target topology

Use one Neon project as the central PostgreSQL platform, with **three separate databases** and independent runtime credentials:

| Database | Owner / authority | Data boundary | Application runtime |
| --- | --- | --- | --- |
| `proidentity` | ProIdentity | Accounts, password hashes, verification/reset tokens, sessions, profiles, module entitlements and Identity audit events | ProIdentity API only |
| `procv` | ProCV | CVs, versions, ATS analyses, ProCV settings and module audit events; `CV.userId` is the immutable ProIdentity JWT `sub` | ProCV API only |
| `projobs` | ProJobs | Candidate saved jobs and application-tracking records; user ownership comes from verified Identity JWT `sub` | ProJobs API only |

A shared Neon project is a platform/accounting boundary, **not** a reason to combine module data or reuse a privileged database role. The databases must not use cross-database foreign keys; module APIs validate ProIdentity JWTs and authorize each request locally.

### Free-plan capacity

Neon's official [Free plan announcement (October 2, 2026)](https://neon.com/blog/neon-free-plan-1-gb-per-project) lists 1 GB of PostgreSQL storage, 100 CU-hours/month, 5 GB of monthly public egress, and 10 branches per project. A branch can contain multiple databases ([Neon API reference](https://api-docs.neon.tech/reference/createprojectbranchdatabase)). The storage, compute and egress allowances are **per project**, not per database; all three module databases will share those budgets. This is suitable for a controlled migration/test phase, but production viability depends on combined database size, request volume, and compute uptime. Measure before committing to a permanent all-production cutover, and monitor usage to avoid Free-plan suspension at a quota limit.

Use separate non-owner login roles per application, with only the required database/schema/table/function privileges. The login used by an app must not be a database owner, superuser, or have `BYPASSRLS`. Keep an administrative/migration role out of runtime configuration. Verify Neon role membership and actual effective privileges before use; do not rely on a role name alone.

## Migration status (2026-10-24)

- `procv`: schema and data migrated. Counts and content digests match Supabase for `CV` (9), `CVVersion` (18), `CVAtsAnalysis` (3), `PlatformSetting` (5), `AuditLog` (0), and `_prisma_migrations` (9). Four distinct CV owners all match ProIdentity user IDs.
- `proidentity`: schema and migration history are present. The seven `User` rows were copied and their content digest matches Supabase. `Session` (58), `EmailVerificationToken` (1), `ProfessionalProfile` (6), and `ModuleAccess` (22) remain to be transferred; the guarded script and manual workflow are in PR #58.
- `projobs`: schema, forced RLS, restricted `projobs_api`, and `projobs_login` membership are present. A transactional smoke test proved row isolation and removed its test row. No user data is expected in these new tables yet.
- Legacy `*_runtime` roles remain members of `neon_superuser`; do not use them in Render or delete them without a separate dependency review.
- No Render environment variables or traffic have been changed. The current production applications still use Supabase.

## Current repository findings

### ProIdentity
- Prisma schema: `apps/identity/prisma/schema.prisma`.
- Migration history currently contains `20261020000000_init` and `add_jti_column`.
- Identity owns `User`, `Session`, password-reset and email-verification tokens, `ProfessionalProfile`, `ModuleAccess`, and `AuditLog`.
- Preserve user IDs, session/revocation semantics, module grants and audit records during migration. Never generate a fresh production identity database without a controlled data copy.
- Live Supabase metadata shows RLS enabled but not forced and zero policies on all Identity public tables, with `postgres` as table owner. A restricted non-owner runtime login would therefore be blocked by RLS unless the migration adds a deliberate runtime policy or changes the RLS design. Do not simply swap the connection string and assume it will work.

### ProCV
- Prisma schema: `apps/procv/backend/prisma/schema.prisma`.
- Migration history contains the original local-auth schema, ATS analysis, session/email-verification changes, RLS enabling, CV version alignment, and `zzzz_identity_only_data_model`.
- The current model is product-data-only. The final historical migration drops legacy `User`, `Session`, `EmailVerificationToken`, and `PasswordResetToken` after ownership reconciliation and remaps two known legacy subjects.
- **Do not delete or rewrite migration files.** For an empty Neon database, replaying history and applying the final migration is a distinct case from moving an existing populated database. Never blindly reuse the hard-coded legacy user IDs in the ownership backfill.
- Live Supabase metadata confirms RLS enabled, not forced, and zero policies on ProCV public tables, with `postgres` as table owner. The repository migration comment assumes an owner-role application connection. A non-owner runtime role will see no rows / be unable to modify them unless explicit policies are added. Before Neon cutover, either implement and test per-user RLS with transaction-local subject context, or explicitly document and test a different safe runtime access design; do not simply swap the connection string.

### ProJobs
- `apps/projobs/server/sql/001_projobs_core.sql` is available on PR #53's branch `feat/projobs-persistence-foundation`, not yet part of `main`.
- It creates `projobs_saved_jobs` and `projobs_applications`, with forced RLS and a `projobs_api` NOLOGIN role. The runtime adapter uses transaction-local role and verified JWT subject context.
- PR #53 is still open/draft; its PostgreSQL CI tests against ephemeral PostgreSQL are not evidence that a real Neon connection or deployed API works. Keep it unmerged until the Neon-specific integration and authenticated end-to-end tests pass.

### Read-only source inventory (2026-10-23)

A metadata-only read of the currently connected Supabase projects returned the following exact table counts and approximate database sizes. No row contents, emails, CV text, tokens, or passwords were retrieved. Counts can change; repeat this inventory immediately before any export.

| Source | Table | Rows at inventory time |
| --- | --- | ---: |
| ProCV | `CV` | 9 |
| ProCV | `CVVersion` | 18 |
| ProCV | `CVAtsAnalysis` | 3 |
| ProCV | `PlatformSetting` | 5 |
| ProCV | `AuditLog` | 0 |
| ProIdentity | `User` | 7 |
| ProIdentity | `Session` | 58 |
| ProIdentity | `PasswordResetToken` | 0 |
| ProIdentity | `EmailVerificationToken` | 1 |
| ProIdentity | `ProfessionalProfile` | 6 |
| ProIdentity | `ModuleAccess` | 22 |
| ProIdentity | `AuditLog` | 0 |

Reported database sizes were approximately 16 MB for ProCV and 11 MB for ProIdentity. The data volume appears small enough for a controlled export/import test, but this is not a backup or proof that the databases are identical to repository schemas. The live ProCV tables currently have RLS enabled. Supabase project migration history also contains provider-specific hardening migrations, so the repo Prisma history alone is not a full inventory of live database configuration.

**Session decision required before Identity cutover:** ProIdentity currently has 58 session rows. Migration must either preserve still-valid refresh-session state and the matching signing configuration, or intentionally revoke sessions and communicate the resulting re-login. Do not silently discard or copy sessions without verifying token expiry/revocation semantics. ProCV's current live schema has no local `User`/`Session` tables and should keep that boundary.


## Provisioning plan (manual Neon-console/SQL step will be requested later)

1. Keep the existing Neon project and its default branch; do not install Neon app scaffolding or create a second project.
2. Create databases `proidentity`, `procv`, and `projobs` within the project. Confirm exact database names and region.
3. Create one migration/admin credential and separate least-privilege runtime logins for each module. Do not use the admin role in Render runtime services. Check membership/inherited privileges, especially any provider-created role memberships.
4. Store the direct connection string for migrations separately from the pooled runtime connection string when Prisma/Neon pooling requires it. Use TLS and the connection endpoint intended for the deployed service.
5. Never put database URLs in a browser bundle, static-site variables, repository files, CI logs, screenshots, or chat. Configure them only in the appropriate Render backend service's secret environment.
6. Apply only the target module's reviewed migrations to that module's database. Do not apply ProJobs SQL to ProCV/Identity, or Prisma history from one module to another.

The user should not need to paste secrets into ChatGPT. When a manual step is required, provide the exact SQL/console action and ask only for non-secret confirmation such as the database names created.

## Migration strategy

Use an expand/verify/cut-over/rollback sequence per module, not a big-bang move:

1. **Inventory and baseline:** record table counts, row counts, important indexes/constraints, extension dependencies, Prisma migration status, and current service health. Take provider-supported backups/exports before copying production data.
2. **Prepare schema:** replay or reconcile migrations on an empty disposable database first. Resolve RLS, role/grant, extensions, connection pooling, and Prisma direct-URL requirements.
3. **Copy data:** use a controlled export/import or purpose-built migration script with a consistent source snapshot. Preserve Identity IDs and ProCV foreign/external owner references. Exclude expired/revoked ephemeral data only if an explicit retention policy authorizes it.
4. **Reconcile:** compare row counts and key aggregates; verify no orphaned CV owners, ATS analyses, sessions, profiles, module grants, or audit entries. Verify unique constraints and timestamp semantics.
5. **Security tests:** test invalid/wrong-audience JWTs, absent module entitlements, cross-user read/update/delete, absent subject, runtime role privileges, and attempts to bypass RLS.
6. **Shadow verification:** run read-only comparisons against the Neon copy where practical. Do not dual-write without a defined consistency and rollback design.
7. **Cut over one module at a time:** update only that backend's Render secret variables; deploy and run health plus authenticated smoke tests. Keep source Supabase unchanged and available for rollback.
8. **Rollback:** revert the service connection to its prior Supabase URL if smoke tests fail. Avoid reverse-sync assumptions; if writes occurred in Neon, reconcile them before switching back.
9. **Retire old storage only after explicit approval:** keep backups and old databases until data integrity, authentication, user ownership, and operational monitoring have been verified over an agreed period.

Recommended order: **ProJobs isolated test database/API first**, then ProCV (after carefully validating its legacy ownership migration and RLS/grants), then ProIdentity last because it is the central authentication authority and its cutover affects all modules. The exact order can change after data volumes, dependencies, and downtime needs are measured.

## Acceptance gates before production

- [ ] Three databases exist in Neon and have been verified by name.
- [ ] Each runtime login is distinct, non-owner, not superuser, and not `BYPASSRLS`; privileges have been inspected.
- [ ] Module migrations pass on disposable databases without manual edits to historical migrations.
- [ ] ProCV ownership backfill is verified against actual source data; no hard-coded IDs are assumed to be valid in another environment.
- [ ] ProJobs RLS isolation tests pass against Neon, not only ephemeral local PostgreSQL.
- [ ] Prisma migrations use the intended direct connection and application runtime uses the intended pooled connection, where applicable.
- [ ] Data counts/reconciliation and authenticated end-to-end tests pass.
- [ ] Render changes are scoped to the correct backend, secrets remain secret, and rollback instructions are ready.
- [ ] Owner approves each production cutover.

## Explicitly not done

At the time of writing, this plan has not created databases or roles in Neon, copied data, applied SQL to any live database, changed Render configuration, or deployed a new API. The Neon project exists, but database provisioning and application wiring remain pending.
