# ProSolutions Identity — Architecture and Migration Plan

**Status:** implementation RFC / staged migration plan  
**Owner:** ProSolutions platform  
**Scope:** ProSolutions Core, ProCV, ProJobs, and future professional modules  
**Safety rule:** do not disable the existing ProCV authentication flow or change production secrets/database state until migration gates pass.

## Executive decision

ProSolutions should provide one account and one sign-in experience across its ecosystem. Centralize identity and authentication, but keep authorization, tenant boundaries, and each module's business data separate.

The current implementation is a useful starting point: ProCV already has a `User` model, hashed passwords, email verification/reset tokens, short-lived JWT access tokens, rotating refresh sessions, and revocable database sessions. Core currently renders a landing page and ProJobs is primarily a public jobs portal. This makes a gradual migration preferable to a big-bang replacement.

## Target architecture

1. **ProSolutions Identity** — the authoritative account, credential, email-verification, recovery, session, and token issuer.
2. **Account/Profile** — stable user identifier, display name, locale and account preferences. Only store shared profile attributes that genuinely need to be common.
3. **Module APIs** — each API validates issuer, audience, expiry, and scopes/roles; it authorizes access to its own records. No module trusts a user ID supplied only by the browser.
4. **Module data** — CVs, applications, learning progress, interview sessions, and company/recruitment records remain logically separated with ownership checks and least-privilege access.
5. **Core portal** — provides the ecosystem entry point and account navigation; it does not become a second credential store.
6. **Single sign-on** — use a standards-based OIDC authorization-code flow with PKCE for browser clients if a dedicated identity provider is selected. Never copy access/refresh tokens between localStorage stores or place bearer tokens in URLs.

## Current known baseline

- ProCV backend: Express + Prisma + PostgreSQL/Supabase.
- Current auth routes include register, login, refresh, logout, me, profile, forgot/reset password, verify email, and resend verification.
- Current access tokens are sent as Bearer tokens; refresh token is stored in an HttpOnly cookie according to the ProCV documentation.
- Current frontend uses `procv_auth` localStorage as a legacy auth-state mechanism; inspect exact token contents and all consumers before changing it.
- Core is a Vite/React landing page with shared UI header/footer.
- ProCV and Core are deployed on different origins; ProJobs has its own public deployment. Cookie scope, CORS, CSRF, redirect allowlists, and browser storage therefore require explicit design.

These points must be revalidated against the branch and live configuration before implementation. No production environment variables or database have been changed by this document.

## Provider decision gate

Compare two options in a short proof of concept before selecting one:

### A. Evolve the existing ProCV auth service into ProSolutions Identity
- Advantages: retain current account records and credential/session semantics; fewer moving parts initially.
- Risks: the team must implement and maintain secure OIDC/OAuth behavior, key rotation, discovery/JWKS, client registration, consent/redirect validation, and protocol security correctly. Do not treat a home-grown JWT endpoint as OIDC.

### B. Adopt a managed/standard OIDC provider (evaluate Supabase Auth first because Supabase is already used)
- Advantages: standards-based SSO and less custom protocol code.
- Risks: password-hash/account migration may not be seamless; provider limits, cost, data location, outage behavior, email configuration, and lock-in must be evaluated.

**Selection criteria:** account continuity, support for existing password hashes or a safe password migration path, refresh/session revocation, MFA roadmap, custom domains, OAuth/OIDC support, availability, operational effort, cost at projected scale, and ability to test without affecting production users.

Do not assume Supabase Auth is already configured or that existing ProCV users can be imported without friction. Keep the provider decision open until the proof of concept documents evidence.

## Phased delivery

### Phase 0 — Read-only audit (required before auth code changes)
- Inventory every auth endpoint, middleware, JWT claim, cookie attribute, CSRF rule, CORS origin, redirect, and token persistence location.
- Trace frontend login/refresh/logout flows and all protected API calls.
- Inspect Prisma migrations, RLS policies, role assumptions, user/session counts without exposing personal data, and database ownership.
- Inventory Render services, domains, environment-variable names, and deployment/rollback procedures. Do not read or copy secret values into issues/logs.
- Map all apps to auth state: Core, ProCV, ProJobs, and any dormant modules.

**Exit criteria:** current-state diagram, data/credential migration feasibility, threat model, provider comparison, affected-file list, and rollback plan.

### Phase 1 — Identity contract and proof of concept
- Define immutable subject/user ID, issuer, audience per API, expiry, scopes/roles, logout/revocation semantics, and account lifecycle.
- Prototype sign-in from Core to ProCV on non-production/test configuration.
- Validate CSRF, exact redirect URI allowlists, cookie behavior, refresh rotation/reuse detection, and session revocation.
- Document how existing accounts keep their IDs and regain access if credential migration is not directly supported.

**Exit criteria:** automated integration tests pass; no production users or secrets changed.

### Phase 2 — ProCV compatibility adapter
- Keep existing routes operating while the new identity path is tested.
- Introduce a small, explicit authentication adapter only after contract selection. Avoid dual authority or ambiguous tokens.
- Preserve CV ownership and existing User IDs where possible.
- Add metrics that record outcomes, not credentials/tokens/PII.

**Exit criteria:** login, email verification, refresh rotation, logout, password reset, revoked session, and CV CRUD pass regression tests for old and new paths.

### Phase 3 — Core portal and ProJobs
- Add clear sign-in/account entry points to Core.
- Keep public job browsing public.
- Gate personal features (saved jobs, applications, preferences) on sign-in.
- Use a trusted backend API for user-specific data; do not store sensitive profile data in static snapshots or job catalog files.
- Configure only exact allowed callback/logout URLs and production origins.

