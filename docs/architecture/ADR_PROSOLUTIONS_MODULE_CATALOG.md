# ADR: ProSolutions public module catalog and Landing Features

- **Status:** Accepted for the next implementation phase
- **Date:** 2026-10-28
- **Scope:** Public module marketing content only; not feature flags, authorization, plans, or entitlements

## Context

ProSolutions now has a canonical public landing at `/` and a focused central login at `/login`. ProCV's previous Landing Features editor stores bilingual arrays in `procv.PlatformSetting` under `landing_features_en` and `landing_features_es`. Those settings are public and currently contain five valid entries per locale. Core's module catalog was previously hard-coded, so the legacy editor's content did not reach the central public landing.

PR #88 restores continuity: Core reads the existing public ProCV endpoint and falls back to localized static copy if the API is unavailable. This is a compatibility bridge, not the final administration architecture.

## Decision

1. **Public placement:** Keep platform-wide positioning and module discovery on the Core public landing (`/`). Keep authentication focused at `/login`; do not place a large marketing grid inside the login form.
2. **Content model:** Evolve toward a module catalog with a module record and ordered, localized marketing content. Each module should support a name, tagline, short description, CTA label/URL, visibility/publish state, display order, and feature entries with localized title and description.
3. **Administrative boundary:** Administration must be available from the central ProSolutions admin experience and protected by existing platform-admin authorization. Keep catalog operations in a separately testable catalog domain/API module; do not mix marketing content with identity/session logic or subscription enforcement.
4. **Storage and API:** Before building CRUD, inspect the current ProIdentity service's auth/role boundary and existing admin conventions. Prefer a platform-owned catalog schema/API only if it can be isolated cleanly from identity concerns; otherwise create a small dedicated catalog API rather than coupling the catalog to ProCV or ProJobs. Do not introduce a new service until the repository's deployment and operational cost is assessed.
5. **Migration:** Treat the ProCV `PlatformSetting` arrays as the source of truth until a verified migration is ready. Migration must be idempotent, preserve IDs/order/Spanish and English copy, and include a reconciliation report. Do not delete the legacy settings or editor until read-after-write, public rendering, rollback, and admin authorization are verified in production.
6. **Public API:** Return only explicitly published, public fields. Validate and sanitize localized strings, URLs, order, and visibility. Support locale fallback (requested locale -> English -> safe static fallback). Malformed records must not break the full catalog.
7. **Access control:** Marketing copy is descriptive only. Feature flags, roles, subscription checks, and entitlements remain in their existing enforcement paths. Public read must not expose internal settings; write/publish operations require server-side authorization.
8. **Quality gates:** Add automated tests for public retrieval, locale fallback, ordering, visibility, malformed records, unauthorized writes, and route/CTA destinations. Test CORS from each first-party public origin and reject unlisted browser origins.

## Consequences

- The central landing is the canonical place for platform/module marketing; login stays uncluttered.
- The existing ProCV editor remains available during the transition, avoiding data loss or an admin dead end.
- PR #88 is a temporary bridge: ProCV remains the data owner until a deliberate catalog migration is implemented.
- A shared catalog should not be considered complete until central administration, authorization, migration reconciliation, automated tests, and production verification are all delivered.

## Rollout plan

1. Complete the interface/route inventory and record confirmed dead-code removals.
2. Implement the central catalog API/model and admin UI behind tests; first prove it in a non-production branch/environment.
3. Import both ProCV locales and compare item counts, order, and text before switching reads.
4. Switch Core reads to the new catalog with safe fallback; monitor logs and verify all first-party CORS origins.
5. Enable central editing/publishing, validate authorization and rollback, then retire the legacy ProCV editor/endpoint only in a separate change after explicit usage checks.
