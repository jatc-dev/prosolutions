# ADR: Central Module Catalog Service and Authorization Boundary

- **Status:** Proposed
- **Date:** 2026-10-28
- **Scope:** Public module catalog content, bilingual content administration, and migration from ProCV `PlatformSetting`
- **Related:** `ADR_PROSOLUTIONS_MODULE_CATALOG.md`, `PROSOLUTIONS_INTERFACE_AUDIT_2026-10-28.md`

## Context

The Core public landing page renders the ProCV and ProJobs cards from locale dictionaries, and temporarily overlays public ProCV feature copy from `GET /api/public/landing-features`. The latter reads `landing_features_en` and `landing_features_es` from ProCV `PlatformSetting`. The legacy ProCV admin editor remains the current write path.

ProIdentity is the account, session, role, and module-entitlement authority. Its `identityMiddleware` validates JWT issuer/audience and the persisted session; its admin router applies `requireRole('admin')`. ProCV's admin middleware also checks the `PROCV` module grant, so it is not automatically suitable for platform-wide catalog administration. A central catalog write API and a dedicated platform-catalog authorization capability do not currently exist.

The existing bilingual data is stored as two independent JSON arrays. The legacy admin UI has historically combined language arrays by index in places; that presentation must not be treated as a migration mapping.

## Decision

**Keep the existing ProCV endpoint as a compatibility bridge while designing a catalog domain that is independent of ProCV and ProIdentity. Do not migrate or delete existing settings until the new API, authorization tests, reconciliation report, and rollback have been verified.**

Target architecture:

1. **Catalog API:** a dedicated service/domain named ProSolutions Catalog owns catalog entries, localized copy, publication state, stable identifiers, and catalog audit events. The Core website remains a static client and never owns secrets or authorization decisions.
2. **Identity authority:** ProIdentity remains the authority for user identity and roles. The Catalog API validates Identity-issued tokens using configured issuer/audience and session/revocation rules, then applies a server-side `requirePlatformAdmin` authorization boundary. This boundary must be explicit and tested; a UI route guard is not authorization.
3. **Permission model:** for the first implementation, document and enforce exactly which Identity-side role/capability grants platform catalog write access. Do not infer permission from a ProCV/ProJobs module grant, a client-supplied field, email address, or an unsigned token. Prefer a dedicated catalog-administration capability if platform catalog administration must differ from account administrators. If the existing global Identity `admin` role is intentionally selected as the grant, the decision must be explicit and audited, and the API must still wrap it in a catalog-specific middleware.
4. **Storage:** use a catalog-owned schema/table and migrations, with no writes to ProCV `PlatformSetting` during initial reads. Reuse the existing Neon project only after deployment configuration and database isolation have been reviewed; do not create, migrate, or mutate production storage as part of this ADR.
5. **Compatibility:** the public endpoint can remain the read fallback until parity is proven. Keep the legacy ProCV editor available and its original settings intact through migration and a rollback window.

## Options considered

| Option | Advantages | Risks / trade-offs | Decision |
|---|---|---|---|
| Put central catalog CRUD in ProCV backend | Fastest reuse of current public feature endpoint and deployment | Makes a cross-product domain depend on ProCV; ProCV-specific admin middleware requires careful bypass/extension; future products inherit the wrong service boundary | Reject as target architecture; retain only as temporary bridge |
| Put catalog CRUD in ProIdentity | Existing JWT/session validation and admin middleware are nearby | Mixes product content lifecycle with identity/account authority; expands Identity's domain and blast radius | Reject |
| Add catalog domain/API as a dedicated service | Clear ownership, independent permissions and content lifecycle, suitable for more modules/locales | Adds deployment, monitoring, migrations, and service-to-service configuration | **Recommended target** |
| Keep locale dictionaries and settings only | No migration or service cost | No central admin-managed catalog; duplicated/fallback copy remains; no central publication workflow | Keep as fallback during transition, not end state |

## Minimum API and authorization contract

Public read:
- Return only published, sanitized fields for the requested locale.
- Normalize locale to supported language codes and use a documented fallback when a translation is absent.
- Do not expose internal audit data, draft entries, unpublished fields, or authorization metadata.