### Phase 4 — New modules
- ProCareer: applications and reminders.
- ProLetter: generated/editable job documents.
- ProSkills and ProInterview: learning progress and practice history.
- ProRecruit/ProCompany: organization model, membership, explicit roles and scoped permissions; never equate an ordinary user role with recruiter/admin privileges.

New modules must use the identity contract from day one and must not create local password stores.

### Phase 5 — Rollout and retirement
- Pilot with test accounts and a small opt-in cohort.
- Monitor sign-in success, refresh failures, 401/403 rates, email delivery, and support cases.
- Provide a documented rollback path that does not strand users or delete records.
- Remove legacy auth only after all clients have migrated and a defined observation window passes.

## Security requirements / non-negotiable gates

- Use a proven OIDC provider/library; do not invent an OAuth/OIDC implementation.
- Use authorization-code flow with PKCE for browser clients; validate state and nonce.
- Validate token signature, issuer, audience, expiry, and required scopes/roles server-side.
- Keep refresh tokens in appropriately scoped HttpOnly, Secure cookies; never expose them to JavaScript or URLs.
- Set exact CORS origins; configure credentialed CORS intentionally.
- Apply CSRF defenses to cookie-authenticated state-changing operations.
- Use strict redirect URI allowlists; no open redirects or wildcard callbacks.
- Keep authorization checks at every API/data boundary; shared login is not shared privilege.
- Maintain rate limits, generic recovery responses, email verification, session revocation, audit logging, and secrets management.
- Never commit secrets, dump production user data, or change production database/Render variables as part of an unreviewed code patch.

## Required automated test matrix

- New account registration and duplicate email.
- Login success/failure, unverified email, rate limiting.
- Authorization-code callback, state/nonce validation, invalid redirect.
- Access token expiry, wrong issuer/audience, missing scope, tampered token.
- Refresh rotation, reuse detection, logout, global/session revocation.
- CSRF rejection and allowed request.
- CORS and cookie behavior on localhost and production-like subdomains.
- Password reset and email verification.
- User A cannot read/update User B's CV, applications, learning history, or recruiter data.
- Existing ProCV account can sign in after migration without losing CVs or ownership.
- Public ProJobs browsing remains available without authentication.

## Rollback and release policy

- Use a dedicated feature branch and reviewed pull requests.
- Deploy to preview/staging first; do not merge solely because TypeScript/build passes.
- Take and verify appropriate backups before any production schema or credential migration.
- Do not force password resets or invalidate all sessions unless explicitly part of a tested, communicated security plan.
- Keep existing login operational until the migration's exit criteria are met.
- Production rollout requires successful CI, end-to-end tests, a tested rollback, and manual smoke tests on Core, ProCV, and ProJobs.

## Immediate next tasks

1. Complete the read-only audit and current-state data flow.
2. Compare the current auth service against a standard OIDC provider, including a credential migration proof of concept.
3. Decide the provider based on evidence and document the contract.
4. Implement the smallest testable SSO slice (Core → ProCV) on a dedicated branch.
5. Only then expand to ProJobs and future modules.

## Explicit non-goals for the first release

- No forced user migration.
- No production credential/database edits before test evidence and rollback.
- No global sharing of CV or application data by default.
- No recruiter/admin permissions granted merely because a user is authenticated.
- No implementation of every future module before the identity foundation is stable.

## Phase 0 read-only audit — verified repository findings (2026-10-18)

The following findings were verified against the current `main` source and are recorded here as implementation inputs, not as proof of production configuration:

- **Core is not an identity provider.** Its current role is portal/navigation. The repository does not yet implement a shared OIDC issuer or a Core-to-ProCV authorization-code + PKCE flow.
- **ProCV owns the current credential flow.** The backend exposes registration, login, refresh, logout, profile, email verification, and password-recovery routes. It verifies passwords with bcrypt and signs access/refresh JWTs using the existing JWT configuration.
- **Browser access-token persistence is legacy local storage.** `apps/procv/frontend/src/stores/authStore.tsx` stores the access token under `procv_auth` in localStorage and sets it on the API client. The backend also uses a refresh-token cookie. Do not copy these tokens between apps or put them in redirect URLs.
- **Session enforcement needs an explicit security test before migration.** In `apps/procv/backend/src/middleware/auth.ts`, the database-session lookup and idle-timeout/revocation checks run only when the refresh-token cookie is present; a valid bearer access token without that cookie proceeds past JWT verification. Confirm whether this is intentional for supported clients, then add tests for missing, expired, revoked, and idle sessions before changing the behavior.
- **Session bootstrap is coupled to local storage.** The frontend's `AuthProvider` only attempts refresh when a `procv_auth` value exists. Test a browser with a valid refresh cookie but no local-storage entry before deciding whether the flow should change.
- **The public login navigation is not SSO.** The shared URL helper points to ProCV's own `/login` route. Sending Core buttons there improves navigation but does not establish a shared session, central account lifecycle, or cross-module logout.
- **Email delivery remains an independent onboarding blocker.** Repository code sends verification email asynchronously; operational sender-domain alignment must be verified separately and must not be “fixed” by bypassing email verification.

### Phase 0 exit criteria still outstanding

1. Add automated security tests for the session cases above and document the intended bearer-client contract.
2. Inspect cookie attributes, CORS/CSRF behavior, JWT issuer/audience claims, redirect handling, and every token consumer across apps.
3. Compare a managed OIDC provider with evolving the existing service using a non-production proof of concept; document account/password migration feasibility and rollback.
4. Only after those gates pass, implement a provider-backed OIDC flow behind a feature flag. Preserve existing ProCV login until parity and rollback are proven.

**No authentication code, production secrets, database records, or deployment configuration were changed by this audit note.**
