-- RLS integration assertions against ../001_projobs_core.sql.
-- Run only against an ephemeral database. This script intentionally executes
-- as the restricted runtime login and switches into the NOLOGIN API role.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE projobs_api;
SELECT set_config('projobs.user_id', 'synthetic-user-a', true);
INSERT INTO public.projobs_saved_jobs(user_id,job_id,job_url,job_title,company)
VALUES('synthetic-user-a','synthetic-job-a','https://jobs.example/a','Job A','Example A');
INSERT INTO public.projobs_applications(user_id,job_id,job_url,job_title,company)
VALUES('synthetic-user-a','synthetic-job-a','https://jobs.example/a','Job A','Example A');
COMMIT;

BEGIN;
SET LOCAL ROLE projobs_api;
SELECT set_config('projobs.user_id','synthetic-user-b',true);
DO $assert$
DECLARE visible_rows integer; affected_rows integer;
BEGIN
 SELECT count(*) INTO visible_rows FROM public.projobs_saved_jobs;
 IF visible_rows<>0 THEN RAISE EXCEPTION 'RLS failure: B can read A saved jobs'; END IF;
 UPDATE public.projobs_saved_jobs SET job_title='tampered' WHERE job_id='synthetic-job-a';
 GET DIAGNOSTICS affected_rows=ROW_COUNT;
 IF affected_rows<>0 THEN RAISE EXCEPTION 'RLS failure: B updated A saved job'; END IF;
 DELETE FROM public.projobs_applications WHERE job_id='synthetic-job-a';
 GET DIAGNOSTICS affected_rows=ROW_COUNT;
 IF affected_rows<>0 THEN RAISE EXCEPTION 'RLS failure: B deleted A application'; END IF;
 BEGIN
  INSERT INTO public.projobs_saved_jobs(user_id,job_id,job_url)
  VALUES('synthetic-user-a','forged-owner','https://jobs.example/forged');
  RAISE EXCEPTION 'RLS failure: B inserted row for A';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END
$assert$;
COMMIT;

BEGIN;
SET LOCAL ROLE projobs_api;
SELECT set_config('projobs.user_id','synthetic-user-a',true);
DO $assert$
DECLARE saved_rows integer; app_rows integer; saved_title text;
BEGIN
 SELECT count(*),max(job_title) INTO saved_rows,saved_title FROM public.projobs_saved_jobs WHERE job_id='synthetic-job-a';
 SELECT count(*) INTO app_rows FROM public.projobs_applications WHERE job_id='synthetic-job-a';
 IF saved_rows<>1 OR saved_title<>'Job A' OR app_rows<>1 THEN RAISE EXCEPTION 'RLS failure: A data missing or changed'; END IF;
END
$assert$;
COMMIT;

BEGIN;
SET LOCAL ROLE projobs_api;
DO $assert$
DECLARE visible_rows integer;
BEGIN
 SELECT count(*) INTO visible_rows FROM public.projobs_saved_jobs;
 IF visible_rows<>0 THEN RAISE EXCEPTION 'RLS failure: query without subject returned rows'; END IF;
END
$assert$;
ROLLBACK;
\echo 'PASS: ProJobs core migration enforces row-level ownership'