Administrative writes:
- Require a verified Identity access token, valid session/revocation semantics, and explicit platform catalog permission checked on the server for every mutation.
- Return 401 for missing/invalid/expired/revoked authentication and 403 for authenticated callers without the required permission.
- Validate input schema, locale, stable IDs, publication state, and content limits server-side.
- Record actor ID, action, entity ID, timestamp, and a safe change summary in an audit trail. Never log tokens or secrets.
- Use optimistic concurrency/versioning to prevent one locale or editor session from silently overwriting newer content.
- Apply rate limits and normal security middleware. CORS is not an authorization mechanism.

## Bilingual data reconciliation and migration

Treat `landing_features_en` and `landing_features_es` as separate source documents. Do not pair records by array index.

Before any production write, produce a dry-run report that includes:
- raw record count for each locale;
- missing, blank, malformed, and duplicate IDs per locale;
- IDs present in only one locale;
- locale-specific order and positions;
- title/description completeness and content differences;
- proposed stable-ID mapping for records without valid IDs;
- explicit conflict decisions and records requiring manual review.

Migration rules:
1. Preserve existing IDs when unique and valid within the catalog.
2. Never infer a translation pair solely because records share an array index or similar wording.
3. Preserve each locale's ordering independently.
4. Keep a locale's missing translation missing or mark it for review; do not silently copy the other language.
5. Store an immutable export/checksum of both original settings before any write.
6. Import to a non-production/test environment first, then compare record counts, IDs, order, publication visibility, and rendered copy per locale.
7. In production, use an idempotent, repeatable migration with a reconciliation report and explicit rollback procedure. Do not remove the original settings or editor in the same release.

## Required tests before enabling writes

| Case | Expected result |
|---|---|
| No Authorization header | 401; no catalog mutation |
| Invalid, expired, wrong-issuer/audience, or revoked-session token | 401; no catalog mutation |
| Valid ordinary user token | 403; no catalog mutation |
| Valid module admin without platform catalog permission | 403 |
| Valid platform catalog administrator | Authorized only for schema-valid permitted mutations |
| Client sends `role`, `isAdmin`, or permission in request body | Ignored; server-side claims/authority decide |
| Unpublished record requested through public API | Not returned |
| Invalid locale or malformed JSON | Controlled validation/fallback; no partial write |
| Duplicate stable ID or stale version | 409/validation error; no silent overwrite |
| Audit event on mutation | Actor/action/entity recorded without credentials |
| English/Spanish arrays have different lengths or order | Reconciliation report preserves each locale independently |
| Migration is run twice | Idempotent result, no duplicate records |
| Rollback executed | Legacy settings remain readable and public landing can revert |

Tests should exercise the HTTP route/middleware boundary, not only a standalone authorization helper. Include positive and negative cases, and assert that rejected requests leave storage unchanged.

## Rollout and rollback gates

1. Implement schema/API and permission boundary behind disabled writes; add unit and route integration tests.
2. Validate authorization with real signed test tokens/session fixtures, including no-module-grant and revoked-session cases.
3. Generate reconciliation report from read-only production exports; do not print secrets or personal data into CI logs.
4. Run migration in an isolated environment and compare both locales, stable IDs, ordering, and rendered output.
5. Deploy read-only public catalog endpoint and compare responses with the legacy bridge.
6. Enable administrative writes only after security checks, observability, backup/export, and rollback have been exercised.
7. Keep legacy ProCV editor/settings until a defined observation period passes and rollback is no longer required. Removal is a separate reviewed change.

Rollback must disable new writes first, restore the public read path to the compatibility bridge, and preserve both the new catalog data and original `PlatformSetting` values for investigation. Do not use destructive cleanup as rollback.

## Consequences

- Cross-product catalog content no longer belongs to ProCV or Identity.
- The dedicated service adds operational work but makes authorization and catalog lifecycle explicit.
- The existing public ProCV endpoint and localized dictionaries remain compatibility/fallback sources until migration is proven.
- No production schema, data, role, permission, or deployment is changed by this ADR.
