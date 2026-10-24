# ProIdentity → Neon data transfer

## Current state

- Neon project: `Prosolutions.page`
- Target database: `proidentity`
- The target schema and Prisma migration history are present.
- Seven `User` rows exist in both databases and their stable identity fields match. Six users have identical `lastLoginAt` and `updatedAt` values; one user's two activity timestamps are newer in Supabase than in Neon.
- Supabase is the source of truth until a reviewed reconciliation is implemented. The current transfer script intentionally refuses to overwrite a non-empty, non-identical `User` table.
- Read-only audit on 2026-10-24 found 89 source sessions and zero target sessions. All 89 source sessions have future expiry timestamps; 65 are revoked and 24 are not revoked. No session rows had orphaned user references. These counts can change while Supabase remains live, so re-check immediately before any approved transfer.
- Other Identity application tables need transfer after the `User` mismatch is safely resolved.
- No production data was changed by this audit. This runbook does not change Render or switch traffic.

## Why the transfer runs from a trusted workstation

The source includes password hashes, refresh-token/session records, and token hashes. Keep those values inside a controlled PostgreSQL client session; do not copy them into chat, tickets, logs, or GitHub. The script transfers data directly from Supabase to Neon without printing rows or connection URLs.

## Prerequisites

- PostgreSQL client tools (`psql` and `pg_dump`).
- A Supabase direct database connection URL for ProIdentity.
- A direct, non-pooled Neon connection URL for the `proidentity` database, using the database owner for the data import.
- A Neon connection URL for the restricted `proidentity_login` role for post-import verification.

Set these as shell environment variables without displaying them:

- `SUPABASE_IDENTITY_URL`
- `NEON_IDENTITY_URL`
- `NEON_IDENTITY_RUNTIME_URL`

Use the connection URLs from their respective provider consoles. Do not put real values in a committed `.env` file.

## Mandatory reconciliation gate

**Do not run the transfer against production yet.** The existing script is designed to stop when a target table is populated but differs from the source. This is the correct fail-closed behavior; do not disable or bypass it.

Before any real transfer:

1. Recheck source/target schema, row counts, and content digests.
2. Implement a narrowly scoped reconciliation for the one user's `lastLoginAt` and `updatedAt` values, with assertions that every other `User` field matches and that exactly the expected timestamp-only discrepancy is present. Use Supabase as the source of truth for those two fields. Do not apply a guessed timezone offset.
3. Extend the integration workflow with a synthetic fixture for this timestamp-only discrepancy, and verify the script refuses unexpected differences and duplicate rows.
4. Recheck the current source `Session` count and state; the observed 89 sessions are a point-in-time snapshot, not a fixed expected count.
5. Transfer missing tables in a transaction, then verify row counts and content digests for every table and visibility through `proidentity_login`.
6. Run authentication, refresh, logout/revocation, and module-entitlement smoke tests against Neon before considering Render cutover.

Any failed assertion blocks the transfer. Do not alter Supabase as part of this procedure.

## Execute — only after the gate above is satisfied and reviewed

From the repository root:

```bash
bash scripts/maintenance/migrate-proidentity-data-to-neon.sh
```

The current script:
1. Checks all three connections and verifies the target database and runtime role.
2. Compares source and target row counts plus content digests for every Identity table.
3. Skips any table that already matches exactly.
4. Imports only tables that are empty in Neon but populated in Supabase, in one transaction.
5. Refuses to overwrite, duplicate, or silently reconcile a table that is partially populated or differs from the source.
6. Verifies all counts and content digests again and confirms `proidentity_login` can read the migrated user count.

It preserves IDs, password hashes, sessions, refresh tokens, module entitlements, profiles, and verification/reset token records. It does not alter the Supabase source. Because of the timestamp discrepancy above, the current script is expected to stop and must not be bypassed.

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
