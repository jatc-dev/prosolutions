-- Dedicated provider-neutral ProJobs PostgreSQL schema. Apply with a database administrator.
-- Never apply to ProCV or ProIdentity. After migration, grant projobs_api to the environment's restricted login (Neon: GRANT projobs_api TO projobs_login).
-- Runtime login must not own these tables and must not be SUPERUSER/BYPASSRLS.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='projobs_api') THEN CREATE ROLE projobs_api NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS; END IF; END $;
-- Reassert least-privilege attributes even when the role already existed; CREATE ROLE IF NOT EXISTS alone would preserve unsafe attributes.
ALTER ROLE projobs_api NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO projobs_api;

CREATE TABLE IF NOT EXISTS public.projobs_saved_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id text NOT NULL,job_id text NOT NULL,job_url text NOT NULL CHECK(job_url ~* '^https?://'),job_title text NOT NULL DEFAULT '',company text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),CONSTRAINT projobs_saved_jobs_user_job_unique UNIQUE(user_id,job_id));
CREATE INDEX IF NOT EXISTS projobs_saved_jobs_user_created_idx ON public.projobs_saved_jobs(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.projobs_applications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id text NOT NULL,job_id text NOT NULL,job_url text NOT NULL CHECK(job_url ~* '^https?://'),job_title text NOT NULL DEFAULT '',company text NOT NULL DEFAULT '',cover_letter text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'redirected_to_employer' CHECK(status IN('redirected_to_employer','applied','interview','rejected','offer','withdrawn')),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CONSTRAINT projobs_applications_user_job_unique UNIQUE(user_id,job_id));
CREATE INDEX IF NOT EXISTS projobs_applications_user_created_idx ON public.projobs_applications(user_id,created_at DESC);
CREATE OR REPLACE FUNCTION public.projobs_touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS projobs_applications_touch_updated_at ON public.projobs_applications;
CREATE TRIGGER projobs_applications_touch_updated_at BEFORE UPDATE ON public.projobs_applications FOR EACH ROW EXECUTE FUNCTION public.projobs_touch_updated_at();
ALTER TABLE public.projobs_saved_jobs ENABLE ROW LEVEL SECURITY; ALTER TABLE public.projobs_saved_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.projobs_applications ENABLE ROW LEVEL SECURITY; ALTER TABLE public.projobs_applications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projobs_saved_jobs_owner ON public.projobs_saved_jobs;
CREATE POLICY projobs_saved_jobs_owner ON public.projobs_saved_jobs FOR ALL TO projobs_api USING(user_id=NULLIF(current_setting('projobs.user_id',true),'')) WITH CHECK(user_id=NULLIF(current_setting('projobs.user_id',true),''));
DROP POLICY IF EXISTS projobs_applications_owner ON public.projobs_applications;
CREATE POLICY projobs_applications_owner ON public.projobs_applications FOR ALL TO projobs_api USING(user_id=NULLIF(current_setting('projobs.user_id',true),'')) WITH CHECK(user_id=NULLIF(current_setting('projobs.user_id',true),''));
REVOKE ALL ON TABLE public.projobs_saved_jobs,public.projobs_applications FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.projobs_saved_jobs,public.projobs_applications TO projobs_api;
REVOKE ALL ON FUNCTION public.projobs_touch_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.projobs_touch_updated_at() TO projobs_api;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON public.projobs_saved_jobs,public.projobs_applications FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON public.projobs_saved_jobs,public.projobs_applications FROM authenticated'; END IF; END $$;
