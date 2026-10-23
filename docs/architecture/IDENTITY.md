# ProIdentity — Central Identity and Module Entitlements

**Status:** authoritative architecture for the ProSolutions monorepo  
**Service:** `apps/identity/` (Express, Prisma, PostgreSQL)  
**Canonical issuer:** `https://identity.prosolutions.page`  
**JWT audience:** `prosolutions-api`

## 1. Ownership boundaries

ProIdentity is the single source of truth for platform accounts. No product module may register users locally, validate passwords locally, issue its own refresh sessions, or create verification/reset tokens.

| Concern | Owner |
|---|---|
| Account ID, email, password hash, active state and role | ProIdentity `User` |
| Email verification and password recovery | ProIdentity `EmailVerificationToken` / `PasswordResetToken` |
| Login, refresh-token rotation, logout and revocable sessions | ProIdentity `Session` and auth controllers |
| Product access grants and expiry | ProIdentity `ModuleAccess` |
| Professional profile shared across products | ProIdentity `ProfessionalProfile` |
| CVs, CV templates, CV versions and ATS analyses | ProCV database |
| ProCV product configuration and product audit logs | ProCV database |
| ProJobs public job discovery and future job-specific records | ProJobs, with account identity validated by ProIdentity tokens |

ProCV's `IdentityAccount` table is deliberately minimal: it stores only the ProIdentity subject ID and timestamps so ProCV can enforce referential integrity for CV ownership. It does not mirror email, name, role, password hash, verification status, refresh tokens, or sessions. The IDs are joined across databases in application code by validating the signed token; PostgreSQL does not create cross-project foreign keys.

## 2. Access-token contract

Every module validates the same JWT contract:

| Claim | Meaning |
|---|---|
| `iss` | `https://identity.prosolutions.page` |
| `aud` | `prosolutions-api` (the common platform API audience) |
| `sub` | Stable ProIdentity user ID |
| `email` | Current account email |
| `role` | Platform account role, e.g. `user` or `admin` |
| `modules` | The modules with an active, unexpired grant when this token was issued |
| `iat`, `exp` | Token issue and expiration times |

Tokens are signed using the shared platform JWT secret, expire after 15 minutes, and are renewed through the rotating refresh token held in a Secure, HttpOnly cookie with `Domain=.prosolutions.page` and `SameSite=None`. The refresh token itself is never placed in a URL or browser local storage. Each subdomain bootstraps its own short-lived access token from the shared cookie.

In ProCV's Render configuration, `JWT_SECRET` must equal Identity's `IDENTITY_JWT_SECRET`; code may use `IDENTITY_JWT_SECRET` as the explicit alias when present. `IDENTITY_ISSUER` and `IDENTITY_AUDIENCE` must use the canonical values above. CORS must include only the known first-party origins that need credentialed access.

## 3. Module access is an entitlement, not a role side effect

`ModuleAccess` is the durable authorization source. Login, refresh, and email verification read active grants; they must not silently re-enable a grant that an administrator revoked. New self-service accounts currently receive `PROCV` and `PROJOBS` once at registration. Future modules must be granted through the central module-access administration flow or an explicit onboarding policy.

The admin endpoints are mounted at `/api/modules`:

- `GET /api/modules/me` — current account's grants.
- `GET /api/modules/users` — paginated account/grant list; requires an Identity token with admin role.
- `POST /api/modules/grant` and `POST /api/modules/revoke` — validated, audited admin operations; mutating requests also require the platform CSRF token.

A revoke does not rewrite a JWT that has already been issued. The changed access appears on the next token refresh, and an existing access token can remain valid until its short expiry (up to 15 minutes). Do not claim immediate revocation unless a protected high-risk operation also checks live entitlement/session state.

## 4. Required module API checks

Every product backend must:

1. Verify JWT signature, `iss`, `aud`, expiry and subject using the shared platform secret.
2. Require the corresponding signed module entitlement, e.g. `PROCV` or `PROJOBS`, before serving protected product routes.
3. Derive the tenant/owner ID from the verified `sub`, never from a client-supplied owner ID.
4. Require `role=admin` in addition to the module claim for module administration.
5. Return `401` for missing/invalid tokens and `403` for a valid token without the required module grant.
6. Keep refresh tokens, password hashes, email-verification tokens and reset tokens out of product databases and URL parameters.

ProJobs can continue to show public job discovery anonymously. Any saved job, application, alert, candidate profile, recruiter function, or other personalized endpoint must require the appropriate Identity entitlement before it is enabled.

## 5. Adding another module safely

For a new product:

1. Add its enum value in both Identity's Prisma `Module` enum and `apps/identity/src/types/modules.ts` (`ALL_MODULES` included).
2. Create and deploy the Identity Prisma migration before granting the new entitlement.
3. Define an explicit onboarding/grant policy; do not infer module access from `role` alone.
4. Validate the common Identity JWT contract and enforce the new module claim in its backend middleware.
5. Add the module's access control UI/route to the central entitlement administration endpoint.
6. Add tests for a valid grant, missing grant, expired grant, revoked grant, incorrect issuer/audience, and expired token.

## 6. ProCV legacy identity-table cutover

The legacy ProCV database historically held `User`, `Session`, `EmailVerificationToken`, and `PasswordResetToken`. Those tables are not part of the active identity architecture and must be removed only after the CV owner IDs have been mapped to the matching ProIdentity user IDs.

The cutover utility in `apps/identity/scripts/migrate-procv-identity-boundary.ts` uses normalized email in memory to match legacy users across the two databases. It never stores emails or credentials in ProCV's local identity reference. It has two phases:

1. Back up both databases.
2. Set `DATABASE_URL` to ProIdentity and `PROCV_DATABASE_URL` to ProCV's direct PostgreSQL connection (port 5432). Run `npm run procv:identity:dry-run --workspace=apps/identity` and reconcile any unmatched accounts before writing.
3. Apply the ProCV Prisma migration through its direct database connection, then run `npm run procv:identity:prepare --workspace=apps/identity`. This creates the minimal reference table, remaps CV ownership and repairs the legacy AuditLog shape while keeping old auth tables as a rollback aid.
4. Deploy the updated ProCV backend/frontend and verify health, CV ownership, ATS analyses and admin routes.
5. Run `npm run procv:identity:finalize:dry-run --workspace=apps/identity`. Only after the new version is healthy, run `npm run procv:identity:finalize --workspace=apps/identity` to drop ProCV-local credentials, sessions and token tables.
6. Recheck counts of CVs, CV versions and ATS analyses, and confirm no foreign keys still point at the old User table.

The utility aborts rather than dropping local auth tables when it finds unmatched accounts, unrecognized CV owners, a non-empty connection-test table, or CVs without valid local identity references. It does not delete CV, version, ATS-analysis, platform-setting, or audit rows.

## 7. Data security in Supabase

ProCV and ProIdentity use Prisma through server-side database connections; the browser does not need direct table access via Supabase Data API. The `anon` and `authenticated` roles therefore have no direct table/sequence privileges on these product tables. RLS remains enabled as defense in depth. Never add client-facing grants or broad RLS policies to make a backend query work; keep database credentials server-side and grant the minimum required access.
