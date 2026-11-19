-- ProJobs core v2 integration
--  * company self-service onboarding with verification status
--  * recruiter / candidate emails for transactional notifications
--  * explicit consent to share the CV with the hiring company (Ley 1581 / GDPR)
--  * job alerts (saved searches delivered by email)
--  * outbox delivery bookkeeping for the in-process notification worker

-- ---------------------------------------------------------------------------
-- Company verification
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  ADD COLUMN verification_method text CHECK (verification_method IN ('email_domain', 'manual')),
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN verification_note text CHECK (length(verification_note) <= 500);

-- Companies that already exist were created by administrators or granted
-- recruiters (PRORECRUIT), i.e. manually vetted.
UPDATE public.companies
SET verification_status = 'verified', verification_method = 'manual', verified_at = now();

ALTER TABLE public.company_members
  ADD COLUMN email text CHECK (length(email) <= 254);

-- ---------------------------------------------------------------------------
-- Applications: consent + notification address
-- ---------------------------------------------------------------------------
ALTER TABLE public.applications
  ADD COLUMN consent_at timestamptz,
  ADD COLUMN candidate_email text CHECK (length(candidate_email) <= 254);

-- ---------------------------------------------------------------------------
-- Outbox delivery bookkeeping
-- ---------------------------------------------------------------------------
ALTER TABLE public.outbox_events
  ADD COLUMN processed_at timestamptz,
  ADD COLUMN attempts integer NOT NULL DEFAULT 0;
CREATE INDEX outbox_events_pending_idx ON public.outbox_events (id) WHERE processed_at IS NULL;

-- ---------------------------------------------------------------------------
-- Job alerts
-- ---------------------------------------------------------------------------
CREATE TABLE public.job_alerts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            text NOT NULL,
  email              text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  label              text CHECK (length(label) <= 120),
  query              jsonb NOT NULL DEFAULT '{}'::jsonb,
  frequency          text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  active             boolean NOT NULL DEFAULT true,
  unsubscribe_token  text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  last_sent_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_alerts_user_idx ON public.job_alerts (user_id);
CREATE INDEX job_alerts_due_idx ON public.job_alerts (frequency, last_sent_at) WHERE active;

ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_alerts FORCE ROW LEVEL SECURITY;
CREATE POLICY job_alerts_owner ON public.job_alerts FOR ALL TO projobs_api
  USING (user_id = public.projobs_current_user())
  WITH CHECK (user_id = public.projobs_current_user());

-- Background worker access to alerts across users goes through narrow
-- SECURITY DEFINER functions instead of disabling row level security.
CREATE OR REPLACE FUNCTION public.projobs_due_job_alerts(at_time timestamptz, max_rows integer)
RETURNS TABLE (id uuid, email text, label text, query jsonb, frequency text, last_sent_at timestamptz, unsubscribe_token text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT a.id, a.email, a.label, a.query, a.frequency, a.last_sent_at, a.unsubscribe_token, a.created_at
  FROM public.job_alerts a
  WHERE a.active
    AND coalesce(a.last_sent_at, a.created_at)
        <= at_time - CASE WHEN a.frequency = 'weekly' THEN interval '7 days' ELSE interval '1 day' END
  ORDER BY coalesce(a.last_sent_at, a.created_at)
  LIMIT greatest(1, least(max_rows, 500))
$$;
REVOKE ALL ON FUNCTION public.projobs_due_job_alerts(timestamptz, integer) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.projobs_mark_job_alert_sent(alert_id uuid, at_time timestamptz)
RETURNS void
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
  UPDATE public.job_alerts SET last_sent_at = at_time WHERE id = alert_id
$$;
REVOKE ALL ON FUNCTION public.projobs_mark_job_alert_sent(uuid, timestamptz) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.projobs_unsubscribe_job_alert(token text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  affected integer;
BEGIN
  IF token IS NULL OR token !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;
  UPDATE public.job_alerts SET active = false WHERE unsubscribe_token = token AND active;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END
$$;
REVOKE ALL ON FUNCTION public.projobs_unsubscribe_job_alert(text) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_alerts TO projobs_api;
GRANT DELETE ON public.applications TO projobs_api;
GRANT UPDATE (processed_at, attempts) ON public.outbox_events TO projobs_api;
GRANT UPDATE (email) ON public.company_members TO projobs_api;
GRANT EXECUTE ON FUNCTION public.projobs_due_job_alerts(timestamptz, integer),
                          public.projobs_mark_job_alert_sent(uuid, timestamptz),
                          public.projobs_unsubscribe_job_alert(text) TO projobs_api;
