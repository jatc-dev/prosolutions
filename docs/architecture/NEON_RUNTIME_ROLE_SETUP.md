# Neon runtime role setup (2026-10)

## Purpose

Document the least-privilege application logins for the separate `proidentity`, `procv`, and `projobs` databases. The roles and module schemas have now been created in Neon; ProCV data is migrated and verified, ProIdentity data transfer is partial, and Render cutover remains blocked pending full Identity transfer and end-to-end tests.

## Neon-specific behavior and current state

Neon roles created in the Console, API, or CLI are automatically granted membership in `neon_superuser`. That membership carries administrative privileges and can bypass row-level security. In this project, attempting to revoke that membership from the Console-created `proidentity_runtime`, `procv_runtime`, and `projobs_runtime` roles failed with SQLSTATE 42501. **Do not use those three existing roles in Render.** Leave them unused while we establish the restricted roles; do not delete them yet.

The following permission-group roles were created and verified in the `production` branch:
- `proidentity_app` — NOLOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS.
- `procv_app` — same restricted attributes.
- `projobs_app` — same restricted attributes.

The following login roles were also created and verified: `proidentity_login`, `procv_login`, and `projobs_login`. Each is restricted, is not a member of `neon_superuser`, and can connect only to its matching database. The matching app-role memberships and module-specific table grants/policies have been applied. `projobs_login` is additionally a member of `projobs_api` for the forced-RLS ProJobs adapter.

Official references:
- https://neon.com/docs/manage/roles
- https://neon.com/docs/manage/database-access

## Restricted login roles

The three restricted logins (`proidentity_login`, `procv_login`, and `projobs_login`) have already been created and verified in the `production` branch. **Do not rerun `CREATE ROLE` or rotate credentials as part of this checklist.** The existing `*_runtime` roles are not approved for Render because they inherit `neon_superuser`; leave them unused pending a separate dependency review.

For future provisioning in a new environment only, generate unique passwords in a password manager and apply the reviewed role setup through the approved operational procedure. Never put passwords or connection strings in chat, GitHub, or committed files.

## Verify the login roles

Run this query after creating the logins:

```sql
SELECT
  r.rolname,
  r.rolcanlogin,
  r.rolsuper,
  r.rolcreatedb,
  r.rolcreaterole,
  r.rolreplication,
  r.rolbypassrls,
  pg_has_role(r.oid, 'neon_superuser', 'MEMBER') AS member_of_neon_superuser,
  pg_has_role(r.rolname, CASE r.rolname
    WHEN 'proidentity_login' THEN 'proidentity_app'
    WHEN 'procv_login' THEN 'procv_app'
    WHEN 'projobs_login' THEN 'projobs_app'
  END, 'MEMBER') AS member_of_expected_app_role
FROM pg_roles AS r
WHERE r.rolname IN (
  'proidentity_login', 'procv_login', 'projobs_login'
)
ORDER BY r.rolname;
```

Expected for all three: `rolcanlogin=true`; all administrative attributes and `member_of_neon_superuser=false`; `member_of_expected_app_role=true`.

## Important sequencing

1. `CONNECT` is restricted so each `*_login` role can connect only to its corresponding module database.
2. ProIdentity and ProCV have RLS enabled with server-role policies that permit the authenticated backend role to perform its application operations. This is defense in depth for server-only access, not per-row authorization; application-level authorization remains required.
3. ProJobs uses forced RLS and a transaction-local `projobs.user_id`; the Neon smoke test confirmed cross-user isolation and removed its test row.
4. ProCV schema/data have been migrated and row counts/content digests match Supabase. ProIdentity schema/history are present; the `User` table matches Supabase, but sessions, tokens, profiles, module grants, and audit data remain to be transferred by the guarded script/ workflow in PR #58.
5. Keep Supabase intact and do not change Render environment variables until the remaining Identity data transfer, authentication/module-entitlement tests, and service smoke tests pass. Runtime logins must not own tables and must not be used for migrations.

## Safety boundary

This guide records database roles and schema setup already completed in Neon. It does not perform the remaining Identity data transfer or change Render. Role passwords and connection strings are secrets and must remain outside committed files and chat.
