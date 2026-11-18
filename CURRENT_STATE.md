# ProSolutions — CURRENT_STATE

Snapshot of repository, git, and local environment as of this audit. All observations are verified from the real working tree; no assumptions.

## 1. Git state

- Branch: `qa` (only `main` and `qa` exist locally; `origin/qa` tracked)
- HEAD: `9bc4b92ca655c9aa81011f5deb88163509e76d9f` (`fix(procv): drop legacy renderer wrapper`)
- Historical reference `94fe595964a1603d382768eb2f8773c7c3393023` is an ancestor; HEAD has moved forward.
- Branch is up to date with `origin/qa`.
- Working tree: **30 modified files, 8 untracked files** at the end of the audit. The application changes were pre-existing; the context documents were already present when this audit resumed.
- Stashes: `stash@{0}` (`fix/qa-session-block-1: backup-core-eslint`), `stash@{1}` (`main: backup: cambios locales ProCV antes de sincronizar main`).
- Worktrees:
  - `C:/Projects/prosolutions` @ `9bc4b92 [qa]`
  - `C:/Users/Legion/.local/share/kilo/worktree-pool/prosolutions-764de0f9168c/adhesive-onion` @ `c9f1528` (detached)
  - `C:/Users/Legion/AppData/Local/Temp/kilo/procv-release-worktree` @ `bc56ed4` (detached)

## 2. Modified files (pre-existing, uncommitted)

Core: `src/components/Hero.tsx`, `src/components/Modules.tsx`, `src/i18n.tsx`, `src/index.css`, `src/pages/HomePage.tsx`, `tailwind.config.js`, `vite.config.ts`.
ProCV backend: `.env.example`, `src/middleware/auth.ts`.
ProCV frontend: `src/modules/landing/pages/TemplatesGallery.tsx`, `src/modules/procv/components/editor/AISuggestionsPanel.tsx`, `CompleteCVEditor.tsx`, `components/editor/components/AIPanel.tsx`, `src/modules/procv/styles/cv-editor.css`, `src/pages/CVEditorPage.tsx`, `src/pages/HomePage.tsx`, `src/shared/components/ui/MobileMenu.tsx`, `src/styles.css`, `src/styles/cv-editor.css`, `tailwind.config.js`, `vite.config.ts`, `package.json`.
ProJobs: `generator.py`, `index.html`.
packages/ui: `src/ProSolutionsLogo.tsx`, `src/components/Button.tsx`, `Card.tsx`, `Input.tsx`, `src/tokens.ts`, `src/useTheme.ts`.
Untracked: `packages/ui/src/theme.css`, `scripts/start-local.ps1`.

Nature of changes: design-system rebrand (indigo → emerald tokens/surfaces), component tweaks, config updates. Do NOT discard or commit without authorization.

## 3. Local services (verified via `Get-NetTCPConnection` and process list)

| Port | Service | PID | Running |
|---|---|---|---|
| 4000 | ProCV backend | 20728 | Yes |
| 5173 | ProCV frontend | 23688 | Yes |
| 5174 | Core | 20220 | Yes |
| 5175 | ProJobs static server (PID 19892) | 19892 | Yes — `/` returned HTTP 200; `/api/*` reports the API server is absent |
| 5432 | PostgreSQL | 7308 | Yes |
| 6432 | pgbouncer | 5388 | Yes |
| 9222 | Chrome/Puppeteer debug | 24472 | Yes |

Not running locally: ProIdentity (:4001), ProJobs server (:5176).

## 4. Endpoint and database verification

- Local PostgreSQL is listening on `127.0.0.1:5432` and `0.0.0.0:5432`; pgbouncer on `6432`.
- `http://localhost:4000/health` returned HTTP 200 and reported ProCV database status `CONNECTED`.
- `http://localhost:4000/api/public/landing-features?lang=es` returned HTTP 200 with an empty list.
- `http://localhost:5173/`, `http://localhost:5174/`, and `http://localhost:5175/` returned HTTP 200.
- `http://localhost:4001/health` and `http://localhost:5176/health` were unreachable because those listeners are absent.
- This agent did not read secret-bearing `.env` values, did not authenticate directly to QA/Neon, and cannot identify the backend's configured database target from the health response alone.

## 5. Technologies per application

