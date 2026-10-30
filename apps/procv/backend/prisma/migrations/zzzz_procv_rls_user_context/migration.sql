-- Enforce user-scoped access in the database, not only in Express filters.
-- Every backend data operation must run through dbContext.ts, which sets
-- procv.user_id / procv.is_admin transaction-locally and assumes procv_app.
BEGIN;

ALTER TABLE "CV" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CV" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CVVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CVVersion" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CVAtsAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CVAtsAnalysis" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PlatformSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformSetting" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CV_app_access" ON "CV";
DROP POLICY IF EXISTS "CV_user_isolation" ON "CV";
CREATE POLICY "CV_user_isolation" ON "CV"
  FOR ALL TO procv_app
  USING (
    current_setting('procv.is_admin', true) = 'true'
    OR "userId" = NULLIF(current_setting('procv.user_id', true), '')
  )
  WITH CHECK (
    current_setting('procv.is_admin', true) = 'true'
    OR "userId" = NULLIF(current_setting('procv.user_id', true), '')
  );

DROP POLICY IF EXISTS "CVVersion_app_access" ON "CVVersion";
DROP POLICY IF EXISTS "CVVersion_user_isolation" ON "CVVersion";
CREATE POLICY "CVVersion_user_isolation" ON "CVVersion"
  FOR ALL TO procv_app
  USING (
    current_setting('procv.is_admin', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM "CV" cv
      WHERE cv."id" = "CVVersion"."cvId"
        AND cv."userId" = NULLIF(current_setting('procv.user_id', true), '')
    )
  )
  WITH CHECK (
    current_setting('procv.is_admin', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM "CV" cv
      WHERE cv."id" = "CVVersion"."cvId"
        AND cv."userId" = NULLIF(current_setting('procv.user_id', true), '')
    )
  );

DROP POLICY IF EXISTS "CVAtsAnalysis_app_access" ON "CVAtsAnalysis";
DROP POLICY IF EXISTS "CVAtsAnalysis_user_isolation" ON "CVAtsAnalysis";
CREATE POLICY "CVAtsAnalysis_user_isolation" ON "CVAtsAnalysis"
  FOR ALL TO procv_app
  USING (
    current_setting('procv.is_admin', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM "CV" cv
      WHERE cv."id" = "CVAtsAnalysis"."cvId"
        AND cv."userId" = NULLIF(current_setting('procv.user_id', true), '')
    )
  )
  WITH CHECK (
    current_setting('procv.is_admin', true) = 'true'
    OR EXISTS (
      SELECT 1 FROM "CV" cv
      WHERE cv."id" = "CVAtsAnalysis"."cvId"
        AND cv."userId" = NULLIF(current_setting('procv.user_id', true), '')
    )
  );

DROP POLICY IF EXISTS "AuditLog_app_access" ON "AuditLog";
DROP POLICY IF EXISTS "AuditLog_admin_access" ON "AuditLog";
DROP POLICY IF EXISTS "AuditLog_user_read_insert" ON "AuditLog";
CREATE POLICY "AuditLog_admin_access" ON "AuditLog"
  FOR ALL TO procv_app
  USING (current_setting('procv.is_admin', true) = 'true')
  WITH CHECK (current_setting('procv.is_admin', true) = 'true');
CREATE POLICY "AuditLog_user_read_insert" ON "AuditLog"
  FOR SELECT TO procv_app
  USING ("userId" = NULLIF(current_setting('procv.user_id', true), ''));
CREATE POLICY "AuditLog_user_insert" ON "AuditLog"
  FOR INSERT TO procv_app
  WITH CHECK ("userId" = NULLIF(current_setting('procv.user_id', true), ''));

DROP POLICY IF EXISTS "PlatformSetting_app_access" ON "PlatformSetting";
DROP POLICY IF EXISTS "PlatformSetting_public_read" ON "PlatformSetting";
DROP POLICY IF EXISTS "PlatformSetting_admin_access" ON "PlatformSetting";
CREATE POLICY "PlatformSetting_public_read" ON "PlatformSetting"
  FOR SELECT TO procv_app
  USING ("isPublic" = true);
CREATE POLICY "PlatformSetting_admin_access" ON "PlatformSetting"
  FOR ALL TO procv_app
  USING (current_setting('procv.is_admin', true) = 'true')
  WITH CHECK (current_setting('procv.is_admin', true) = 'true');

COMMIT;
