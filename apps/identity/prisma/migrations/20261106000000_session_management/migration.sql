-- Additive session metadata. Existing active sessions retain persistent-cookie behavior.
ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "rememberMe" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deviceName" TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
UPDATE "Session" SET "rememberMe" = true
WHERE "revokedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "Session_userId_revokedAt_expiresAt_idx"
  ON "Session" ("userId", "revokedAt", "expiresAt");
