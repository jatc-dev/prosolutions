# ProJobs PostgreSQL isolation proof of concept

**Status: isolated database PoC only. Not connected to production.**

## Why this stage exists

ProJobs needs a separate persistence store without consuming another Supabase project slot or sharing ProCV/ProIdentity's database credentials. A standalone PostgreSQL provider is a better fit than granting ProJobs a Supabase `service_role` key. The first step is to prove that PostgreSQL itself enforces per-user row ownership before changing the API adapter.

Neon is the leading provider candidate for the next integration step. Its current Free plan is listed at $0 and includes 100 CU-hours per project/month, 1 GB storage per project and 5 GB network transfer per project/month; the compute scales to zero after inactivity. Verify the current terms and ensure billing remains disabled before provisioning:
- [Neon Free plan quotas](https://github.com/neondatabase/website/blob/main/content/faqs/free-plan-limits-and-quotas.md)
- [Neon's October 2026 storage update](https://neon.com/blog/neon-free-plan-1-gb-per-project)
- [Connecting with a standard PostgreSQL connection string](https://neon.com/docs/get-started/connect-neon)

This repository change does **not** create a Neon account or project, request a payment method, configure Render, or change any existing database.

## Files

- `apps/projobs/server/sql/poc/001_projobs_postgres_rls.sql`: provider-neutral PostgreSQL tables, a non-login `projobs_api` role, minimal table grants, RLS enabled and forced, and owner policies.
- `apps/projobs/server/sql/poc/002_test_rls_isolation.sql`: synthetic two-user integration assertions.
- `.github/workflows/projobs-postgres-rls.yml`: creates an ephemeral PostgreSQL 16 service in GitHub Actions and runs the assertions.

The PoC is separate from `apps/projobs/server/sql/001_projobs_core.sql`, which is for the existing Supabase/PostgREST implementation. Do not apply either migration to ProCV or ProIdentity.

## Required API contract for a later integration

1. Verify the ProIdentity JWT using the existing issuer, audience, and `PROJOBS` module checks.
2. Derive the database subject only from the verified JWT `sub`; never accept a user ID from the request body or query string.
3. For each database operation, start a transaction and run `SELECT set_config('projobs.user_id', $1, true)` with the verified subject as a bound parameter.
4. Execute the operation in that same transaction. The third argument `true` makes the identity setting transaction-local, avoiding identity bleed across pooled connections.
5. Use a dedicated login role that is not a superuser, table owner, or `BYPASSRLS` role. Grant it membership in `projobs_api`; keep credentials only in the API service environment.
6. Always roll back on errors and release the connection. Never expose the connection string to the static frontend.

RLS is defense in depth against missing ownership predicates and accidental cross-user access. It is not a substitute for JWT validation: any process holding the database credential can set a custom PostgreSQL setting, so the API must set it exclusively from the verified token.

## Automated acceptance checks

The GitHub Actions workflow must prove that:
- user A can insert and read their own saved job and application;
- user B cannot read, update or delete user A's rows;
- user B cannot insert a row claiming user A as owner;
- queries without a transaction-local subject fail closed;
- synthetic user A's original data remains intact after user B's attempts.

These tests use a disposable CI database and synthetic values only.

## Remaining work before enabling persistence

- Wait for the workflow to pass on the PR; do not infer success from the YAML alone.
- Integrate a pinned PostgreSQL driver and synchronize the root npm lockfile.
- Replace the Supabase REST store with a transaction-safe PostgreSQL store that implements the contract above; retain parameterized SQL for all inputs.
- Add API-level tests for JWT subject ownership, invalid/missing JWTs, missing `PROJOBS` claim, timeout/unavailable database, and external application redirects.
- Recheck the provider's current quotas and deploy only after a disposable-provider smoke test. No production credentials or migrations are part of this PoC.
