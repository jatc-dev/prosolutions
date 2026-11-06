-- Restore the invariant declared by schema.prisma:
-- CVVersion.cvId is required and must reference an existing CV.
--
-- This migration follows 20261015190000_align_cv_version_schema, which
-- temporarily removed the constraint to accommodate legacy installations.
-- Do not discard rows implicitly: an orphan must be reconciled before the
-- constraint can be restored.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public."CVVersion" version
    LEFT JOIN public."CV" cv ON cv."id" = version."cvId"
    WHERE version."cvId" IS NULL OR cv."id" IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce CVVersion.cvId integrity: orphaned CVVersion rows exist; reconcile them before retrying';
  END IF;
END $$;

ALTER TABLE public."CVVersion"
  ALTER COLUMN "cvId" SET NOT NULL;

ALTER TABLE public."CVVersion"
  DROP CONSTRAINT IF EXISTS "CVVersion_cvId_fkey";

ALTER TABLE public."CVVersion"
  ADD CONSTRAINT "CVVersion_cvId_fkey"
  FOREIGN KEY ("cvId")
  REFERENCES public."CV"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

COMMIT;
