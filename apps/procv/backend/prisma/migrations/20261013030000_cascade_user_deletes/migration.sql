-- Cascade deletes for user-owned data.
-- Deleting a User now removes their sessions, CVs and (transitively) ATS
-- analyses at the database level, so application code no longer depends on
-- manual cleanup order to satisfy referential integrity.
-- Statements are idempotent so re-running against an already-migrated
-- database is a no-op.
--
-- Note: CVVersion.cvId is intentionally left unconstrained. It is not modeled
-- in schema.prisma (nullable column) and existing databases may contain
-- orphaned rows; the application deletes versions before deleting their CV.

-- Session.userId: RESTRICT -> CASCADE
DO $$ BEGIN
  ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_userId_fkey";
  ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CV.userId: RESTRICT -> CASCADE
DO $$ BEGIN
  ALTER TABLE "CV" DROP CONSTRAINT IF EXISTS "CV_userId_fkey";
  ALTER TABLE "CV" ADD CONSTRAINT "CV_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CVAtsAnalysis.cvId: RESTRICT -> CASCADE (schema already declared Cascade)
DO $$ BEGIN
  ALTER TABLE "CVAtsAnalysis" DROP CONSTRAINT IF EXISTS "CVAtsAnalysis_cvId_fkey";
  ALTER TABLE "CVAtsAnalysis" ADD CONSTRAINT "CVAtsAnalysis_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "CV"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
