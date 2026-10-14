# Deployment Security Checklist (Render + Supabase)

This checklist helps you align production variables and rotate secrets safely.

## 1. Rotate Exposed Secrets Immediately

If any connection string or secret was shared in chat, logs, screenshots, or public files:

1. Rotate Supabase database password.
2. Rotate backend JWT secret.
3. Re-deploy backend with new variables.
4. Force users to re-authenticate (invalidate old refresh sessions if needed).

## 2. Backend Service Variables (Render)

Set these in your backend Render service:

1. NODE_ENV=production
2. PORT=10000 (or Render-provided PORT)
3. FRONTEND_URL=https://procv-platform.onrender.com
4. DATABASE_URL=postgresql://... (Supabase pooler or direct URL)
5. JWT_SECRET=<strong random value, at least 32 chars>
6. JWT_EXPIRES_IN=15m
7. JWT_REFRESH_EXPIRES_IN=7d
8. HEALTH_DB_TIMEOUT_MS=2500 (optional, recommended)

Notes:

1. Do not use placeholder secrets like change-me, secret, password.
2. Use HTTPS URLs for production origins.

## 3. Frontend Service Variables (Render)

Set these in your frontend Render service:

1. VITE_API_BASE_URL=https://procvbkn.onrender.com/api

Compatibility note:

1. The app supports legacy VITE_API_URL fallback, but VITE_API_BASE_URL is the canonical variable.

## 4. Post-Deploy Verification

After deployment, verify:

1. GET https://procvbkn.onrender.com/health returns 200.
2. Login works and refresh token flow keeps session active.
3. CV save/load works after page refresh.
4. CORS allows only expected frontend origin.

## 5. Optional Hardening

1. Add regular secret rotation schedule (for example every 90 days).
2. Restrict who can view/edit Render environment variables.
3. Enable alerting for repeated 401/429 spikes.

## 6. Database Migrations on Supabase (required on every schema change)

`prisma migrate deploy` hangs when it runs through the Supabase PgBouncer pooler (transaction mode, port 6543). That is why migrations must run against the direct connection:

1. Take the Supabase direct/session connection string (port 5432, not the PgBouncer pooler on 6543). The region in the hostname is Supabase's project region, not Render's.
2. Set it in the Render backend environment as `DIRECT_DATABASE_URL` (secret). `DATABASE_URL` keeps pointing to the pooler for runtime traffic.

### Apply migrations on every deploy (no paid plan needed)

Render's pre-deploy command requires a paid instance. On any plan, use the service **Docker Command** (Settings → Build & Deploy → Docker Command) so migrations run at container startup, before the server:

```
npm run start:migrate
```

- The backend ships a `start:migrate` script (`prisma migrate deploy` with `DATABASE_URL` pointed at `DIRECT_DATABASE_URL`, then `node dist/index.js`). Keep the Docker Command to that single token: inline `sh -c '...'` wrappers with quotes fail on Render (exit 127).
- The Prisma CLI is available in the image (`npm ci` installs devDependencies) and the direct URL comes from `DIRECT_DATABASE_URL`.
- If a migration fails, the container exits and Render keeps the previous working version (fail-fast).
- Safe only with a single instance (no concurrent migrations). Free tier runs one instance.
- The script is Linux/container-only (POSIX variable assignment prefix); use `npm start` locally.
- The equivalent paid-only alternative is the Pre-deploy command: `DATABASE_URL=$DIRECT_DATABASE_URL npx prisma migrate deploy`.

### One-off migrations from a workstation

```
cd backend
$env:DATABASE_URL = "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
npx prisma migrate deploy
```

4. Verify after deploy:

   ```
   GET /health -> 200 and database.status = CONNECTED
   Login works (a failing login must return 401 "Invalid credentials", never 500 "Internal server error").
   ```

### Baselining an existing database (required once per database)

A database whose objects were created outside `migrate deploy` (manual SQL, the old
`apply-migration` endpoint, the boot-time schema guard, or `db push`) has no or partial
migration history. Running `migrate deploy` on it tries to re-execute migrations whose
effects already exist and fails (for example `column "emailVerified" already exists`),
which aborts the Render pre-deploy step. Fix the history first, from a machine with the
direct URL:

```powershell
cd backend
$env:DATABASE_URL = "postgresql://postgres.<ref>:<password>@...:5432/postgres"

npx prisma migrate status                          # shows applied / failed / pending
# For every migration whose effects already exist in the database:
npx prisma migrate resolve --applied  <migration_name>
# If a migration is recorded as failed:
npx prisma migrate resolve --rolled-back <migration_name>

npx prisma migrate deploy                          # now applies only genuinely new migrations
npx prisma migrate status                          # must end with "Database schema is up to date!"
```

Do this **before** the first deploy that runs migrations at startup (Docker Command or pre-deploy), otherwise that deploy fails.
`resolve --applied` never runs SQL; it only records that the migration state is already in place,
so verify the effects exist (columns/tables present) before marking them.

The backend also runs an idempotent schema-compatibility guard on boot (`src/utils/schemaGuard.ts`): if the database is missing one of the known additive changes (for example `Session.lastAccessedAt`), it applies the `IF NOT EXISTS` DDL and logs the repair. This is a safety net, not a replacement for migrations.

Incident note (2026-10-12): production was down because the `emailVerified` column and token tables were never applied. Any 500 on login/register indicates schema drift: run `npx prisma migrate status` with `DIRECT_DATABASE_URL` and apply pending migrations.

Incident note (2026-10-13): the local database had the same problem in reverse: `session_idle_timeout` recorded as failed and `add_email_verification` never recorded, both effects present. Resolved with `migrate resolve --applied` after verifying the objects existed.

Never expose migration or debug helpers over HTTP in production (no `/api/auth/apply-migration`, no `/api/auth/debug-login`). Apply DDL only through migrations with the direct connection.
