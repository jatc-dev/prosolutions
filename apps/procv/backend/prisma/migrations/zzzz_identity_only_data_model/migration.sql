-- ProIdentity is the only account authority. CV.userId becomes an external
-- subject reference and no longer points at a local ProCV credential record.
--
-- One-time ownership backfill for the current development deployment:
-- these legacy ProCV IDs were reconciled by normalized email with ProIdentity.
-- The two accounts whose central subject changed are remapped below. The other
-- three existing subjects already match and are intentionally left unchanged.
BEGIN;

-- Remove the legacy FK before remapping to subjects that exist only in Identity.
ALTER TABLE "CV" DROP CONSTRAINT IF EXISTS "CV_userId_fkey";

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
END $$;

DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "EmailVerificationToken";
DROP TABLE IF EXISTS "PasswordResetToken";
DROP TABLE IF EXISTS "User";
DROP TABLE IF EXISTS "_conn_test";

CREATE INDEX IF NOT EXISTS "CV_userId_updatedAt_idx" ON "CV"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");

COMMIT;
