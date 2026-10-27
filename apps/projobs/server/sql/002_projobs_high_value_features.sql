-- ProJobs high-value features: alerts, application status history, and progress metrics.
-- Apply only to the dedicated ProJobs Neon database, after 001_projobs_core.sql.
ALTER TABLE public.projobs_applications
  ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.projobs_applications
  ADD COLUMN IF NOT EXISTS last_status_changed_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.projobs_saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) <= 320),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filters) = 'object'),
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly')),
  enabled boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projobs_saved_searches_user_name_unique UNIQUE(user_id, name)
);
CREATE INDEX IF NOT EXISTS projobs_saved_searches_user_created_idx
  ON public.projobs_saved_searches(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS projobs_saved_searches_due_idx
  ON public.projobs_saved_searches(enabled, frequency, last_notified_at)
  WHERE enabled = true;

CREATE TABLE IF NOT EXISTS public.projobs_application_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  job_id text NOT NULL,
  previous_status text,
  new_status text NOT NULL CHECK (new_status IN ('redirected_to_employer','applied','interview','rejected','offer','withdrawn')),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projobs_application_events_user_job_idx
  ON public.projobs_application_events(user_id, job_id, created_at DESC);

ALTER TABLE public.projobs_saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projobs_saved_searches FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projobs_saved_searches_owner ON public.projobs_saved_searches;
CREATE POLICY projobs_saved_searches_owner ON public.projobs_saved_searches
  FOR ALL TO projobs_api
  USING (user_id = NULLIF(current_setting('projobs.user_id', true), ''))
  WITH CHECK (user_id = NULLIF(current_setting('projobs.user_id', true), ''));

ALTER TABLE public.projobs_application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projobs_application_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projobs_application_events_owner ON public.projobs_application_events;
CREATE POLICY projobs_application_events_owner ON public.projobs_application_events
  FOR ALL TO projobs_api
  USING (user_id = NULLIF(current_setting('projobs.user_id', true), ''))
  WITH CHECK (user_id = NULLIF(current_setting('projobs.user_id', true), ''));

REVOKE ALL ON TABLE public.projobs_saved_searches, public.projobs_application_events FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projobs_saved_searches, public.projobs_application_events TO projobs_api;
