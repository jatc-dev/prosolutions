# ProJobs PostgreSQL integration

## Scope and deployment boundary

The ProJobs API uses the PostgreSQL driver directly. ProIdentity remains the authentication authority; the API validates its JWT issuer, audience, expiry and `PROJOBS` module claim before any personal-data route runs. The public job catalog stays static.

The Neon project `Prosolutions.page` contains a dedicated `projobs` database with `sql/001_projobs_core.sql` applied and a transactional RLS isolation smoke test passed. The Render API service is `https://projobs-api-0clw.onrender.com`. This branch adds migration `sql/002_projobs_high_value_features.sql` for saved searches, application status history, and progress events. It must be applied to the `projobs` database before deploying this API version. The new UI/API flows require authenticated production smoke tests after migration and deployment.

## Provisioning and runtime role

1. Use only the Neon database `projobs` for this migration. Never apply it to ProCV or ProIdentity.
2. Apply `apps/projobs/server/sql/001_projobs_core.sql` with a database administrator when provisioning a fresh environment.
3. For an existing ProJobs database, apply `apps/projobs/server/sql/002_projobs_high_value_features.sql` with a direct (non-pooled) administrator connection before deploying the new API. This migration only alters ProJobs tables and creates ProJobs-only tables.
4. Use the dedicated Neon login role `projobs_login` for the API. It must not be a superuser, table owner, or have `BYPASSRLS`.
5. The Neon production database already has `GRANT projobs_api TO projobs_login`. For another environment, grant membership to that environment's dedicated login role, e.g. `GRANT projobs_api TO projobs_login;`.
6. Set `DATABASE_URL` on the ProJobs API service to a TLS connection string for the `projobs_login` role. Never use `neondb_owner` or the legacy `projobs_runtime` role for application traffic.
7. Configure `IDENTITY_JWT_SECRET`, `IDENTITY_ISSUER=https://identity.prosolutions.page` and `IDENTITY_AUDIENCE=prosolutions-api` to match ProIdentity. Do not expose these secrets to the static frontend.
8. Before production enablement, run the RLS isolation SQL tests from PR #55 and authenticated API smoke tests against the provider database.


## High-value job seeker features

- `POST/GET/DELETE /api/job-alerts`: store and manage user-owned saved searches with daily/weekly frequency preferences. RLS isolates rows by the verified ProIdentity subject.
- `PATCH /api/applications/:jobId/status`: record a user-entered application status and append status history/events. Statuses are self-reported; ProJobs cannot verify an employer's actions.
- `GET /api/career/progress`: return per-user counts for saved jobs, tracked applications, interviews, offers, and recent status changes.
- ProJobs calculates an explainable text-overlap score from skills entered by the user in their browser. Skills remain in local browser storage and are not sent to the API.
- Job cards show the source attribution, publication freshness when available, whether salary was disclosed, and a contextual ProCV link that pre-fills the public job description for ATS analysis.
- Saved searches are matched against the current public catalogue when the user opens the alerts section. Automated email delivery is **not enabled** by this change; it requires a separately configured, least-privilege delivery worker and a transactional email provider. Do not describe saved alerts as delivered email notifications until that infrastructure is configured and tested.

## How isolation works

Each store operation starts a transaction, switches to the restricted `projobs_api` role, and sets `projobs.user_id` transaction-locally from the verified JWT subject. RLS policies compare that value to the row's `user_id`. The application query intentionally does not accept a user ID from request input for list/delete scope. Transaction-local settings are cleared at transaction end to prevent pooled connections from carrying a previous user's identity.

The runtime login must be granted membership in `projobs_api` and must not own the tables. If role setup is incorrect, operations fail closed rather than bypassing RLS. The API maps database failures to a generic 503 and does not return SQL errors or connection details.

## Validation

The API test suite covers health, missing/invalid JWTs, missing module entitlement, and the safe 503 path when `DATABASE_URL` is absent. The separate PostgreSQL RLS proof of concept validates row isolation against an ephemeral database. A transactional smoke test against the actual Neon `projobs` database verified that one test user can see its row, another user cannot, and the temporary test row is removed. Live API health and JWT authorization have been verified; full authenticated persistence CRUD tests and the updated static frontend/account page still need validation before rollout.
