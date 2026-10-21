-- Add jti column to Session table
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "jti" TEXT;

-- Existing sessions predate JTI-backed refresh tokens. Populate them before
-- enforcing the non-null and unique constraints from the Prisma schema.
UPDATE "Session"
SET "jti" = md5("id" || clock_timestamp()::text || random()::text)
WHERE "jti" IS NULL;

ALTER TABLE "Session" ALTER COLUMN "jti" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Session_jti_key" ON "Session"("jti");
CREATE INDEX IF NOT EXISTS "Session_jti_idx" ON "Session"("jti");
