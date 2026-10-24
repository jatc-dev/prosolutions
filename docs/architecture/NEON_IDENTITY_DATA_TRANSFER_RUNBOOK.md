# ProIdentity → Neon data transfer

## Current state

- Neon project: `Prosolutions.page`
- Target database: `proidentity`
- The target schema and Prisma migration history are present.
- The seven source `User` rows have already been copied and their content digest matches Supabase.
- Other Identity application tables still need transfer.
- Supabase remains the source of truth. This runbook does not change Render or switch traffic.

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

## Execute

From the repository root:

```bash
bash scripts/maintenance/migrate-proidentity-data-to-neon.sh
```

The script:
1. Checks all three connections and verifies the target database and runtime role.
2. Compares source and target row counts plus content digests for every Identity table.
3. Skips any table that already matches exactly, including the `User` rows already transferred.
4. Imports only tables that are empty in Neon but populated in Supabase, in one transaction.
5. Refuses to overwrite, duplicate, or silently reconcile a table that is partially populated or differs from the source.
6. Verifies all counts and content digests again and confirms `proidentity_login` can read the migrated user count.

It preserves IDs, password hashes, sessions, refresh tokens, module entitlements, profiles, and verification/reset token records. It does not alter the Supabase source.

## After a successful run

- Review the printed verification result.
- Run the application authentication tests against Neon.
- Confirm `IDENTITY_JWT_SECRET`, issuer, audience, cookie settings, and session behavior are unchanged and correct.
- Do not change Render's `DATABASE_URL` until application smoke tests pass.
- Keep Supabase online as rollback source until cutover and a defined observation window are complete.

## Other modules

- ProCV schema and data have already been copied into Neon and verified using row counts and content digests.
- ProJobs schema and forced RLS policies are present in Neon; its new tables currently contain no application data.
- This script does not configure Render or perform production cutover.
