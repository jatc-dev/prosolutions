# ProSolutions interface and route audit

**Status:** Initial evidence-based inventory with first cleanup/recovery batch deployed; remaining items require targeted route and end-to-end verification. **Date:** 2026-10-28.

## Executive summary

The monorepo centralised authentication in ProSolutions Core, but parts of the former ProCV landing architecture remain. The goal is to remove confirmed dead code while preserving working routes, module functionality, content, production data, and migration history.

## Initial findings

| Area | Evidence | Preliminary status | Recommendation | Risk |
|---|---|---|---|---|
| ProCV auth/account routes | apps/procv/frontend/src/App.tsx redirects /login, /auth, /auth/callback, /register, /forgot-password, /reset-password, and /verify-email to Core | Intentional compatibility redirects | Preserve until inbound links and redirect behavior are tested | High |
| ProCV public root | apps/procv/frontend/src/pages/HomePage.tsx still contains a module-presentation/login surface, while central login is in Core | Overlapping public experience | Keep the legacy root only while checking inbound links; central public landing and login are now separate | Medium |
| Free editor CTA | ProCV HomePage links to /editor-free; a compatibility route now redirects to /editor | Fixed in PR #85 and deployed | Keep alias until external links have been checked; /editor is the canonical editor route | Low/medium |
| Landing Features admin | LandingPageManagement.tsx, /admin/landing route, and AdminLayout navigation still exist | Existing capability; still needed as temporary source of truth | Preserve until central catalog editing and data migration are production-verified | Medium |
| Landing Features data path | Public endpoint GET /api/public/landing-features and PlatformSetting keys landing_features_en/es remain. The unused visual grid and hook had no runtime consumers | Legacy API/data retained; orphan UI removed in PR #87 | Keep the API and settings until migration/rollback is proven; do not drop production content | Medium |
| Core module catalog | Core App routes / to LandingPage and /login to HomePage; LandingPage composes Hero, Modules, Premium and AdsSection | Canonical public landing is now wired and deployed in PR #86 | Keep one public module catalog on Core landing; login remains focused | Low |
| Module descriptions | PR #88 connects Core's ProCV card to the existing public ProCV API with static localized fallback; ProJobs remains localized static copy | Compatibility bridge deployed; central CRUD not implemented | Follow ADR_PROSOLUTIONS_MODULE_CATALOG.md before expanding admin/catalog schema | Medium |
| CORS | PR #88 configures explicit first-party origin allowlist on ProCV backend and Core API base URL | Configuration updated; services deployed live | Verify actual browser preflight/request behavior from each production origin and monitor blocked origins | Medium |
| Marketing vs entitlements | ProCV has feature-flags.ts and monetization FeatureGate, while public catalog also calls copy 'features' | Distinct concepts | Keep marketing copy separate from access-control and subscription logic | High |
| Shared UI | Core and ProCV both import @prosolutions/ui | Shared implementation exists | Audit exports and duplication before moving more code | Low/medium |

## Changes completed and deployment evidence

- PR #84 merged: initial architecture/interface audit documentation.
- PR #85 merged: `/editor-free` compatibility route redirects to `/editor`.
- PR #86 merged and deployed: Core `/` is the public landing; `/login` remains the focused central login.
- PR #87 merged and deployed: removed only the unused `LandingFeaturesGrid.tsx`, `useLandingFeatures.ts`, and `landingFeatureVisuals.ts`; retained admin UI, public endpoint, and database settings.
- PR #88 merged and deployed: Core fetches admin-managed ProCV feature titles/descriptions for the selected locale and keeps localized fallback copy. Render reported the Core static site, ProCV backend, and ProCV frontend deployments as `live` on commit `3e72b1c5f6ebbc944d4a4ea18bfadf59c0cd3684`.
- Render environment variables were explicitly updated: Core `VITE_PROCV_API_BASE_URL` points to the ProCV API, and ProCV backend `CORS_ORIGIN` lists the first-party production origins.
- Read-only Neon verification confirms `landing_features_en` and `landing_features_es` are public JSON arrays with five entries each; all ten entries have non-empty titles and descriptions. No production data was modified.
- Runtime logs confirm the ProCV backend started and its deployment became live. An external live HTTP/browser request could not be executed from the available validation environment; browser-side rendering and CORS behavior still require a real browser smoke test.

## Remaining inventory

1. Compare all route declarations against Link, navigate, and window.location destinations.
2. Trace page/component/hook imports, dynamic imports, API consumers, admin nav, and shared package exports.
3. Check stale locale keys, assets, styles, feature flags, and links.
4. Test `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/editor`, and legacy redirects in an authenticated browser session where appropriate.
5. Verify the Core page renders the API-backed ProCV features in Spanish and English; verify static fallback when the API fails.
6. Verify CORS from all first-party origins and ensure an unlisted origin does not receive an allow-origin header.
7. Add automated route/navigation checks for critical public, login, dashboard, and admin flows.
8. Continue the duplicate catalog sweep only after the canonical landing and editor are confirmed in browser testing.

## Recommended order

1. Keep the merged ProCV loading/redirect fix stable and confirm its Render deployment.
2. Resolve the `/editor-free` behavior.
3. Make Core the canonical public platform landing and module catalog.
4. Recover and centralise bilingual module content, preserving ProCV's existing copy.
5. Remove duplicate presentation code only after the canonical implementation is deployed.
6. Finish the unused-route/component sweep and add regression checks.

## Safety constraints

- Do not delete Prisma migration history.
- Do not drop or rewrite production rows as part of UI cleanup.
- Do not change authentication or redirect allowlists without end-to-end tests.
- Do not conflate marketing descriptions with feature flags or entitlements.
- Do not remove a page solely because it looks old; establish callers and intended behavior first.
