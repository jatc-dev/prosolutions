-- Signed, transaction-local ProCV identity context. User-settable GUCs are
-- never trusted by policy on their own: the app role cannot read the HMAC key.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pgcrypto' AND n.nspname = 'public'
  ) THEN
    RAISE EXCEPTION 'pgcrypto must be installed in schema public for ProCV RLS verification';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'procv_context_owner') THEN
    CREATE ROLE procv_context_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;
ALTER ROLE procv_context_owner NOLOGIN NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS;

-- The migration principal must be a member to transfer schema/table/function ownership.
DO $
BEGIN
  EXECUTE format('GRANT procv_context_owner TO %I', current_user);
END $;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'procv_admin_app') THEN
    CREATE ROLE procv_admin_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;
ALTER ROLE procv_admin_app NOLOGIN NOCREATEDB NOCREATEROLE
  NOINHERIT NOREPLICATION NOBYPASSRLS;

CREATE SCHEMA IF NOT EXISTS procv_private AUTHORIZATION procv_context_owner;
ALTER SCHEMA procv_private OWNER TO procv_context_owner;
REVOKE ALL ON SCHEMA procv_private FROM PUBLIC;

CREATE TABLE IF NOT EXISTS procv_private.context_signing_keys (
  key_id text PRIMARY KEY,
  secret_hex text NOT NULL CHECK (secret_hex ~ '^[0-9a-f]{64}$')
);
ALTER TABLE procv_private.context_signing_keys OWNER TO procv_context_owner;
REVOKE ALL ON TABLE procv_private.context_signing_keys FROM PUBLIC;

-- CVVersion previously had no database-enforced parent relation. Refuse to
-- silently discard orphans; operators must reconcile any such rows first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public."CVVersion" v
    LEFT JOIN public."CV" cv ON cv."id" = v."cvId"
    WHERE v."cvId" IS NULL OR cv."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Orphan CVVersion rows exist; reconcile before enabling RLS';
  END IF;
END $$;
ALTER TABLE public."CVVersion" ALTER COLUMN "cvId" SET NOT NULL;
ALTER TABLE public."CVVersion" DROP CONSTRAINT IF EXISTS "CVVersion_cvId_fkey";
ALTER TABLE public."CVVersion" ADD CONSTRAINT "CVVersion_cvId_fkey"
  FOREIGN KEY ("cvId") REFERENCES public."CV"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION procv_private.verified_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, procv_private
AS $function$
DECLARE
  payload text := current_setting('procv.context_payload', true);
  supplied_signature text := current_setting('procv.context_signature', true);
  claims jsonb;
  key_hex text;
  issued_at bigint;
  expires_at bigint;
BEGIN
  IF payload IS NULL OR payload = '' OR length(payload) > 4096
    OR supplied_signature IS NULL OR supplied_signature !~ '^[0-9a-f]{64}$' THEN
    RETURN NULL;
  END IF;

  claims := payload::jsonb;
  IF claims->>'iss' <> 'procv-backend'
    OR claims->>'aud' <> 'procv-rls'
    OR claims->>'role' NOT IN ('user', 'public')
    OR claims->>'kid' IS NULL
    OR claims->>'jti' IS NULL
    OR claims->>'sub' IS NULL AND claims->>'role' <> 'public'
    OR claims->>'sub' IS NOT NULL AND claims->>'role' = 'public'
    OR claims->>'exp' !~ '^[0-9]{1,12}$'
    OR claims->>'iat' !~ '^[0-9]{1,12}$' THEN
    RETURN NULL;
  END IF;

  issued_at := (claims->>'iat')::bigint;
  expires_at := (claims->>'exp')::bigint;
  IF expires_at <= floor(extract(epoch FROM statement_timestamp()))::bigint
    OR issued_at > floor(extract(epoch FROM statement_timestamp()))::bigint + 15
    OR expires_at <= issued_at OR expires_at - issued_at > 120 THEN
    RETURN NULL;
  END IF;

  SELECT secret_hex INTO key_hex
  FROM procv_private.context_signing_keys
  WHERE key_id = claims->>'kid';
  IF key_hex IS NULL THEN
    RETURN NULL;
  END IF;

  -- Hash both sides before comparison to avoid exposing a useful prefix timing
  -- oracle through bytea equality. The underlying MAC is HMAC-SHA-256.
  IF public.digest(public.hmac(convert_to(payload, 'UTF8'), decode(key_hex, 'hex'), 'sha256'), 'sha256')
    <> public.digest(decode(supplied_signature, 'hex'), 'sha256') THEN
    RETURN NULL;
  END IF;

  RETURN claims;
