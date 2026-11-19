-- ProAdmin moderation: suspended companies, paused jobs and public reports.

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_verification_status_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_verification_status_check
  CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended'));

ALTER TABLE public.jobs
  ADD COLUMN moderation_status text NOT NULL DEFAULT 'ok' CHECK (moderation_status IN ('ok', 'paused')),
  ADD COLUMN moderation_note text CHECK (length(moderation_note) <= 500),
  ADD COLUMN moderated_at timestamptz;

CREATE TABLE public.job_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reason       text NOT NULL CHECK (reason IN ('fraude', 'discriminacion', 'informacion-falsa', 'spam', 'otro')),
  details      text CHECK (length(details) <= 1000),
  reporter_id  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);
CREATE INDEX job_reports_open_idx ON public.job_reports (job_id) WHERE resolved_at IS NULL;

-- Reports contain no candidate-private data; access is limited by grants:
-- the API may file and resolve reports, never delete them.
GRANT SELECT, INSERT ON public.job_reports TO projobs_api;
GRANT UPDATE (resolved_at) ON public.job_reports TO projobs_api;
GRANT UPDATE (moderation_status, moderation_note, moderated_at) ON public.jobs TO projobs_api;
