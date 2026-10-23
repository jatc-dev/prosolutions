# ProJobs PostgreSQL integration

## Scope and deployment boundary

The ProJobs API uses the PostgreSQL driver directly. ProIdentity remains the authentication authority; the API validates its JWT issuer, audience, expiry and `PROJOBS` module claim before any personal-data route runs. The public job catalog stays static.

This change does not provision a database, apply SQL, add Render environment variables, or deploy an API service. Until a dedicated ProJobs PostgreSQL database is configured, personal routes return a safe HTTP 503 response.

## Provisioning a dedicated database

1. Create a separate PostgreSQL database for ProJobs (Neon is a candidate, not yet provisioned).
2. Apply `apps/projobs/server/sql/001_projobs_core.sql` with a database administrator. Never run it against ProCV or ProIdentity.
3. Create a dedicated login role for the API, for example `projobs_runtime`. It must not be a superuser, table owner, or have `BYPASSRLS`.
4. Grant role membership: `GRANT projobs_api TO projobs_runtime;`. Keep the login credentials server-side only.
5. Set `DATABASE_URL` on the ProJobs API service. Use the provider's TLS connection string (for example, `sslmode=require`).
6. Configure `IDENTITY_JWT_SECRET`, `IDENTITY_ISSUER` and `IDENTITY_AUDIENCE` to match ProIdentity. Do not expose these secrets to the static frontend.
7. Before production enablement, run the RLS isolation SQL tests from PR #55 against a disposable PostgreSQL instance and authenticated API smoke tests.

## How isolation works

Each store operation starts a transaction, switches to the restricted `projobs_api` role, and sets `projobs.user_id` transaction-locally from the verified JWT subject. RLS policies compare that value to the row's `user_id`. The application query intentionally does not accept a user ID from request input for list/delete scope. Transaction-local settings are cleared at transaction end to prevent pooled connections from carrying a previous user's identity.

The runtime role must be granted membership in `projobs_api` and must not own the tables. If role setup is incorrect, operations fail closed rather than bypassing RLS. The API maps database failures to a generic 503 and does not return SQL errors or connection details.

## Validation

The API test suite covers health, missing/invalid JWTs, missing module entitlement, and the safe 503 path when `DATABASE_URL` is absent. The separate PostgreSQL RLS proof of concept validates row isolation against an ephemeral database. A real provider connection and production credentials have not been tested yet.
