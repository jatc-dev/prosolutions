# ProCV data model and centralized access

## Ownership boundaries

- **ProIdentity is the sole account authority.** It owns credentials, normalized email, verification, password recovery, account status, sessions, roles and `ModuleAccess`.
- **ProCV stores product data only.** CVs, ATS analyses, CV versions, platform settings and ProCV audit events remain in the ProCV database.
- **A CV's `userId` is the immutable ProIdentity subject (`sub`).** It is an external identifier, not a local user relation. ProCV must not create credentials, reset passwords, issue refresh tokens, or maintain local account/session tables.
- **ProJobs and future modules follow the same contract.** Each API validates the central issuer, common API audience, signature, expiry and its own module entitlement before serving private data.

## Request authorization contract

1. ProIdentity authenticates the account and issues a short-lived access JWT with `sub`, `iss`, `aud`, `role` and the module entitlements active at issuance.
2. Each module API validates the signature and exact issuer/audience, then requires its own module key (`PROCV`, `PROJOBS`, etc.).
3. Admin routes additionally require `role=admin`. Module access alone never implies administrator access.
4. Browser apps keep access tokens in memory. The central HttpOnly refresh cookie bootstraps a fresh short-lived access token when a module opens; tokens are not copied between apps or placed in URLs.
5. Data queries always scope by the verified JWT subject. A user ID sent in request bodies or query strings is never an authorization source.
6. `ModuleAccess` in ProIdentity is the entitlement source of truth. Because JWT claims are snapshots, entitlement revocations take effect for existing access tokens no later than the short access-token lifetime. If immediate revocation becomes a requirement, introduce a centralized introspection/cache strategy rather than adding account tables to each module.

## Database model

ProCV retains:
- `CV` — CV content and ownership by external Identity subject.
- `CVAtsAnalysis` — ATS analyses owned through the parent CV.
- `CVVersion` — historical snapshots.
- `PlatformSetting` — ProCV-specific configuration.
- `AuditLog` — module-level administrative and operational events, storing the central subject ID when available.

ProCV removes its former `User`, `Session`, `EmailVerificationToken`, and `PasswordResetToken` tables. Prisma migration history is retained; migration files are immutable historical records and must not be deleted to make the new schema look cleaner. The old `/admin/users` UI and local user/password administration endpoints are removed so account lifecycle cannot diverge from ProIdentity.

## Adding a module

1. Add a stable module enum value in ProIdentity's `Module` enum.
2. Add module access to the central grant/revoke workflow and the portal's module catalog.
3. Require the module entitlement in the module API middleware; do not rely only on hiding a frontend link.
4. Add ownership checks using `sub` for every private resource, including nested resources and exports.
5. Add tests for missing entitlement, expired/invalid token, wrong issuer/audience, cross-user access, and admin-only operations.
6. Keep the module's business schema separate. Do not duplicate password hashes, refresh sessions, or verification/reset tokens.

## Migration safety

The ownership backfill must run before the legacy `User` table is dropped. The migration fails if the two legacy subjects that changed during account consolidation are still referenced by CVs. Before running it in a different environment, reconcile all legacy CV owners to the corresponding Identity subjects; never blindly reuse production IDs in a fresh environment.
