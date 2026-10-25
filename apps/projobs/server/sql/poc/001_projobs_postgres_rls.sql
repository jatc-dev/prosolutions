-- Provider-neutral PostgreSQL PoC for ProJobs data isolation.
-- Apply only to a disposable, dedicated PostgreSQL database (for example CI).
-- This file is intentionally separate from ../001_projobs_core.sql, which is
-- the existing Supabase/PostgREST implementation migration.
--
-- The API must start a transaction for every operation, set the verified
-- ProIdentity subject with set_config(..., true), and run all data statements
-- in that same transaction. Never take this value from request JSON.

DO $role$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'projobs_api') THEN
    EXECUTE 'CREATE ROLE projobs_api NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS';
  END IF;
END
$role$;

GRANT USAGE ON SCHEMA public TO projobs_api;

CREATE TABLE IF NOT EXISTS public.projobs_saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  job_id text NOT NULL,
  job_url text NOT NULL CHECK (job_url ~* '^https?://'),
  job_title text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projobs_saved_jobs_user_job_unique UNIQUE (user_id, job_id)
);

CREATE TABLE IF NOT EXISTS public.projobs_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  job_id text NOT NULL,
  job_url text NOT NULL CHECK (job_url ~* '^https?://'),
  job_title text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  cover_letter text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'redirected_to_employer'
    CHECK (status IN ('redirected_to_employer', 'applied', 'interview', 'rejected', 'offer', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projobs_applications_user_job_unique UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS projobs_saved_jobs_user_created_idx
  ON public.projobs_saved_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS projobs_applications_user_created_idx
  ON public.projobs_applications (user_id, created_at DESC);

ALTER TABLE public.projobs_saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projobs_saved_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.projobs_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projobs_applications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projobs_saved_jobs_owner ON public.projobs_saved_jobs;
CREATE POLICY projobs_saved_jobs_owner ON public.projobs_saved_jobs
  FOR ALL TO projobs_api
  USING (user_id = nullif(current_setting('projobs.user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('projobs.user_id', true), ''));

DROP POLICY IF EXISTS projobs_applications_owner ON public.projobs_applications;
CREATE POLICY projobs_applications_owner ON public.projobs_applications
  FOR ALL TO projobs_api
  USING (user_id = nullif(current_setting('projobs.user_id', true), ''))
  WITH CHECK (user_id = nullif(current_setting('projobs.user_id', true), ''));

REVOKE ALL ON public.projobs_saved_jobs, public.projobs_applications FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projobs_saved_jobs TO projobs_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projobs_applications TO projobs_api;
