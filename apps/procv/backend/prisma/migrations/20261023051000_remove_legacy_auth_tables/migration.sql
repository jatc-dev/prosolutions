-- ProIdentity is the only account/session store. CV.userId remains the
-- immutable ProIdentity subject but is no longer a foreign key to a local user.
-- Before this migration is applied to legacy data, CV owners must be reconciled
-- to ProIdentity user IDs by normalized email (see the identity reconciliation
-- script). This preserves every CV, version and ATS analysis.
ALTER TABLE "CV" DROP CONSTRAINT IF EXISTS "CV_userId_fkey";
CREATE INDEX IF NOT EXISTS "CV_userId_updatedAt_idx" ON "CV"("userId", "updatedAt");

DROP TABLE IF EXISTS "EmailVerificationToken";
DROP TABLE IF EXISTS "PasswordResetToken";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "User";

-- Temporary empty connection-check table left by a previous infrastructure test.
DROP TABLE IF EXISTS "_conn_test";
