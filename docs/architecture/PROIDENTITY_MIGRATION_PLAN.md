# ProIdentity — Centralization Status and Cutover Plan

**Status:** central-auth implementation and ProCV database cutover are being consolidated in the `feat/procv-identity-boundary` release branch.  
**Authority:** `docs/architecture/IDENTITY.md` describes the current target architecture and ongoing requirements.

This document supersedes the older RFC below that described a provider selection gate and ProCV-owned authentication as future work. The old assumptions are historical context only; they are not the active implementation.

## Architecture decision

ProIdentity is the only account/credential/session/token authority. The current first-party flow is a central login form and shared HttpOnly refresh cookie, with short-lived JWT access tokens validated by each product API. This is a centralized first-party SSO design; it is not advertised as a full external OIDC authorization-code/PKCE provider.

- **Identity records:** ProIdentity `User`, `Session`, `EmailVerificationToken`, `PasswordResetToken`, `ProfessionalProfile`, and `ModuleAccess`.
- **ProCV product records:** CVs, CV versions, ATS analyses, platform settings, and product audit events.
- **ProCV identity reference:** a minimal `IdentityAccount` row keyed by the verified Identity JWT subject. It exists only to enforce local CV ownership referential integrity; it stores no credentials or duplicated account data.
- **ProJobs:** public job browsing remains anonymous. Any private candidate/employer function must verify Identity JWTs and require its module entitlement.

## Authorization rules

1. Identity issues tokens with `iss=https://identity.prosolutions.page` and `aud=prosolutions-api`.
2. Each API checks signature, issuer, audience, expiry, and required `modules[]` claim. ProCV requires `PROCV`; ProJobs requires `PROJOBS`.
3. Admin operations require both `role=admin` and the module entitlement needed to reach the administration surface.
4. `ModuleAccess` is durable authorization. Login and refresh read active, unexpired grants; they do not automatically re-enable revoked permissions.
5. Role and module grant changes appear in new access tokens after refresh. Because access tokens last 15 minutes, a stateless product API can accept the prior token until it expires; higher-risk routes must add live checks if immediate revocation is required.

## ProCV schema retirement

The old ProCV schema contains local credential and session tables that are no longer part of the application model. Removing them immediately would be unsafe because the `CV.userId` column used to reference those local user IDs, and a subset of migrated accounts have different ProIdentity IDs.

A two-phase utility is included in `apps/identity/scripts/migrate-procv-identity-boundary.ts`:

### Prepare (preserves the old tables as rollback aid)

1. Back up the ProCV and ProIdentity databases.
2. Set `DATABASE_URL` to ProIdentity and `PROCV_DATABASE_URL` to the direct ProCV PostgreSQL connection.
3. Run `npm run procv:identity:dry-run --workspace=apps/identity`. Resolve any unmatched account before proceeding.
4. Apply the new ProCV Prisma migration using the direct ProCV connection.
5. Run `npm run procv:identity:prepare --workspace=apps/identity`. It maps old account IDs to Identity subjects via normalized email held in memory, retargets CV ownership to `IdentityAccount`, and reconciles the legacy AuditLog column names. It does not drop the old user, session, or token tables.

### Deploy and verify

Deploy the branch to Render. Verify ProIdentity health, ProCV backend health, the shared-cookie refresh bootstrap, protected CV CRUD, and that existing CV versions and ATS analyses remain linked to the same CV IDs. Do not use a public or production user's credentials for automated smoke tests.

### Finalize (removes only obsolete local auth tables)

1. Run `npm run procv:identity:finalize:dry-run --workspace=apps/identity`.
2. After the new ProCV version is healthy, run `npm run procv:identity:finalize --workspace=apps/identity`.
3. The script refuses to continue if a CV lacks an `IdentityAccount`, if legacy accounts do not map, or if the dedicated `_conn_test` table contains data.
4. Verify post-cutover row counts for CV, CVVersion, CVAtsAnalysis and PlatformSetting, and verify ProCV no longer has `User`, `Session`, `EmailVerificationToken`, or `PasswordResetToken`.

The local ProCV `User` model must not be reintroduced into Prisma schema, runtime guards, seed scripts, admin APIs, or frontend pages. Account edits, password changes, email verification, recovery, role management and module entitlements remain in ProIdentity.

## Current release checklist

- [ ] Identity authorization tests cover missing/invalid tokens, wrong issuer/audience, absent module grant, and admin role checks.
- [ ] Frontend callback uses the shared cookie and never accepts a bearer token from query parameters or hashes.
- [ ] The Core login honors only same-origin or explicitly approved first-party `redirect_uri` destinations.
- [ ] ProCV access tokens use per-tab session storage; old `procv_auth` localStorage values are migrated and removed.
- [ ] Legacy ProCV auth schema is prepared, new backend is deployed and smoke-tested, then finalization drops legacy tables.
- [ ] GitHub CI passes for ProCV frontend/backend, Identity, Core and ProJobs.
- [ ] Render deployment is live and manual smoke checks pass for login, registration, email verification, refresh, logout, module access and recovery email delivery.