- Core: React 18, TS, Vite 5, Tailwind 3, React Router 6, Vitest, ESLint 9.
- ProIdentity: Node, Express 4, Prisma 5, PostgreSQL, JWT, bcrypt, helmet, cors, rate-limiter, nodemailer, Jest, ts-node-dev, tsx.
- ProCV frontend: React 18, TS, Vite 5, Tailwind, i18next, Zustand, axios, chart.js, @dnd-kit, html2pdf.js, Vitest.
- ProCV backend: Node, Express 4, Prisma 5, PostgreSQL, JWT, bcrypt, Puppeteer, multer, pdf-parse, mammoth, Jest, ts-node-dev.
- ProJobs: static HTML/JS + Node/Express API, pg, tsx, Node `--test`.
- packages/ui: React, TS, Tailwind tokens, clsx, lucide-react, tailwind-merge.
- packages/auth: React, TS, Zustand, axios.

## 6. Test structure

- `apps/core/src/**` — Vitest (`vitest run`)
- `apps/identity/src/` + `apps/identity/tests/` — Jest (`jest`), `tsx --test tests/services/*.test.ts` for regression
- `apps/procv/backend/src/` + `apps/procv/backend/tests/` — Jest, including `tests/rls.integration.test.ts`
- `apps/procv/frontend/src/**` — Vitest; `src/modules/projobs/lib/searchParams.test.mjs` via `test:projobs-search`
- `apps/projobs/server/src/server.test.ts` — Node `--test`

No repo-level test command; run per workspace.

## 7. Env file existence (contents NOT read)

- `apps/identity/.env` — exists
- `apps/identity/.env.example` — exists
- `apps/procv/frontend/.env.local` — exists
- `apps/procv/frontend/.env.example` — exists
- `apps/procv/backend/.env` — exists
- `apps/procv/backend/.env.example` — exists (modified locally)
- `apps/projobs/server/.env.example` — exists
- `apps/core/.env` — does NOT exist
- `apps/core/.env.example` — does NOT exist

## 8. Risks and restrictions

- `render.yaml` is unreconciled with live Render services (do NOT Blueprint Sync).
- Uncommitted local changes across 32 files; do not discard.
- ProIdentity and ProJobs API not running locally.
- QA/Neon authentication remains unverified.
- `test-neon.js` contains a hard-coded provider credential; it was not executed. The credential should be revoked/rotated outside this documentation task.
- Stashes on `fix/qa-session-block-1` and `main` must not be dropped/popped without authorization.
- Do not work on `main`; no commits/merges/pushes without authorization; no migrations against QA/production; no RLS/auth changes as frontend side effect.

## 9. Documents created this session

- `AGENTS.md`
- `MASTER_CONTEXT.md`
- `CURRENT_STATE.md`
- `SESSION_HANDOFF.md`
- `docs/architecture/SERVICES.md`
- `docs/development/LOCAL_ENVIRONMENT.md`

## 10. ProCV editor redesign

- Added accessible, persistent disclosures for template selection, ATS, customization, blocks, and the form.
- Removed duplicated editor-level platform navigation, language, and theme controls; the shared `ProHeader` remains the single source.
- Preview and PDF continue to use the shared renderer; the fixed `scale-75` preview transform was removed.
- The `employment` template is labeled `Minerva 1003` and renders one primary format label.
- The AI panel is inactive and not shown in the editor; AI services and APIs were not removed.
- Validation: `npm --prefix apps\procv\frontend run build` passed; `npm --prefix apps\procv\frontend test` passed (36 tests).

## 11. ProCV hotfix status

- The redundant `TemplateSuggestions` presentation and its editor loading path were removed; the real professional-summary field remains in `PersonalSection`.
- Backend CV persistence was traced through `saveCV` → Axios `/api/cvs` → Joi validation → ownership-scoped Prisma service. Guest save/reload was verified through `localStorage`; authenticated cloud save/reload remains blocked because local ProIdentity (:4001) is unavailable and the remote refresh returned `401`.
- Added non-sensitive authentication diagnostics (reason plus claim-presence flags) and a regression test proving an introspection-rejected forged token receives `401` without local signature verification.
- Backend build passed; frontend build passed; frontend tests passed (36/36); targeted authentication tests passed (16/16).
- No commits, pushes, migrations, deployments, or service restarts were performed.

## 12. Authenticated save verification

