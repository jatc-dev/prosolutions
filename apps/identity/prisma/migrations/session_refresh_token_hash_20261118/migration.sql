-- Store only the SHA-256 of refresh tokens and purge unusable sessions.
--
-- 1. Existing refresh cookies keep working: their hash is backfilled, and the
--    service now looks sessions up by hash instead of by plaintext token.
-- 2. Sessions created before the 2026-11-18 IDENTITY_JWT_SECRET rotation, and
--    expired or long-revoked sessions, can never be used again; delete them.

ALTER TABLE "Session" ADD COLUMN "refreshTokenHash" TEXT;

UPDATE "Session"
SET "refreshTokenHash" = encode(sha256(convert_to("refreshToken", 'UTF8')), 'hex');

DELETE FROM "Session"
WHERE "createdAt" < TIMESTAMP '2026-11-18 21:01:00'
   OR "expiresAt" < now()
   OR ("revokedAt" IS NOT NULL AND "revokedAt" < now() - INTERVAL '1 hour');

ALTER TABLE "Session" ALTER COLUMN "refreshTokenHash" SET NOT NULL;
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

DROP INDEX IF EXISTS "Session_refreshToken_key";
ALTER TABLE "Session" DROP COLUMN "refreshToken";
