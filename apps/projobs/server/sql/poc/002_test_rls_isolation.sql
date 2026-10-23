-- Integration assertions for 001_projobs_postgres_rls.sql.
-- Run as the database owner against a disposable database only.
\set ON_ERROR_STOP on

BEGIN;
SET LOCAL ROLE projobs_api;
SELECT set_config('projobs.user_id', 'synthetic-user-a', true);
INSERT INTO public.projobs_saved_jobs (user_id, job_id, job_url, job_title, company)
VALUES ('synthetic-user-a', 'synthetic-job-a', 'https://jobs.example/a', 'Job A', 'Example A');
INSERT INTO public.projobs_applications (user_id, job_id, job_url, job_title, company)
VALUES ('synthetic-user-a', 'synthetic-job-a', 'https://jobs.example/a', 'Job A', 'Example A');
COMMIT;

-- A different authenticated subject must not see or mutate A's rows.
BEGIN;
SET LOCAL ROLE projobs_api;
SELECT set_config('projobs.user_id', 'synthetic-user-b', true);
DO $assert$
DECLARE
  visible_rows integer;
  affected_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM public.projobs_saved_jobs;
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'RLS failure: user B can read user A saved jobs';
  END IF;

  UPDATE public.projobs_saved_jobs SET job_title = 'tampered'
  WHERE job_id = 'synthetic-job-a';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'RLS failure: user B updated user A saved jobs';
  END IF;

  DELETE FROM public.projobs_applications WHERE job_id = 'synthetic-job-a';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'RLS failure: user B deleted user A application';
  END IF;

  BEGIN
    INSERT INTO public.projobs_saved_jobs (user_id, job_id, job_url)
    VALUES ('synthetic-user-a', 'forged-owner', 'https://jobs.example/forged');
    RAISE EXCEPTION 'RLS failure: user B inserted a row for user A';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$assert$;
COMMIT;

-- The row is still visible to A and not changed by B.
BEGIN;
SET LOCAL ROLE projobs_api;
SELECT set_config('projobs.user_id', 'synthetic-user-a', true);
DO $assert$
DECLARE
  saved_rows integer;
  application_rows integer;
  saved_title text;
BEGIN
  SELECT count(*), max(job_title)
    INTO saved_rows, saved_title
    FROM public.projobs_saved_jobs
    WHERE job_id = 'synthetic-job-a';
  SELECT count(*) INTO application_rows
    FROM public.projobs_applications
    WHERE job_id = 'synthetic-job-a';
  IF saved_rows <> 1 OR saved_title <> 'Job A' OR application_rows <> 1 THEN
    RAISE EXCEPTION 'RLS failure: user A data missing or modified';
  END IF;
END
$assert$;
COMMIT;

-- Missing transaction-local identity must fail closed.
BEGIN;
SET LOCAL ROLE projobs_api;
DO $assert$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM public.projobs_saved_jobs;
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'RLS failure: query without subject returned rows';
  END IF;
END
$assert$;
ROLLBACK;

\echo 'PASS: ProJobs PostgreSQL RLS isolates synthetic users A and B'
