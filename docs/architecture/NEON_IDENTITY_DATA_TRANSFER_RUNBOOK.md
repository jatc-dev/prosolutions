# ProIdentity → Neon data transfer

## Current state

- Neon project: `Prosolutions.page`
- Target database: `proidentity`
- The target schema and Prisma migration history are present.
- Latest verified ProIdentity manifests matched between Supabase and Neon for the application tables and Prisma migration history: `User` 8, `Session` 0, `ModuleAccess` 24, `ProfessionalProfile` 6, `EmailVerificationToken` 2, `PasswordResetToken` 0, `AuditLog` 0, and `_prisma_migrations` 2. Counts and content digests matched at that verification point; recheck before any future transfer or cutover.
- Session rows were deliberately truncated in both Supabase ProIdentity and Neon ProIdentity under explicit development-data-discard authorization. Do not rely on the older 2026-10-24 source-session snapshot (97 rows); it is obsolete. No session records are currently expected in either database from that operation.
- Supabase remains the source of truth for the remaining ProIdentity application data. The transfer script permits exactly one narrowly scoped reconciliation: `lastLoginAt` and/or `updatedAt` differ for exactly one existing user, while the full user ID set, row count, and every other User field match. It updates only those two target fields from Supabase inside a transaction, then requires the complete integrity manifests to match. Any other drift is rejected.
- A fresh role audit previously confirmed `proidentity_login` is non-superuser, cannot create databases/roles, has no replication or `BYPASSRLS`, owns zero application objects, and inherits no privileged-role memberships. Recheck immediately before any approved transfer.
- The transfer and cutover are still separate from these prior data checks. This runbook does not change Render or switch traffic.

## Why the transfer runs from a trusted workstation

The source includes password hashes, refresh-token/session records, and token hashes. Keep those values inside a controlled PostgreSQL client session; do not copy them into chat, tickets, logs, or GitHub. The script transfers data directly from Supabase to Neon without printing rows or connection URLs.

## Prerequisites

- PostgreSQL client tools (`psql` and `pg_dump`).
- A Supabase direct database connection URL for ProIdentity.
- A direct, non-pooled Neon connection URL for the `proidentity` database, using the database owner for the data import.
- A Neon connection URL for the restricted `proidentity_login` role for post-import verification.
- Verify `proidentity_login` has no ownership of application objects, no direct elevated role attributes, and no inherited membership in any role with `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION`, or `BYPASSRLS`. The transfer script enforces these checks.

Set these as shell environment variables without displaying them:

- `SUPABASE_IDENTITY_URL`
- `NEON_IDENTITY_URL`
- `NEON_IDENTITY_RUNTIME_URL`

Use the connection URLs from their respective provider consoles. Do not put real values in a committed `.env` file.

## Mandatory reconciliation gate

**Do not run the transfer against production yet.** The script now handles one specifically verified activity-timestamp discrepancy, but production transfer remains gated on review, fresh source-session counts, and application smoke tests. Do not disable or bypass any assertion.

Before any real transfer:

1. Recheck source/target schema, row counts, and content digests.
2. Review the implemented narrowly scoped reconciliation for the one user's `lastLoginAt` and `updatedAt` values. It checks matching User counts/IDs and a digest of all non-activity fields before changing only the two activity timestamps from Supabase. Do not apply a guessed timezone offset.
3. Require the integration workflow to pass its synthetic timestamp-only fixture and all negative cases: non-timestamp drift, extra target users, multiple users with timestamp drift, unsafe runtime role attributes, and inherited membership in a privileged role. These are test-only databases, never production.
4. Recheck the current source `Session` count and state; the latest observed 97 sessions are a point-in-time snapshot, not a fixed expected count.
5. Confirm the transfer operator has identified the source project/database and target Neon project/database from provider consoles before setting the three connection variables. Never echo or log connection URLs.
6. Transfer missing tables in a transaction, then verify row counts and content digests for every table and visibility through `proidentity_login`.
7. Run authentication, refresh rotation, logout/revocation, password-reset session invalidation, cookie/CSRF, and module-entitlement smoke tests against Neon before considering Render cutover.

Any failed assertion blocks the transfer. Do not alter Supabase as part of this procedure.

## Security review finding — cutover blocker

The current `main` implementation of `apps/identity/src/middleware/auth.ts` verifies the access JWT's `jti` against the persisted session on every protected request, even when the refresh-token cookie is absent, and rejects missing, expired, or revoked sessions. A unit regression test exists at `apps/identity/tests/services/access-token-revocation.test.ts` for replaying a saved access JWT after revocation without a cookie. Therefore, the older finding that the middleware checks revocation only when the cookie is present is stale relative to `main`; do not reintroduce that older middleware version when resolving this PR.

Production verification is still pending: the manual workflow `.github/workflows/proidentity-logout-replay-e2e.yml` must run against the intended deployed Identity service with a dedicated verified E2E account configured in GitHub Actions secrets `IDENTITY_E2E_EMAIL` and `IDENTITY_E2E_PASSWORD`. That workflow creates and revokes a test session, so use only a dedicated test account. Do not claim the deployed service has passed until that workflow reports success. This is a cutover gate separate from data-transfer integrity.

## Execute — only after the gate above is satisfied and reviewed

From the repository root:

```bash
bash scripts/maintenance/migrate-proidentity-data-to-neon.sh
```

The current script:
1. Checks all three connections and verifies the target database and runtime role.
2. Before the full manifest comparison, verifies the User row count, ID set, and digest of all fields except `lastLoginAt` and `updatedAt`. It permits activity timestamp drift for exactly one user only, updates those two values from Supabase in a transaction, and refuses all other User differences.
3. Compares source and target row counts plus content digests for every Identity table.
4. Skips any table that already matches exactly.
5. Imports only tables that are empty in Neon but populated in Supabase, in one transaction.
6. Refuses to overwrite, duplicate, or silently reconcile a table that is partially populated or differs from the source, except for the exact timestamp-only case above.
7. Verifies all counts and content digests again and confirms `proidentity_login` can read the migrated user count.

It preserves IDs, password hashes, sessions, refresh tokens, module entitlements, profiles, and verification/reset token records. It does not alter the Supabase source. The synthetic CI fixture validates the allowed timestamp-only reconciliation; production execution remains a separate, explicitly reviewed step.

## After a successful run

- Review the printed verification result.
- Run the application authentication tests against Neon, including refresh and revocation behavior.
- Confirm `IDENTITY_JWT_SECRET`, issuer, audience, cookie settings, and session behavior are unchanged and correct.
- Do not change Render's `DATABASE_URL` until application smoke tests pass.
- Keep Supabase online as rollback source until cutover and a defined observation window are complete.

## Other modules

- ProCV schema and data have already been copied into Neon and verified using row counts and content digests.
- ProJobs schema and forced RLS policies are present in Neon; its new tables currently contain no application data.
- This script does not configure Render or perform production cutover.