EXCEPTION WHEN OTHERS THEN
  -- Missing, malformed, expired, or unverifiable context always denies access.
  RETURN NULL;
END;
$function$;
ALTER FUNCTION procv_private.verified_context() OWNER TO procv_context_owner;
REVOKE ALL ON FUNCTION procv_private.verified_context() FROM PUBLIC;

DO $$
DECLARE
  role_name text;
  role_info record;
  target record;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['procv_login', 'procv_runtime', 'procv_app', 'procv_admin_login', 'procv_admin_app'] LOOP
    SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolreplication, rolcanlogin
      INTO role_info FROM pg_roles WHERE rolname = role_name;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Required ProCV role % does not exist', role_name;
    END IF;
    IF role_info.rolsuper OR role_info.rolbypassrls OR role_info.rolcreaterole
      OR role_info.rolcreatedb OR role_info.rolreplication THEN
      RAISE EXCEPTION 'ProCV role % has elevated PostgreSQL privileges', role_name;
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('procv_app', 'procv_admin_app') AND rolcanlogin) THEN
    RAISE EXCEPTION 'Application policy roles must not be login roles';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['procv_login', 'procv_runtime'] LOOP
    IF NOT pg_has_role(role_name, 'procv_app', 'MEMBER') THEN
      EXECUTE format('GRANT procv_app TO %I', role_name);
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_auth_members m
      WHERE m.roleid = 'procv_app'::regrole AND m.member = role_name::regrole
        AND m.admin_option
    ) THEN
      RAISE EXCEPTION 'Role % must not administer procv_app membership', role_name;
    END IF;
  END LOOP;

  IF NOT (SELECT rolcanlogin FROM pg_roles WHERE rolname = 'procv_admin_login') THEN
    RAISE EXCEPTION 'procv_admin_login must be a separate login role';
  END IF;
  ALTER ROLE procv_admin_login NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  IF NOT pg_has_role('procv_admin_login', 'procv_admin_app', 'MEMBER') THEN
    GRANT procv_admin_app TO procv_admin_login;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_auth_members m
    WHERE m.roleid = 'procv_admin_app'::regrole AND m.member = 'procv_admin_login'::regrole
      AND m.admin_option
  ) THEN
    RAISE EXCEPTION 'procv_admin_login must not administer procv_admin_app membership';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_auth_members m
    WHERE m.member = 'procv_admin_login'::regrole
      AND m.roleid <> 'procv_admin_app'::regrole
  ) THEN
    RAISE EXCEPTION 'procv_admin_login must have no memberships outside procv_admin_app';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_auth_members m
    WHERE m.roleid = 'procv_admin_app'::regrole
      AND m.member <> 'procv_admin_login'::regrole
  ) THEN
    RAISE EXCEPTION 'procv_admin_app must be granted exclusively to procv_admin_login';
  END IF;
  IF pg_has_role('procv_login', 'procv_admin_app', 'MEMBER')
    OR pg_has_role('procv_runtime', 'procv_admin_app', 'MEMBER')
    OR pg_has_role('procv_admin_login', 'procv_app', 'MEMBER') THEN
    RAISE EXCEPTION 'Runtime and administrative database roles must remain isolated';
  END IF;
  IF pg_has_role('procv_login', 'procv_context_owner', 'MEMBER')
    OR pg_has_role('procv_runtime', 'procv_context_owner', 'MEMBER')
    OR pg_has_role('procv_app', 'procv_context_owner', 'MEMBER')
    OR pg_has_role('procv_admin_login', 'procv_context_owner', 'MEMBER')
    OR pg_has_role('procv_admin_app', 'procv_context_owner', 'MEMBER') THEN
    RAISE EXCEPTION 'Application roles must not assume procv_context_owner';
  END IF;

  FOR target IN
    SELECT c.oid::regclass AS table_name, c.relowner
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ANY(ARRAY['CV','CVVersion','CVAtsAnalysis','AuditLog','PlatformSetting'])
  LOOP
    IF target.relowner IN ('procv_login'::regrole, 'procv_runtime'::regrole, 'procv_app'::regrole, 'procv_admin_login'::regrole, 'procv_admin_app'::regrole) THEN
      RAISE EXCEPTION 'Runtime role owns protected table %', target.table_name;
    END IF;
  END LOOP;
