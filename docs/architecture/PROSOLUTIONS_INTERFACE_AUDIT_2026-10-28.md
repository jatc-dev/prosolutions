# ProSolutions interface and route audit

**Status:** Initial evidence-based inventory; not a complete dead-code determination. **Date:** 2026-10-28.

## Executive summary
The monorepo centralised authentication in ProSolutions Core, but parts of the former ProCV landing architecture remain. The goal is to remove confirmed dead code while preserving working routes, module functionality, content, production data, and migration history.

## Initial findings

| Area | Evidence | Preliminary status | Recommendation | Risk |
|---|---|---|---|---|
| ProCV auth/account routes | apps/procv/frontend/src/App.tsx redirects /login, /auth, /auth/callback, /register, /forgot-password, /reset-password, and /verify-email to Core | Intentional compatibility redirects | Preserve until inbound links and redirect behavior are tested | High |
| ProCV public root | apps/procv/frontend/src/pages/HomePage.tsx still contains a module-presentation/login surface, while central login is in Core | Overlapping public experience | Decide whether root should be a short product landing, lightweight handoff, or redirect to a Core product detail page | Medium |
| Free editor CTA | ProCV HomePage links to /editor-free, but App.tsx has no matching route and wildcard redirects to / | Potentially broken/stale route | Trace intended behavior and either implement it or point CTA to a valid destination | High |
| Landing Features admin | LandingPageManagement.tsx, /admin/landing route, and AdminLayout navigation still exist | Existing capability | Preserve until a replacement and data continuity are verified | Medium |
| Landing Features data path | useLandingFeatures.ts and LandingFeaturesGrid.tsx have no external consumers found in code search; GET /api/public/landing-features and PlatformSetting keys landing_features_en/es remain | Likely orphan UI/hook plus live legacy API/data | Verify references and inspect saved values before removal; preserve admin/data until migration | Medium |
| Core module catalog | apps/core/src/pages/HomePage.tsx contains module cards; apps/core/src/components/Modules.tsx is imported by apps/core/src/pages/LandingPage.tsx, but Core App.tsx routes only to HomePage and does not import LandingPage | Likely unreachable legacy landing page and its dependent sections | Verify Render rewrite/static entry configuration and external deep links; decide whether to restore LandingPage as canonical home or remove its unused page/components after review | Medium |
| Marketing vs entitlements | ProCV has feature-flags.ts and monetization FeatureGate, while public catalog also calls copy 'features' | Distinct concepts | Keep marketing copy separate from access-control and subscription logic | High |
| Shared UI | Core and ProCV both import @prosolutions/ui | Shared implementation exists | Audit exports and duplication before moving more code | Low/medium |

## Complete the inventory
1. Compare all route declarations against Link, navigate, and window.location destinations.
2. Trace page/component/hook imports, dynamic imports, API consumers, admin nav, and shared package exports.
3. Check stale locale keys, assets, styles, feature flags, and links.
4. Specifically verify whether apps/core/src/pages/LandingPage.tsx is unreachable: it composes Hero, Modules, Premium, and AdsSection, but apps/core/src/App.tsx currently routes / to HomePage and has no LandingPage route/import.
5. Search current imports for LandingFeaturesGrid/useLandingFeatures; code search found only the component's own declaration and the hook-to-grid type import, so treat both as strong unused candidates, not automatic deletion approvals.
6. Classify each item as active, intentional compatibility redirect, duplicated, unreachable candidate, or safe to remove after validation.
7. A zero-reference result alone is not sufficient if dynamic routing, hosting rewrites, or external links may exist.

## Recommended order
1. Keep the merged ProCV loading/redirect fix stable and confirm its Render deployment.
2. Resolve the /editor-free behavior.
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
