# Neon runtime role setup (2026-10)

## Purpose

Prepare least-privilege application logins for the separate `proidentity`, `procv`, and `projobs` databases. This is a preparation guide only. Do not configure Render or run application migrations against Neon until module-specific schema and permission checks have been reviewed.

## Neon-specific behavior and current state

Neon roles created in the Console, API, or CLI are automatically granted membership in `neon_superuser`. That membership carries administrative privileges and can bypass row-level security. In this project, attempting to revoke that membership from the Console-created `proidentity_runtime`, `procv_runtime`, and `projobs_runtime` roles failed with SQLSTATE 42501. **Do not use those three existing roles in Render.** Leave them unused while we establish the restricted roles; do not delete them yet.

The following roles have been created through SQL in the `production` branch and verified:
- `proidentity_app` — NOLOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS.
- `procv_app` — same restricted attributes.
- `projobs_app` — same restricted attributes.

The verification showed all three are not members of `neon_superuser`. These are permission-group roles, not connection logins. They have not yet been granted table privileges.

Official references:
- https://neon.com/docs/manage/roles
- https://neon.com/docs/manage/database-access

## Restricted login roles

Because the names `*_runtime` already exist as Console-created roles, create new SQL-based logins with distinct names. Use a password manager to generate three unique strong passwords. Do not send passwords or connection strings in chat or commit them to GitHub.

Run the following in Neon SQL Editor on the `production` branch, connected to `neondb`. Replace each password placeholder with its own generated password before execution. Do not execute the placeholders literally.

```sql
CREATE ROLE proidentity_login
  LOGIN PASSWORD 'REPLACE_WITH_UNIQUE_PROIDENTITY_PASSWORD'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

CREATE ROLE procv_login
  LOGIN PASSWORD 'REPLACE_WITH_UNIQUE_PROCV_PASSWORD'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

CREATE ROLE projobs_login
  LOGIN PASSWORD 'REPLACE_WITH_UNIQUE_PROJOBS_PASSWORD'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

GRANT proidentity_app TO proidentity_login;
GRANT procv_app TO procv_login;
GRANT projobs_app TO projobs_login;
```

If any `CREATE ROLE` fails because the login name already exists, stop and inspect that role; do not drop or alter it blindly. If a later statement fails, report the exact error without any secret values.

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

1. Do not grant table, schema, or function access yet. The module-specific schema and RLS strategy must be reviewed and tested first.
2. Database `CONNECT` grants and restrictions for other databases must be set deliberately; do not assume a role can access only one database merely because of its name.
3. ProIdentity needs account-wide access for its server-only API. ProCV currently has RLS enabled without policies in the source schema; preserve application-level ownership checks and explicitly decide/test its runtime access strategy before cutover. ProJobs is designed for transaction-local subject context and forced RLS.
4. Keep a separate administrative/migration connection for schema changes. Runtime logins must not own application tables and must not be used for migrations.
5. Do not change Render environment variables, apply production schemas, copy data, or deploy until per-module permissions and smoke tests pass and the owner explicitly approves cutover.

## Safety boundary

This guide does not apply database schemas, copy data, change Render, or deploy. Role passwords and connection strings are secrets and must remain outside GitHub and ChatGPT.
