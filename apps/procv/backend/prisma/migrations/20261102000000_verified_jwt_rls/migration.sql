-- ProCV row ownership and administrator access are derived only from a
-- short-lived ProIdentity-signed database assertion. The key is provisioned
-- separately through a secret-safe operator channel; this migration never
-- inserts or exposes signing material.

CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA public;
CREATE SCHEMA IF NOT EXISTS procv_private;
REVOKE ALL ON SCHEMA procv_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS procv_private.identity_jwt_key (
  key_id text PRIMARY KEY,
  secret text NOT NULL
);
REVOKE ALL ON TABLE procv_private.identity_jwt_key FROM PUBLIC;

CREATE OR REPLACE FUNCTION procv_private.current_claims()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, procv_private
AS $function$
DECLARE
  v_token text;
  v_secret text;
  v_header json;
  v_payload json;
  v_valid boolean;
BEGIN
  v_token := current_setting('procv.identity_token', true);
  IF v_token IS NULL OR v_token = '' THEN
    RETURN NULL;
  END IF;

  SELECT k.secret INTO v_secret
  FROM procv_private.identity_jwt_key AS k
  WHERE k.key_id = 'active';
  IF v_secret IS NULL OR length(v_secret) < 32 THEN
    RETURN NULL;
  END IF;

  SELECT v.header, v.payload, v.valid
    INTO v_header, v_payload, v_valid
  FROM public.verify(v_token, v_secret, 'HS256') AS v;

  IF NOT COALESCE(v_valid, false)
     OR v_header->>'alg' <> 'HS256'
     OR v_payload->>'iss' <> 'https://identity.prosolutions.page'
     OR v_payload->>'aud' <> 'procv-database'
     OR NULLIF(v_payload->>'sub', '') IS NULL
     OR NULLIF(v_payload->>'jti', '') IS NULL
     OR NULLIF(v_payload->>'role', '') IS NULL
     OR NULLIF(v_payload->>'exp', '') IS NULL
     OR (v_payload->>'exp')::bigint <= extract(epoch FROM statement_timestamp())::bigint
     OR NOT COALESCE((v_payload->'modules') ? 'PROCV', false)
  THEN
    RETURN NULL;
  END IF;

  IF NULLIF(v_payload->>'nbf', '') IS NOT NULL
     AND (v_payload->>'nbf')::bigint > extract(epoch FROM statement_timestamp())::bigint
  THEN
    RETURN NULL;
  END IF;

  RETURN v_payload::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION procv_private.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, procv_private
AS $function$
  SELECT NULLIF(procv_private.current_claims()->>'sub', '')
$function$;

CREATE OR REPLACE FUNCTION procv_private.current_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, procv_private
AS $function$
  SELECT COALESCE(procv_private.current_claims()->>'role' = 'admin', false)
$function$;

REVOKE ALL ON FUNCTION procv_private.current_claims() FROM PUBLIC;
REVOKE ALL ON FUNCTION procv_private.current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION procv_private.current_is_admin() FROM PUBLIC;

DO $$
DECLARE
  app_role text;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['procv_app', 'procv_app_stage', 'procv_admin_app_stage'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA procv_private TO %I', app_role);
      EXECUTE format('GRANT EXECUTE ON FUNCTION procv_private.current_claims() TO %I', app_role);
      EXECUTE format('GRANT EXECUTE ON FUNCTION procv_private.current_user_id() TO %I', app_role);
      EXECUTE format('GRANT EXECUTE ON FUNCTION procv_private.current_is_admin() TO %I', app_role);
      EXECUTE format('REVOKE ALL ON TABLE procv_private.identity_jwt_key FROM %I', app_role);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public."CV" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CV" FORCE ROW LEVEL SECURITY;
CREATE POLICY cv_verified_owner_or_admin ON public."CV"
  FOR ALL
  USING ("userId" = procv_private.current_user_id() OR procv_private.current_is_admin())
  WITH CHECK ("userId" = procv_private.current_user_id() OR procv_private.current_is_admin());

ALTER TABLE public."CVVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CVVersion" FORCE ROW LEVEL SECURITY;
CREATE POLICY cv_version_verified_owner_or_admin ON public."CVVersion"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public."CV" AS cv
      WHERE cv.id = "CVVersion"."cvId"
        AND (cv."userId" = procv_private.current_user_id() OR procv_private.current_is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."CV" AS cv
      WHERE cv.id = "CVVersion"."cvId"
        AND (cv."userId" = procv_private.current_user_id() OR procv_private.current_is_admin())
    )
  );

ALTER TABLE public."CVAtsAnalysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CVAtsAnalysis" FORCE ROW LEVEL SECURITY;
CREATE POLICY cv_ats_verified_owner_or_admin ON public."CVAtsAnalysis"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public."CV" AS cv
      WHERE cv.id = "CVAtsAnalysis"."cvId"
        AND (cv."userId" = procv_private.current_user_id() OR procv_private.current_is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."CV" AS cv
      WHERE cv.id = "CVAtsAnalysis"."cvId"
        AND (cv."userId" = procv_private.current_user_id() OR procv_private.current_is_admin())
    )
  );

ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_log_verified_read ON public."AuditLog"
  FOR SELECT
  USING ("userId" = procv_private.current_user_id() OR procv_private.current_is_admin());
CREATE POLICY audit_log_verified_insert ON public."AuditLog"
  FOR INSERT
  WITH CHECK ("userId" = procv_private.current_user_id() OR procv_private.current_is_admin());
CREATE POLICY audit_log_admin_update ON public."AuditLog"
  FOR UPDATE
  USING (procv_private.current_is_admin())
  WITH CHECK (procv_private.current_is_admin());
CREATE POLICY audit_log_admin_delete ON public."AuditLog"
  FOR DELETE
  USING (procv_private.current_is_admin());

ALTER TABLE public."PlatformSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PlatformSetting" FORCE ROW LEVEL SECURITY;
CREATE POLICY platform_settings_public_read ON public."PlatformSetting"
  FOR SELECT
  USING ("isPublic" = true);
CREATE POLICY platform_settings_admin_all ON public."PlatformSetting"
  FOR ALL
  USING (procv_private.current_is_admin())
  WITH CHECK (procv_private.current_is_admin());

DO $$
DECLARE
  app_role text;
BEGIN
  FOREACH app_role IN ARRAY ARRAY['procv_app', 'procv_app_stage', 'procv_admin_app_stage'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public."CV", public."CVVersion", public."CVAtsAnalysis", public."AuditLog", public."PlatformSetting" TO %I',
        app_role
      );
    END IF;
  END LOOP;
END $$;
