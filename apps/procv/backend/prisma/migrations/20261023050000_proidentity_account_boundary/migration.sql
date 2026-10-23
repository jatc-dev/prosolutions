-- ProIdentity is the sole identity provider. This phase creates a non-secret
-- local subject reference and redirects CV ownership to it. Cross-database email
-- matching is performed by apps/identity/scripts/migrate-procv-identity-boundary.ts
-- before legacy User/session/token tables are removed in the finalize phase.
CREATE TABLE IF NOT EXISTS public."IdentityAccount" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdentityAccount_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF to_regclass('public."User"') IS NOT NULL THEN
    INSERT INTO public."IdentityAccount" ("id", "createdAt", "updatedAt")
    SELECT "id", "createdAt", "updatedAt"
    FROM public."User"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END
$$;

ALTER TABLE public."CV" DROP CONSTRAINT IF EXISTS "CV_userId_fkey";
ALTER TABLE public."CV"
  ADD CONSTRAINT "CV_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES public."IdentityAccount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "CV_userId_idx" ON public."CV" ("userId");

-- Reconcile the pre-monorepo AuditLog shape with the current Prisma model.
ALTER TABLE public."AuditLog"
  ADD COLUMN IF NOT EXISTS "adminId" TEXT,
  ADD COLUMN IF NOT EXISTS "adminEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "resource" TEXT;

DO $$
DECLARE
  has_user_id BOOLEAN;
  has_resource_type BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'AuditLog' AND column_name = 'userId'
  ) INTO has_user_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'AuditLog' AND column_name = 'resourceType'
  ) INTO has_resource_type;

  IF has_user_id AND has_resource_type THEN
    EXECUTE $sql$
      UPDATE public."AuditLog"
      SET "adminId" = COALESCE(NULLIF("adminId", ''), NULLIF("userId", ''), 'system'),
          "adminEmail" = COALESCE(NULLIF("adminEmail", ''), 'system@procv.local'),
          "resource" = COALESCE(NULLIF("resource", ''), NULLIF("resourceType", ''), 'legacy')
    $sql$;
  ELSIF has_user_id THEN
    EXECUTE $sql$
      UPDATE public."AuditLog"
      SET "adminId" = COALESCE(NULLIF("adminId", ''), NULLIF("userId", ''), 'system'),
          "adminEmail" = COALESCE(NULLIF("adminEmail", ''), 'system@procv.local'),
          "resource" = COALESCE(NULLIF("resource", ''), 'legacy')
    $sql$;
  ELSIF has_resource_type THEN
    EXECUTE $sql$
      UPDATE public."AuditLog"
      SET "adminId" = COALESCE(NULLIF("adminId", ''), 'system'),
          "adminEmail" = COALESCE(NULLIF("adminEmail", ''), 'system@procv.local'),
          "resource" = COALESCE(NULLIF("resource", ''), NULLIF("resourceType", ''), 'legacy')
    $sql$;
  ELSE
    UPDATE public."AuditLog"
    SET "adminId" = COALESCE(NULLIF("adminId", ''), 'system'),
        "adminEmail" = COALESCE(NULLIF("adminEmail", ''), 'system@procv.local'),
        "resource" = COALESCE(NULLIF("resource", ''), 'legacy');
  END IF;
END
$$;

ALTER TABLE public."AuditLog"
  ALTER COLUMN "adminId" SET NOT NULL,
  ALTER COLUMN "adminEmail" SET NOT NULL,
  ALTER COLUMN "resource" SET NOT NULL;

ALTER TABLE public."AuditLog" DROP COLUMN IF EXISTS "userId";
ALTER TABLE public."AuditLog" DROP COLUMN IF EXISTS "resourceType";
CREATE INDEX IF NOT EXISTS "AuditLog_adminId_idx" ON public."AuditLog" ("adminId");
