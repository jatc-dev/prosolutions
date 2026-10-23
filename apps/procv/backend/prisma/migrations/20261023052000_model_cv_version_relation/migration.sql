-- Align Prisma's CVVersion relation with the actual ownership constraint.
-- Refuse to continue if version rows are detached from their parent CV instead
-- of silently discarding history. The existing database was audited and has
-- no null or orphaned version references.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public."CVVersion" WHERE "cvId" IS NULL) THEN
    RAISE EXCEPTION 'CVVersion contains null cvId values; reconcile them before applying this migration.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public."CVVersion" v
    LEFT JOIN public."CV" c ON c."id" = v."cvId"
    WHERE c."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'CVVersion contains orphaned cvId values; reconcile them before applying this migration.';
  END IF;
END
$$;

ALTER TABLE public."CVVersion"
  ALTER COLUMN "cvId" SET NOT NULL;
ALTER TABLE public."CVVersion"
  DROP CONSTRAINT IF EXISTS "CVVersion_cvId_fkey";
ALTER TABLE public."CVVersion"
  ADD CONSTRAINT "CVVersion_cvId_fkey"
  FOREIGN KEY ("cvId") REFERENCES public."CV"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "CVVersion_cvId_idx"
  ON public."CVVersion" ("cvId");
