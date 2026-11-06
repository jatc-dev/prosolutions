-- Enforce ownership of application events at the database level.
-- Apply after 001_projobs_core.sql and 002_projobs_high_value_features.sql.
-- Existing events are reconciled by (user_id, job_id), the legacy logical key.
BEGIN;

ALTER TABLE public.projobs_application_events
  ADD COLUMN IF NOT EXISTS application_id uuid;

UPDATE public.projobs_application_events AS event
SET application_id = application.id
FROM public.projobs_applications AS application
WHERE event.application_id IS NULL
  AND event.user_id = application.user_id
  AND event.job_id = application.job_id;

DO $$
DECLARE
  orphan_count bigint;
BEGIN
  SELECT count(*) INTO orphan_count
  FROM public.projobs_application_events
  WHERE application_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE NOTICE
      'Removing % orphaned ProJobs application event(s) with no matching application',
      orphan_count;

    DELETE FROM public.projobs_application_events
    WHERE application_id IS NULL;
  END IF;
END $$;

ALTER TABLE public.projobs_application_events
  ALTER COLUMN application_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS projobs_application_events_application_created_idx
  ON public.projobs_application_events(application_id, created_at DESC);

ALTER TABLE public.projobs_application_events
  DROP CONSTRAINT IF EXISTS projobs_application_events_application_fk;

ALTER TABLE public.projobs_application_events
  ADD CONSTRAINT projobs_application_events_application_fk
  FOREIGN KEY (application_id)
  REFERENCES public.projobs_applications(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

COMMIT;