- Initial `POST /identity-api/api/auth/refresh` returned `401` with `Refresh token missing` because the QA refresh cookie was not usable on the local HTTP origin.
- The local Core and ProCV Vite proxies now rewrite only local `Set-Cookie` responses to remove `Secure` and change `SameSite=None` to `Lax`; production and Identity configuration were not changed.
- A second failure source was concurrent refresh rotation: `AuthProvider` and `GlobalPreferencesBootstrap` could refresh independently, including a stale `sessionStorage` token. ProCV now deduplicates refreshes and preferences use the in-memory auth store token/refresh method.
- Verified authenticated sequence: refresh `200`, `GET /api/auth/me` `200`, preferences `200`, `POST /api/cvs` `201`, then authenticated CV list `200` and detail `200`.
- Persistence was verified after reload through the authenticated CV list/detail API; controlled name and summary markers were present. No tokens, cookies, or personal CV content were recorded.
- Existing-CV update validation was attempted with the authenticated list result and a non-personal CV id, but the subsequent ProCV bootstrap was blocked by the remote Identity rate limit (`429 Too Many Requests`). The editor redirected to Core login before the real UI could issue `PUT /api/cvs/:id`; therefore update-through-UI and post-reload form hydration remain unverified.

## 13. ProIdentity refresh rate-limit investigation

- ProIdentity applies `refreshLimiter` to `POST /api/auth/refresh`: production limit 10 failed requests per IP in a 60-minute window; successful requests are skipped. The handler returns `429` with `retryAfterSeconds`, and standard rate-limit headers are enabled.
- The server uses Express's default IP key with `app.set('trust proxy', 1)`. No remote ProIdentity/Render log stream was available locally, so the exact historical counter and originating IP could not be independently retrieved without generating traffic.
- ProCV had separate refresh coordinators in `authStore`, `services/api.ts`, and the legacy global-preferences helper. A `401` could therefore trigger multiple independent refreshes, while Core also has its own origin-local refresh logic.
- Added a shared ProCV refresh coordinator with single-flight behavior and a cooldown for `429`. It honors `Retry-After`, `RateLimit-Reset`, and the server JSON wait value, avoids immediate retry storms, and allows recovery after the cooldown.
- The legacy preferences path now uses the authenticated in-memory store instead of `sessionStorage` or an independent refresh request. A rate-limited API refresh no longer immediately redirects through the Axios interceptor.
- Coordinator tests cover concurrent callers, `429` cooldown and recovery, definitive `401`, and network failure without retry loops. The frontend suite now passes 39 tests.
- Final functional save validation was attempted after a new QA login in Core. ProCV's first authenticated bootstrap returned `401` and displayed the unauthenticated banner, so the existing CV editor did not reach an authenticated state. Per procedure, the test stopped before any `PUT`, and no QA CV data was changed.

## 14. Core to ProCV session interoperability audit

- Core stores its short-lived access token in origin-scoped `sessionStorage` under `pro_identity_token`; the token length was inspected locally without reading its value.
- ProCV intentionally does not read Core's `sessionStorage`. Its `authStore` obtains an access token in memory through `POST /identity-api/api/auth/refresh`, then validates it with `GET /identity-api/api/auth/me`.
- The refresh cookie is HttpOnly, so it is absent from `document.cookie`. Both local Vite proxies remove the production cookie domain, remove `Secure`, and adapt `SameSite=None` to `Lax`; the configured local auth bases are `/api/auth` for Core and `/identity-api/api/auth` for ProCV.
- The observed editor bootstrap resource sequence included `POST /identity-api/api/auth/refresh`, protected `GET /api/cvs/:id` requests, then `/identity-api/api/auth/me` and preferences. The editor route is not wrapped in `PrivateRoute`; `CompleteCVEditor` calls `loadCV(cvId)` before auth loading completes. This can produce an initial protected-API `401` while the access token is still being established.
- Implemented the minimal bootstrap correction: `CompleteCVEditor` now reads `loading` from `authStore` and delegates cloud loading to `useAuthenticatedCVLoader`, which waits for `loading === false && isAuthenticated === true`, loads each CV id once, and leaves guest routes without an id unchanged.
- `authStore` configures `api.setToken(accessToken)` before setting `isAuthenticated: true`; `AuthProvider` marks `loading: false` only in the refresh `finally` block. This guarantees the gated loader cannot start before the bearer token is configured.
- Added four focused loader tests covering pending authentication, one-time authenticated loading, unauthenticated resolution, and CV-id changes. Frontend tests pass **43/43** and the production build passes.
- QA update/save validation remains intentionally pending. No new authentication request, POST, PUT, DELETE, migration, or QA data change was performed for this correction.
- No token, cookie value, POST, PUT, refresh request, RLS change, session change, or QA data change was made during this audit.

