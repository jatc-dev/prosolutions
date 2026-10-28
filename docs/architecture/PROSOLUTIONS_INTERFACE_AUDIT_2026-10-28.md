# ProSolutions interface and route audit

**Status:** Initial evidence-based inventory with the first cleanup/recovery batch deployed. The route wiring has been rechecked against `main`; live browser/CORS verification and the broader route/import sweep remain open. **Date:** 2026-10-28.

## Executive summary

Core owns the public platform landing at `/` and the focused login at `/login`. The Core route table explicitly maps `/` to `LandingPage`, which renders `Hero`, `Modules`, `Premium`, and `AdsSection`; `/login` and `/auth/callback` map to the login `HomePage`. The earlier concern that Core did not route to `LandingPage` is stale and is corrected here.

ProCV's previous Landing Features editor remains a transitional content source. Core's `Modules` component reads the public ProCV endpoint for the selected locale and retains localized static fallback copy. This is a compatibility bridge, not the final central catalog/admin solution.

## Findings and disposition

| Area | Evidence | Status | Recommendation | Risk |
|---|---|---|---|---|
| Core public landing and login | `apps/core/src/App.tsx` maps `/` to `LandingPage` and `/login` plus `/auth/callback` to `HomePage`. `LandingPage.tsx` composes Hero, Modules, Premium, AdsSection. | Active and intentionally separated | Preserve; add route/browser regression checks | Low |
| ProCV auth/account routes | `apps/procv/frontend/src/App.tsx` redirects `/login`, `/auth`, `/auth/callback`, `/register`, `/forgot-password`, `/reset-password`, and `/verify-email` to Core. | Intentional compatibility redirects | Preserve until inbound links and redirect behavior are tested | High |
| Free editor CTA | ProCV has a compatibility route `/editor-free` redirecting to `/editor` (PR #85). | Fixed; alias remains intentionally | Keep alias until external links have been checked | Low/medium |
| ProCV Landing Features admin | `LandingPageManagement.tsx`, `/admin/landing` route and admin navigation remain. | Active legacy admin and temporary source of truth | Preserve until central catalog editing, migration, rollback, and authorization are verified | Medium |
| Landing Features data path | ProCV backend exposes `GET /api/public/landing-features?lang=en|es`; public `PlatformSetting` keys `landing_features_en` and `landing_features_es` remain. The unused ProCV visual grid/hook/icon mapping were removed in PR #87; Core now fetches the endpoint in `apps/core/src/components/Modules.tsx` (PR #88). | Live compatibility bridge; not yet central CRUD | Preserve endpoint and saved settings until migration is reconciled and rolled back successfully in a test environment | Medium |
| Core module catalog | `apps/core/src/App.tsx` routes `/` to `LandingPage`; `Modules.tsx` renders module cards and fetches configured ProCV feature copy with localized fallback. ProCV feature copy is not yet the source of truth for every module or all module fields. | Canonical public surface, partially data-driven | Move toward a single catalog model/API and centrally protected editor; do not introduce a service before evaluating existing platform boundaries | Medium |
| CORS | PR #88 configures an explicit first-party origin allowlist on ProCV backend and the Core API base URL. | Configured and deployed; browser behavior unverified | Verify successful preflight/GET from each intended origin and no allow-origin header for an unlisted origin | Medium |
| Marketing vs entitlements | ProCV operational feature flags and monetization gates are separate from public marketing copy. | Distinct concepts | Keep marketing content descriptive; never use it to grant/revoke access | High |
| Shared UI | Core and ProCV both import `@prosolutions/ui`. | Shared implementation exists | Continue export/consumer audit before moving more code | Low/medium |

## Changes completed and deployment evidence

- PR #84 merged: initial architecture/interface audit documentation.
- PR #85 merged: `/editor-free` compatibility route redirects to `/editor`.
- PR #86 merged and deployed: Core `/` is the public landing; `/login` remains the focused central login.
- PR #87 merged and deployed: removed only unused `LandingFeaturesGrid.tsx`, `useLandingFeatures.ts`, and `landingFeatureVisuals.ts`; retained admin UI, public endpoint, and database settings.
- PR #88 merged and deployed: Core fetches admin-managed ProCV feature titles/descriptions for the selected locale and keeps localized fallback copy. Render reported Core static site and ProCV backend deployments as `live` on commit `3e72b1c5f6ebbc944d4a4ea18bfadf59c0cd3684`.
- Render environment variables were updated: Core `VITE_PROCV_API_BASE_URL` points to the ProCV API, and ProCV backend `CORS_ORIGIN` lists the first-party production origins.
- Read-only Neon verification confirmed `landing_features_en` and `landing_features_es` are public JSON arrays with five entries each; all ten entries have non-empty titles and descriptions. No production data was modified.
- Runtime logs confirm the ProCV backend started and its deployment became live. Direct HTTP/browser validation could not be executed from the available validation environment; actual browser rendering and CORS behavior are therefore **not verified**.

## Remaining work

1. Complete route/link/import inventory across Core, ProCV, ProJobs, and ProIdentity; classify each candidate before removal.
2. Add automated checks for Core public/login routes and ProCV compatibility redirects. Current Core package exposes build/lint scripts but no dedicated route-test script.
3. In a real browser, verify `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/editor`, and legacy redirects.
4. Verify the Core landing renders API-backed ProCV feature titles/descriptions in Spanish and English, and static fallback when the API fails.
5. Verify CORS preflight/GET from `https://prosolutions.page`, `https://www.prosolutions.page`, `https://procv.prosolutions.page`, and `https://projobs.prosolutions.page`; verify an unlisted origin does not receive an allow-origin header.
6. Implement the central module catalog model/API/admin only after reviewing the existing ProIdentity auth/role boundary and deployment/operational costs. Test visibility, ordering, locale fallback, malformed content, and unauthorized writes.
7. Migrate both existing ProCV locales with an idempotent import and reconciliation report before switching ownership; keep the legacy editor/API/settings until read-after-write, public rendering, rollback, and authorization are production-verified.
8. Review duplicate presentation code and dependencies after the canonical data-driven catalog is verified. Do not remove routes/components solely because they look old.

## Recommended order

1. Preserve current deployed landing/login separation and compatibility redirects.
2. Complete the route and public API smoke tests.
3. Design and test the central catalog boundary/admin with no production data mutation.
4. Reconcile/migrate the bilingual ProCV content and switch Core reads only after tests pass.
5. Remove transitional ProCV UI/API only in a separate change after verified usage checks.
6. Close issues #82 and #83 only when their acceptance criteria are met.

## Safety constraints

- Do not delete Prisma migration history.
- Do not drop or rewrite production rows as part of UI cleanup.
- Do not change authentication or redirect allowlists without end-to-end tests.
- Do not conflate marketing descriptions with feature flags or entitlements.
- Do not remove a page solely because it looks old; establish callers and intended behavior first.
