-- Additive session metadata. Existing sessions keep the current behavior on first application.
-- New sessions default to temporary unless the user opts into "remember me".
ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "rememberMe" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "deviceName" TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;

ALTER TABLE "Session" ALTER COLUMN "rememberMe" SET DEFAULT false;

CREATE INDEX IF NOT EXISTS "Session_userId_revokedAt_expiresAt_idx"
  ON "Session" ("userId", "revokedAt", "expiresAt");
