-- Align CVVersion with the current Prisma schema.
-- The model intentionally has no relation to CV and permits a nullable cvId.
-- Drop the legacy foreign key (if present) and NOT NULL requirement without
-- deleting or rewriting existing rows. Safe to apply more than once.

ALTER TABLE "CVVersion"
  DROP CONSTRAINT IF EXISTS "CVVersion_cvId_fkey";

ALTER TABLE "CVVersion"
  ALTER COLUMN "cvId" DROP NOT NULL;
