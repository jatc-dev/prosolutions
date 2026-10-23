-- ProIdentity is the only account authority. CV.userId becomes an external
-- subject reference and no longer points at a local ProCV credential record.
--
-- Ownership reconciliation for the current development deployment:
-- legacy subjects were matched to ProIdentity by normalized email. The two
-- legacy IDs that changed are remapped below. The other three current subjects
-- already match. This migration deliberately fails closed if it encounters an
-- unmapped CV owner rather than deleting its only account reference.
BEGIN;

-- Remove the legacy FK before remapping to subjects that exist only in Identity.
ALTER TABLE "CV" DROP CONSTRAINT IF EXISTS "CV_userId_fkey";

-- Normalize the audit schema across historical installations. The live database
-- already has userId/resourceType; older Prisma-created databases had adminId,
-- adminEmail and resource.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'AuditLog' AND column_name = 'adminId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'AuditLog' AND column_name = 'userId'
  ) THEN
    ALTER TABLE "AuditLog" RENAME COLUMN "adminId" TO "userId";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'AuditLog' AND column_name = 'adminId'
  ) THEN
    ALTER TABLE "AuditLog" DROP COLUMN "adminId";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'AuditLog' AND column_name = 'adminEmail'
  ) THEN
    ALTER TABLE "AuditLog" DROP COLUMN "adminEmail";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'AuditLog' AND column_name = 'resource'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'AuditLog' AND column_name = 'resourceType'
  ) THEN
    ALTER TABLE "AuditLog" RENAME COLUMN "resource" TO "resourceType";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'AuditLog' AND column_name = 'resource'
  ) THEN
    ALTER TABLE "AuditLog" DROP COLUMN "resource";
  END IF;
END $$;

ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

UPDATE "CV"
SET "userId" = 'cmmtp0zpl0000kmda9jyefkz1'
WHERE "userId" = 'cmmquvu4j000413tp8wqik3v3';

UPDATE "CV"
SET "userId" = 'cmmtswspq0000g58j4z87a3g8'
WHERE "userId" = 'cmmquyhna000b13tprzdc57n9';

UPDATE "PlatformSetting"
SET "updatedBy" = 'cmmtp0zpl0000kmda9jyefkz1'
WHERE "updatedBy" = 'cmmquvu4j000413tp8wqik3v3';

UPDATE "PlatformSetting"
SET "updatedBy" = 'cmmtswspq0000g58j4z87a3g8'
WHERE "updatedBy" = 'cmmquyhna000b13tprzdc57n9';

UPDATE "AuditLog"
SET "userId" = 'cmmtp0zpl0000kmda9jyefkz1'
WHERE "userId" = 'cmmquvu4j000413tp8wqik3v3';

UPDATE "AuditLog"
SET "userId" = 'cmmtswspq0000g58j4z87a3g8'
WHERE "userId" = 'cmmquyhna000b13tprzdc57n9';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "CV"
    WHERE "userId" IN (
      'cmmquvu4j000413tp8wqik3v3',
      'cmmquyhna000b13tprzdc57n9'
    )
  ) THEN
    RAISE EXCEPTION 'ProCV ownership backfill incomplete; refusing to remove legacy account tables';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "CV" c
    JOIN "User" legacy ON legacy."id" = c."userId"
    WHERE c."userId" NOT IN (
      'cmmtp0zpl0000kmda9jyefkz1',
      'cmmuw4q4m0000oxwsfbck66iw',
      'cmmuy9fbg000doxws7ua656bt',
      'cmmtswspq0000g58j4z87a3g8'
    )
  ) THEN
    RAISE EXCEPTION 'Unmapped legacy CV owner detected; reconcile ProCV owners with ProIdentity before retrying';
  END IF;
END $$;

DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "EmailVerificationToken";
DROP TABLE IF EXISTS "PasswordResetToken";
DROP TABLE IF EXISTS "User";
DROP TABLE IF EXISTS "_conn_test";

CREATE INDEX IF NOT EXISTS "CV_userId_updatedAt_idx" ON "CV"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

COMMIT;
