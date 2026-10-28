# ADR: Ownership and placement of module landing features

- **Status:** Proposed direction; implementation pending inventory and review
- **Date:** 2026-10-28

## Context

ProCV previously managed bilingual landing features through an admin screen. The implementation remains in the monorepo: LandingPageManagement.tsx, useLandingFeatures.ts, LandingFeaturesGrid.tsx, the public GET /api/public/landing-features endpoint, and PlatformSetting keys landing_features_en and landing_features_es. After centralising authentication, Core is the shared public entry point. Core currently has module cards in HomePage.tsx and a separate module-card implementation in components/Modules.tsx. ProCV's current root page no longer renders the legacy landing-feature grid.

## Proposed direction

### Separate three content types
1. **Platform content:** ProSolutions value proposition, cross-module navigation, and general trust information. Owned by Core.
2. **Module marketing content:** module name, tagline, summary, ordered benefits, locale, visibility, and CTA. Managed centrally and rendered by Core.
3. **Operational configuration:** feature flags, entitlements, and module settings. Owned by each module; never inferred from marketing copy.

### Core is the canonical public catalog
Core should render one module catalog rather than overlapping hardcoded cards. The home page can show a short summary and key benefits for ProCV and ProJobs; dedicated module detail pages can hold longer descriptions, use cases, and plans if justified. Keep the login form concise and fast; do not force a large marketing grid into the authentication card.

### Prefer a low-complexity content boundary
First evaluate extending Core's current content/i18n layer or a small public module-catalog endpoint backed by existing configuration. Do not add a new service or CMS unless editing and publishing requirements justify the operational complexity. Inspect existing bilingual PlatformSetting values before deciding whether to adapt them or migrate them; do not overwrite or discard the data.

### Central administration
Longer term, administrators should edit module marketing content in one central module-management area. Support Spanish and English, locale fallback, ordering, visibility/publish state, validated lengths, safe text rendering, controlled CTA destinations, and role-protected writes. Keep the old ProCV editor available until migrated content and the replacement are verified.

## Alternatives
- **Keep everything in ProCV:** not ideal long-term because Core owns the public platform entry point and other modules need the same capability.
- **Put every feature in the login card:** rejected because it increases friction and mixes marketing with authentication.
- **Add a dedicated CMS immediately:** deferred until requirements justify a new service and data model.
- **Keep hardcoded Core cards and a separate ProCV editor:** not the target because it creates multiple sources of truth.

## Rollout
1. Inventory current consumers and inspect stored bilingual feature values.
2. Define canonical module content and locale fallback.
3. Test public projection, validation, authorization, visibility, and locale behavior.
4. Build Core catalog using a compatibility adapter or a safe migration.
5. Compare against current ProCV copy and verify admin changes appear publicly.
6. Deploy Core with a safe fallback; retain legacy editor/API until verified.
7. Remove legacy UI/API only after consumers are gone and content is preserved.
8. Verify Core, ProCV, and ProJobs in production.

## Success criteria
- One source of truth for public module marketing content.
- Admin-editable bilingual module descriptions and features.
- No loss of existing ProCV content or production data.
- Marketing copy cannot grant access or change entitlements.
- Core home, login, and module links behave consistently on desktop and mobile.
- CI and route/data tests pass.