## 15. Production release

- Production source branch: `main` on GitHub, deployed by Render AutoDeploy. The release was promoted from `qa` without force-push or history rewrite.
- Release commit on `qa`: `cfaf7bf` (`release: promote ProCV auth and editor fixes`).
- Published production SHA: `91b55333601f20c4c3f379e22a95b33b06e9a6be` (`release: promote ProCV auth and editor fixes`), created by applying the release commit to the current production base `c9f1528`.
- Render services confirmed `live` at the published SHA: `ProIdentity`, `ProSolutions`, `ProCVBackEnd`, and `ProCVFrontEnd`. Public checks returned HTTP 200 for `prosolutions.page`, `procv.prosolutions.page`, `identity.prosolutions.page/health`, and `procvbkn.onrender.com/health`.
- GitHub CI completed successfully for the published SHA, including Core, ProCV frontend, ProCV backend, ProJobs build, and Identity build/regression jobs: run `43669174324`.
- No database migration, RLS change, secret, domain, infrastructure setting, or production data change was performed.
- Deliberately excluded from this release: local-only Vite proxy changes, local startup script, development package script, audit/context documents until this release record, and unrelated ProJobs source/generated changes. ProJobs remains at its prior deployed SHA; ProJobs API was not deployed because it has AutoDeploy disabled.

## 16. P0 session-loading hotfix prepared

- Production incident: Core's `LandingPage` initializes `authLoading` to `true` and performs `/me` followed by `/refresh` with bare `fetch` calls. The published bundle contains no timeout (`AbortController` absent), so a stalled Identity/network request never settles and leaves `ProHeader` rendering `Checking session...` indefinitely.
- Production configuration inspection confirmed Core's Render service uses branch `main`, root `apps/core/`, and does not define `VITE_IDENTITY_API_URL`; the compiled fallback is the correct `https://identity.prosolutions.page/api/auth`, so no infrastructure or secret change is required.
- Prepared minimal fix in `apps/core/src/pages/LandingPage.tsx`: both session requests use a 10-second `AbortController` timeout, and `authLoading` is cleared unconditionally in `finally`. Timeout, 401, 429, and network failures therefore fall through the existing unauthenticated path and expose the login link without refresh loops.
- Validation: Core TypeScript/Vite build passed; targeted ESLint passed; `git diff --check` passed. No production request, authentication write, database change, or deployment was performed.
- Hotfix is prepared locally for review and has not been published.

## 17. ProCV session-loading hotfix prepared

- ProCV had the same unbounded-request defect: `AuthProvider` waited on the shared refresh coordinator and then `/api/auth/me`, but neither request had a timeout. The single-flight coordinator prevented duplicate refreshes but could not resolve a network promise that never settled.
- Prepared the minimum fix in `apps/procv/frontend/src/services/authRefresh.ts` and `apps/procv/frontend/src/stores/authStore.tsx`: one shared 10-second `AbortController` wrapper now covers `/identity-api/api/auth/refresh` and `/identity-api/api/auth/me`.
- `AuthProvider` already finalizes `loading` in `finally`; timeout, 401, 429, and network failures therefore reach that path and leave the user unauthenticated without clearing an existing valid session as a side effect of the timeout wrapper. Refresh single-flight and cooldown behavior remain unchanged.
- Validation: ProCV frontend TypeScript/Vite build and targeted ESLint passed; `git diff --check` passed. No QA or production requests and no writes were performed.
- Both Core and ProCV P0 fixes are local only and await review. No deployment was activated.

## 18. P0 release completed

- Integrated Core hotfix `0ff8674710fc4a9989f86e0f9ab3d9a15865a0ed` and ProCV hotfix `068bafd563bfb3bf7f541ba71d68951d3ab7b147` onto `origin/main` without conflicts, force-push, rollback, or history rewrite.
- Published production SHA: `835e255bcc3638e03303131c106b0fe15decd91d`.
- Render status: ProSolutions/Core, ProCV Frontend, and ProIdentity are `live` at `835e255`; ProCV Backend remains `live` at `91b5533` because the P0 changes do not affect its code.
- No ProJobs service was modified or redeployed. No functional tests, production writes, database changes, secret changes, cookie/CORS changes, or infrastructure changes were performed.