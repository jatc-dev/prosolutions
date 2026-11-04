# ProCV RLS Security Model

## Trust boundaries

ProCV keeps two PostgreSQL pools:

- `DATABASE_URL` connects as `procv_login` (or the separately supported `procv_runtime`) and assumes `procv_app` inside a transaction.
- `PROCV_ADMIN_DATABASE_URL` connects as `procv_admin_login` and assumes `procv_admin_app` inside a transaction. The two login roles use separate credentials. `procv_login` and `procv_runtime` are not members of `procv_admin_app`; `procv_admin_login` is not a member of `procv_app`.

Both policy roles are `NOLOGIN`, are not table owners, and have neither `SUPERUSER` nor `BYPASSRLS`. The migration checks role attributes, dangerous role memberships, table ownership, `ENABLE ROW LEVEL SECURITY`, and `FORCE ROW LEVEL SECURITY`. It rejects unexpected administrative memberships instead of weakening access to make a migration succeed.

The administrative boundary is the PostgreSQL login and its role membership, not an Express helper or a GUC. Policies recognize an administrator only when `current_user = 'procv_admin_app'`. A normal SQL session may set arbitrary custom GUC values and may attempt `SET ROLE`, but neither operation grants membership in `procv_admin_app`.

## User context integrity

PostgreSQL custom GUCs are caller-settable. The database therefore does not trust a user ID merely because it appears in `procv.user_id` or another setting. ProCV sets a transaction-local JSON payload and HMAC-SHA-256 signature. `procv_private.verified_context()` validates the exact payload using the verifier key in `procv_private.context_signing_keys`, which is owned by the `NOLOGIN` role `procv_context_owner`. Application roles can execute the verifier but cannot read the key table, assume its owner, or replace the verifier function. Invalid, missing, malformed, expired, or forged context resolves to `NULL` and denies protected access.

The signed claims include subject, audience (`procv-rls`), issuer (`procv-backend`), key ID, issue time, expiry, and a random JTI. The maximum context lifetime is 60 seconds in the application (the database accepts no more than 120 seconds). All GUC assignments and the role switch use transaction-local settings, so rollback/commit releases them with the pooled connection.

The key exists in two trust domains: the ProCV process environment (`PROCV_RLS_CONTEXT_KEY`) and a private database verifier table. A database owner, PostgreSQL superuser, or compromised ProCV process can subvert this model and is inside the trusted computing base. A SQL injection or a session holding only `procv_login`/`procv_runtime` cannot read the key or mint a valid token. An application process compromise can mint user context and is not contained by RLS; the separate admin database credential should be protected as a distinct secret and access path.

## ProIdentity administrator checks

Admin HTTP routes pass through the production `authMiddleware`: HS256 signature, issuer, audience, expiration, JTI, live session introspection, subject match, and current `PROCV` module entitlement are checked. `requireAdmin` then requires the current role returned by introspection to equal `admin`. The role from an old token is not used as authorization. Only after these checks do controllers call `withAdminContext`, which uses the separate admin database pool.

## Table policies

| Table | Ordinary `procv_app` | `procv_admin_app` | Public |
| --- | --- | --- | --- |
| `CV` | Signed subject must equal `userId` for reads and writes. | All rows. | None. |
| `CVVersion` | Parent CV must be visible and owned by the signed subject. `cvId` is non-null and has `ON DELETE CASCADE`. | All rows whose parent exists. | None. |
| `CVAtsAnalysis` | Parent CV must be visible and owned by the signed subject. | All rows whose parent exists. | None. |
| `AuditLog` | Reads own rows; inserts must use signed subject as actor; no updates/deletes. | Reads all and may mutate rows; inserts remain attributed to the signed actor. | None. |
| `PlatformSetting` | Reads rows with `isPublic = true`; no mutations. | Reads and mutates all rows. | Public rows only. |

Policies are recreated after dropping any existing policy on these tables. This matters because PostgreSQL combines permissive policies with `OR`; leaving a historical broad policy would defeat the restrictions.

## Provisioning prerequisites (not performed here)

The RLS migration expects `procv_login`, `procv_runtime`, `procv_app`, and a separately provisioned login role `procv_admin_login`. It creates the non-login policy role `procv_admin_app`, grants `procv_app` to the two ordinary login roles, grants `procv_admin_app` only to `procv_admin_login`, and fails if the admin login is shared with ordinary runtime roles.

Before any production rollout, an operator must:

1. Provision `procv_admin_login` with a unique credential and grant no role memberships other than `procv_admin_app` after the migration establishes it. Do not place this credential in `DATABASE_URL` or share it with ordinary runtime users.
2. Generate 32 random bytes (64 hex characters), store the value in the ProCV secret manager as `PROCV_RLS_CONTEXT_KEY`, and provision the matching `key_id = 'v1'` row in `procv_private.context_signing_keys` through a protected database-owner procedure. Do not put the value in source control, shell history, application logs, or a normal runtime session.
3. Store the separate admin connection string in the application secret manager as `PROCV_ADMIN_DATABASE_URL`, using the `procv_admin_login` username. Keep the normal connection string under `DATABASE_URL`.
4. Validate the migration and two-pool tests on an isolated PostgreSQL database, then review the changes independently before any production change.

Until those steps happen, missing keys or admin credentials cause protected calls to fail closed. This branch does not provision secrets, modify a production database, or activate production RLS.

## Local integration tests

`tests/rls.integration.test.ts` refuses remote hosts and databases outside the `procv_test[_suffix]` naming rule. It requires four explicit URLs: `PROCV_TEST_DATABASE_URL` (`procv_login`), `PROCV_TEST_RUNTIME_URL` (`procv_runtime`), `PROCV_TEST_ADMIN_ROLE_DATABASE_URL` (`procv_admin_login`), and `PROCV_TEST_OPERATOR_DATABASE_URL` (local test operator). The test creates a synthetic HMAC key in the database, seeds only synthetic CVs/settings/audit rows, checks unsigned GUC forgery and role separation, forces an audit trigger failure, and checks transaction-local context and cascade behavior.

Run `npm run test:rls:integration` only against a disposable local PostgreSQL database created for this suite. Applying migrations to that database is destructive only to that isolated test database; never supply Neon or production URLs.
