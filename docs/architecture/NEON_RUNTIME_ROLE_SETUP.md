# Neon runtime role setup (2026-10)

## Purpose

Prepare three separate runtime logins for the databases proidentity, procv, and projobs. This is a preparation guide only. Do not configure Render or run application migrations against Neon until the module-specific schema and permission checks have been reviewed.

## Critical Neon-specific behavior

Neon roles created in the Console, API, or CLI are initially granted membership in neon_superuser. That role includes powerful administrative privileges and may include BYPASSRLS. A Console-created login must not be used by an application until its inherited neon_superuser membership has been revoked and its effective privileges verified.

Official references:
- https://neon.com/docs/manage/roles
- https://neon.com/docs/manage/database-access

## Runtime login names

Create these three login roles in the Neon Console under the production branch → Postgres database → Roles → Add role:

| Login role | Only database it will be used to access |
| --- | --- |
| proidentity_runtime | proidentity |
| procv_runtime | procv |
| projobs_runtime | projobs |

Let Neon generate each password. Save each password only in the password manager / appropriate Render secret field; never commit it or paste it into chat. Do not copy any connection strings into the repository.

## Important sequencing

1. Create the three login roles in Console, but do not use them for an application yet.
2. Before granting application privileges, connect to the intended branch with the administrative project role and revoke the inherited administrative membership for each runtime login:

       REVOKE neon_superuser FROM proidentity_runtime;
       REVOKE neon_superuser FROM procv_runtime;
       REVOKE neon_superuser FROM projobs_runtime;

   Run this only after confirming the three exact role names exist. If Neon reports a role does not exist, stop and correct the name; do not create a substitute role implicitly.

3. Verify the roles no longer inherit administrative membership. Check the membership graph and effective attributes rather than trusting the role names:

       SELECT
         r.rolname,
         r.rolsuper,
         r.rolcreatedb,
         r.rolcreaterole,
         r.rolbypassrls,
         pg_has_role(r.oid, 'neon_superuser', 'MEMBER') AS member_of_neon_superuser
       FROM pg_roles AS r
       WHERE r.rolname IN (
         'proidentity_runtime',
         'procv_runtime',
         'projobs_runtime'
       )
       ORDER BY r.rolname;

   Expected: all three rolsuper, rolcreatedb, rolcreaterole, rolbypassrls, and member_of_neon_superuser values are false. If any is true, stop before configuring an application.

4. Do not grant table access until each module's schema and RLS policy strategy has been applied and tested. ProIdentity needs account-wide access for its API; ProCV must retain its application-level ownership checks; ProJobs is designed for transaction-local subject context and forced row-level security. Their grants are intentionally not interchangeable.
5. Keep a separate administrative/migration connection for schema changes. Runtime logins must not own application tables and must not be configured as migration credentials.
6. Do not change Render environment variables or deploy any service until the per-module permissions and smoke tests pass and the owner explicitly approves cutover.

## Safety boundary

This guide does not create roles, revoke privileges, apply SQL, copy data, change Render, or deploy. Role passwords and connection strings are secrets and should remain outside GitHub and ChatGPT.