END $$;

GRANT USAGE ON SCHEMA procv_private TO procv_app, procv_admin_app;
GRANT EXECUTE ON FUNCTION procv_private.verified_context() TO procv_app, procv_admin_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."CV", public."CVVersion", public."CVAtsAnalysis", public."AuditLog", public."PlatformSetting"
TO procv_app, procv_admin_app;

DO $$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['CV','CVVersion','CVAtsAnalysis','AuditLog','PlatformSetting'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', target);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target || '_user_isolation', target);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target || '_app_access', target);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target || '_admin_access', target);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target || '_public_read', target);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target || '_user_read_insert', target);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target || '_user_insert', target);
  END LOOP;

  -- Remove every other pre-existing policy as well: permissive policies OR
  -- together and could otherwise silently weaken these restrictions.
  FOR target IN
    SELECT format('%I.%I', schemaname, tablename) || E'|' || policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(ARRAY['CV','CVVersion','CVAtsAnalysis','AuditLog','PlatformSetting'])
  LOOP
    EXECUTE format('DROP POLICY %I ON %s', split_part(target, '|', 2), split_part(target, '|', 1)::regclass);
  END LOOP;
END $$;

CREATE POLICY "CV_signed_owner_admin" ON public."CV" FOR ALL TO procv_app, procv_admin_app
USING (
  current_user = 'procv_admin_app'
  OR "userId" = procv_private.verified_context()->>'sub'
)
WITH CHECK (
  current_user = 'procv_admin_app'
  OR "userId" = procv_private.verified_context()->>'sub'
);

CREATE POLICY "CVVersion_signed_parent" ON public."CVVersion" FOR ALL TO procv_app, procv_admin_app
USING (
  current_user = 'procv_admin_app'
  OR EXISTS (SELECT 1 FROM public."CV" cv WHERE cv."id" = "CVVersion"."cvId"
    AND cv."userId" = procv_private.verified_context()->>'sub')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public."CV" cv WHERE cv."id" = "CVVersion"."cvId"
    AND (current_user = 'procv_admin_app'
      OR cv."userId" = procv_private.verified_context()->>'sub'))
);

CREATE POLICY "CVAtsAnalysis_signed_parent" ON public."CVAtsAnalysis" FOR ALL TO procv_app, procv_admin_app
USING (
  current_user = 'procv_admin_app'
  OR EXISTS (SELECT 1 FROM public."CV" cv WHERE cv."id" = "CVAtsAnalysis"."cvId"
    AND cv."userId" = procv_private.verified_context()->>'sub')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public."CV" cv WHERE cv."id" = "CVAtsAnalysis"."cvId"
    AND (current_user = 'procv_admin_app'
      OR cv."userId" = procv_private.verified_context()->>'sub'))
);

CREATE POLICY "AuditLog_signed_read" ON public."AuditLog" FOR SELECT TO procv_app, procv_admin_app
USING (
  current_user = 'procv_admin_app'
  OR "userId" = procv_private.verified_context()->>'sub'
);
CREATE POLICY "AuditLog_signed_insert_actor" ON public."AuditLog" FOR INSERT TO procv_app, procv_admin_app
WITH CHECK (
  "userId" = procv_private.verified_context()->>'sub'
  AND current_user IN ('procv_app', 'procv_admin_app')
);
CREATE POLICY "AuditLog_signed_admin_mutate" ON public."AuditLog" FOR UPDATE TO procv_admin_app
USING (current_user = 'procv_admin_app')
WITH CHECK (current_user = 'procv_admin_app');
CREATE POLICY "AuditLog_signed_admin_delete" ON public."AuditLog" FOR DELETE TO procv_admin_app
USING (current_user = 'procv_admin_app');

CREATE POLICY "PlatformSetting_signed_read" ON public."PlatformSetting" FOR SELECT TO procv_app, procv_admin_app
USING (
  "isPublic" = true
  OR current_user = 'procv_admin_app'
);
CREATE POLICY "PlatformSetting_signed_admin_mutate" ON public."PlatformSetting" FOR ALL TO procv_admin_app
USING (current_user = 'procv_admin_app')
WITH CHECK (current_user = 'procv_admin_app');

COMMIT;
