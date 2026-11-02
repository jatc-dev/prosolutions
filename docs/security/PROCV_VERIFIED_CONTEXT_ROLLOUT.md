# ProCV verified database identity context

## Status

Implementation work is isolated on `security/procv-rls-verified-jwt-context-2026-11`. It is not approved for merge or deployment. The database migration and adversarial PostgreSQL test suite remain mandatory release blockers.

## Security model

1. ProIdentity validates the bearer JWT signature, issuer, audience, persisted session, session expiry/revocation, idle timeout, active user state, and current module grants.
2. ProIdentity resolves the current role and module access from its database. It does not authorize from the role/modules copied into the original access token.
3. After those checks, ProIdentity issues a 60-second assertion with issuer `https://identity.prosolutions.page`, audience `procv-database`, subject, session JTI, current role, and current modules.
4. ProCV stores that assertion only in request-scoped AsyncLocalStorage. Each data operation places it in a transaction-local PostgreSQL setting.
5. PostgreSQL verifies the signature with a dedicated key stored in a private schema. Policies must use only verified claims; caller-controlled `procv.user_id` and `procv.is_admin` settings are prohibited.
6. The database key must not be readable by runtime/login roles. The application role must be NOLOGIN and NOBYPASSRLS. Every protected table must have RLS enabled and FORCE RLS.

## Code changes currently on the branch

- ProIdentity introspection now checks the persisted session and active user, then returns current role and active/unexpired module grants.
- ProIdentity can mint a short-lived ProCV database assertion after successful introspection.
- ProCV regular authentication requires that assertion and places it in request-scoped async context.
- ProCV admin authorization uses live ProIdentity introspection rather than the role claim embedded in the access token.
- ProCV database transaction context consumes the signed assertion and checks that its subject matches the requested user.

## Required before merge

- Add and review a migration that installs the private verifier and applies FORCE RLS policies to CV, CVVersion, CVAtsAnalysis, AuditLog, and PlatformSetting.
- Provision the same dedicated signing key into ProIdentity and the private Neon key table using a secret-safe channel. Never commit or chat the key.
- Configure `PROCV_DB_ROLE` per environment to the restricted NOLOGIN policy role.
- Ensure the application role has no direct access to the key table and only EXECUTE on verifier functions.
- Ensure the verifier requires HS256, exact issuer and dedicated audience, nonempty sub/JTI/role, unexpired exp, and PROCV module.
- Confirm all transaction paths (including admin and public settings) use the expected restricted role. Public settings must expose only rows with `isPublic=true`.
- Add real PostgreSQL integration tests using two separate runtime identities and an administrator identity.

## Mandatory adversarial test matrix

| Test | Expected |
| --- | --- |
| User A reads A CV | Allowed |
| User A reads B CV by ID | No row / denied |
| User A updates or deletes B CV | Denied |
| User A reads B CVVersion or CVAtsAnalysis | Denied |
| User A inserts child rows referencing B CV | Denied |
| User B reads A data | Denied |
| Missing, malformed, expired, wrong-audience, or wrong-signature assertion | No rows / denied |
| Forged legacy user/admin GUC values without a valid assertion | No rows / denied |
| Current administrator reads cross-user records | Allowed |
| Downgraded administrator reuses old access JWT | Denied as soon as introspection sees the new role |
| Revoked session reuses old access JWT | Denied |
| Inactive user reuses old access JWT | Denied |
| Runtime role reads private signing key | Permission denied |
| Runtime role has BYPASSRLS or owns protected tables | Must be false |

## Rollout gates

1. Apply migration only to isolated staging.
2. Provision a staging-only signing key through the approved secret manager / Neon privileged connection.
3. Run build, lint, unit tests, and the complete real-PostgreSQL matrix.
4. Inspect effective grants, role membership, FORCE RLS flags, policies, and table ownership.
5. Obtain explicit production-change approval, confirm a usable backup/restore path, and prepare a tested rollback.
6. Only then consider production migration and deployment.

No production database, environment variable, or Render service has been changed by this work. The new production config intentionally fails closed until PROCV_DATABASE_JWT_SECRET is set.


## Isolated Neon proof run — 2026-11-02

Branch: `br-solitary-unit-b5ep69a2` in the staging project. No production branch was used.

The ProCV tables were created on this isolated branch from the current Prisma model shape, then the SQL in `20261102000000_verified_jwt_rls/migration.sql` was applied directly in a Neon transaction. This was a database-policy proof, not a Prisma migration-runner deployment; the Prisma migration history was not marked as deployed.

Verified observations:

- `CV`, `CVVersion`, `CVAtsAnalysis`, `AuditLog`, and `PlatformSetting` all report RLS enabled and FORCE RLS enabled.
- Policy counts are respectively 1, 1, 1, 4, and 2.
- All five protected tables are owned by `neondb_owner`, not an application role.
- `procv_app_stage` and `procv_admin_app_stage` are NOLOGIN and NOBYPASSRLS.
- The app roles can execute the verifier functions but cannot SELECT the private signing-key table.
- `procv_runtime_stage` can SET ROLE to `procv_app_stage`; the temporary membership granted to `neondb_owner` solely to simulate this role switch was revoked and verified absent afterwards.
- With signed test assertions, user A saw only A's CV, versions, ATS analysis, and audit rows; user B saw only B's corresponding rows.
- Both ordinary users saw only the public platform setting. A signed admin assertion saw both users' rows and both public/private platform settings.
- With no database assertion, forged legacy `procv.user_id` and `procv.is_admin` GUCs did not create an identity or admin privilege; protected CV count was zero.
- Assertions with wrong issuer, wrong audience, expired `exp`, or missing `PROCV` module failed closed.
- The first verifier attempt exposed a JSON/JSONB operator bug; it was corrected in the migration and applied function, after which the valid test assertion resolved the expected subject.

Limitations of this proof:

- Tests used the isolated branch's existing test key and synthetic signed assertions. They did not use a token issued by the live ProIdentity service or the future `PROCV_DATABASE_JWT_SECRET`.
- Neon could not authenticate a direct `procv_runtime_stage` connection because that role has no password configured. Role switching was simulated from the branch owner after a temporary membership grant, then that grant was revoked. The actual runtime login connection still needs a credential-safe test.
- Write/insert/delete adversarial tests were not executed; the SQL safety gate blocked those mutation attempts. The policies include `WITH CHECK` and mutation predicates, but those paths are not counted as proven.
- The SQL was applied directly to the isolated branch after manually creating the schema tables. It has not been run through `prisma migrate deploy`.
- No TypeScript build, lint, Jest suite, or live ProIdentity-to-ProCV end-to-end test was run.

Therefore this proof demonstrates row visibility isolation for SELECT and signed-context verification in PostgreSQL, but does not satisfy the full release gate. Keep the PR draft and do not deploy.
