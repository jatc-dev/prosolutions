# ProIdentity → Neon data transfer

## Current state

- Neon project: `Prosolutions.page`
- Target database: `proidentity`
- The target schema and Prisma migration history are present.
- Seven `User` rows exist in both databases and their stable identity fields match. Six users have identical `lastLoginAt` and `updatedAt` values; one user's two activity timestamps are newer in Supabase than in Neon.
- Supabase remains the source of truth. The transfer script now permits exactly one narrowly scoped reconciliation: `lastLoginAt` and/or `updatedAt` differ for exactly one existing user, while the full user ID set, row count, and every other User field match. It updates only those two target fields from Supabase inside a transaction, then requires the complete integrity manifests to match. Any other drift is rejected.
- Read-only audit on 2026-10-24 found 97 source sessions and zero target sessions. All 97 source sessions have future expiry timestamps; 72 are revoked and 25 are not revoked. All 97 session IDs are distinct and no session rows had orphaned user references. A fresh read-only target role audit found `proidentity_login` is non-superuser, cannot create databases/roles, has no replication or `BYPASSRLS`, owns zero application objects, and inherits no privileged-role memberships. These are point-in-time observations; re-check immediately before any approved transfer.
- Other Identity application tables need transfer after the `User` mismatch is safely resolved.
- No production data was changed by this audit. This runbook does not change Render or switch traffic.

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

Code review of `apps/identity/src/middleware/auth.ts` found that a valid access JWT is accepted when the refresh-token cookie is absent; session revocation/expiry checks run only when that cookie is present. Because logout revokes the refresh session and clears the cookie but does not revoke already-issued access JWTs, a copied access JWT may remain usable until its JWT expiry. Before production cutover, either change access-token validation to enforce the intended revocation semantics or explicitly accept the short residual access-token lifetime as a documented risk with compensating controls. Add a regression test: login, save access JWT, logout (cookie cleared and session revoked), then call a protected endpoint with only the saved JWT and no refresh cookie; assert the intended security outcome. This finding is separate from data-transfer integrity and must be resolved or formally accepted before changing Render's database connection.

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
