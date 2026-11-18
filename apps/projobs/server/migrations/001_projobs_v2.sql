-- ProJobs v2 schema: job marketplace + lightweight ATS.
-- Apply only to the dedicated ProJobs database (never ProCV/ProIdentity).
-- Replaces the v1 proof-of-concept tables, which only ever held test data.

-- ---------------------------------------------------------------------------
-- v1 cleanup
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.projobs_application_events,
                     public.projobs_applications,
                     public.projobs_saved_jobs,
                     public.projobs_saved_searches CASCADE;

-- ---------------------------------------------------------------------------
-- Restricted runtime role. The API login (e.g. projobs_runtime) is granted
-- membership and switches to it per transaction; it never owns tables.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'projobs_api') THEN
    CREATE ROLE projobs_api NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END $$;
ALTER ROLE projobs_api NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO projobs_api;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Accent/case folding usable inside generated columns (must be IMMUTABLE).
CREATE OR REPLACE FUNCTION public.projobs_fold(value text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT lower(translate(coalesce(value, ''),
    'ÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑáàäâéèëêíìïîóòöôúùüûñ',
    'aaaaeeeeiiiioooouuuunaaaaeeeeiiiioooouuuun'))
$$;

-- array_to_string() is only STABLE; skills are plain text so joining is safe to mark IMMUTABLE.
CREATE OR REPLACE FUNCTION public.projobs_join_words(words text[]) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT array_to_string(words, ' ') $$;

-- Identity subject of the current request (set per transaction by the API).
CREATE OR REPLACE FUNCTION public.projobs_current_user() RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT NULLIF(current_setting('projobs.user_id', true), '') $$;

CREATE OR REPLACE FUNCTION public.projobs_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------------------------------------------------------------------------
-- Companies and recruiter membership
-- ---------------------------------------------------------------------------
CREATE TABLE public.companies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80),
  name          text NOT NULL CHECK (length(name) BETWEEN 2 AND 120),
  tagline       text CHECK (length(tagline) <= 160),
  description   text CHECK (length(description) <= 5000),
  website       text CHECK (website ~* '^https?://'),
  logo_url      text CHECK (logo_url ~* '^https://'),
  industry      text CHECK (length(industry) <= 80),
  size_range    text CHECK (size_range IN ('1-10', '11-50', '51-200', '201-1000', '1000+')),
  headquarters  text CHECK (length(headquarters) <= 120),
  created_by    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.company_members (
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     text NOT NULL,
  role        text NOT NULL DEFAULT 'recruiter' CHECK (role IN ('owner', 'recruiter')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);
CREATE INDEX company_members_user_idx ON public.company_members (user_id);

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------
CREATE TABLE public.jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  slug              text NOT NULL UNIQUE,
  title             text NOT NULL CHECK (length(title) BETWEEN 3 AND 140),
  summary           text NOT NULL DEFAULT '' CHECK (length(summary) <= 300),
  description       text NOT NULL CHECK (length(description) <= 20000),
  responsibilities  text[] NOT NULL DEFAULT '{}',
  requirements      text[] NOT NULL DEFAULT '{}',
  benefits          text[] NOT NULL DEFAULT '{}',
  skills            text[] NOT NULL DEFAULT '{}',
  employment_type   text NOT NULL CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'temporary')),
  workplace         text NOT NULL CHECK (workplace IN ('remote', 'hybrid', 'onsite')),
  seniority         text NOT NULL CHECK (seniority IN ('intern', 'junior', 'mid', 'senior', 'lead', 'executive')),
  location_city     text CHECK (length(location_city) <= 80),
  location_country  char(2) CHECK (location_country ~ '^[A-Z]{2}$'),
  salary_min        integer CHECK (salary_min >= 0),
  salary_max        integer CHECK (salary_max >= 0),
  salary_currency   char(3) CHECK (salary_currency ~ '^[A-Z]{3}$'),
  salary_period     text CHECK (salary_period IN ('year', 'month', 'hour')),
  status            text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  published_at      timestamptz,
  closes_at         timestamptz,
  created_by        text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  search_vector     tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple'::regconfig, public.projobs_fold(title)), 'A') ||
    setweight(to_tsvector('simple'::regconfig, public.projobs_fold(public.projobs_join_words(skills))), 'B') ||
    setweight(to_tsvector('simple'::regconfig, public.projobs_fold(summary || ' ' || coalesce(location_city, ''))), 'C') ||
    setweight(to_tsvector('simple'::regconfig, public.projobs_fold(description)), 'D')
  ) STORED,
  CONSTRAINT jobs_salary_range CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min),
  CONSTRAINT jobs_salary_currency_required CHECK ((salary_min IS NULL AND salary_max IS NULL) OR salary_currency IS NOT NULL),
  CONSTRAINT jobs_published_at_required CHECK (status = 'draft' OR published_at IS NOT NULL)
);
CREATE INDEX jobs_search_idx         ON public.jobs USING GIN (search_vector);
CREATE INDEX jobs_skills_idx         ON public.jobs USING GIN (skills);
CREATE INDEX jobs_published_idx      ON public.jobs (published_at DESC) WHERE status = 'published';
CREATE INDEX jobs_company_status_idx ON public.jobs (company_id, status, updated_at DESC);
CREATE TRIGGER jobs_touch_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.projobs_touch_updated_at();
CREATE TRIGGER companies_touch_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.projobs_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Applications (candidate-private, visible to the hiring company's members)
-- ---------------------------------------------------------------------------
CREATE TABLE public.applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id        text NOT NULL,
  stage               text NOT NULL DEFAULT 'applied'
                      CHECK (stage IN ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
  source              text NOT NULL CHECK (source IN ('procv', 'manual')),
  procv_cv_id         text,
  candidate_snapshot  jsonb NOT NULL,
  cover_letter        text CHECK (length(cover_letter) <= 5000),
  match_score         smallint NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  matched_skills      text[] NOT NULL DEFAULT '{}',
  missing_skills      text[] NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT applications_one_per_job UNIQUE (job_id, candidate_id)
);
CREATE INDEX applications_job_stage_idx ON public.applications (job_id, stage, match_score DESC);
CREATE INDEX applications_candidate_idx ON public.applications (candidate_id, created_at DESC);
CREATE TRIGGER applications_touch_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.projobs_touch_updated_at();

CREATE TABLE public.application_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id  uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_stage      text,
  to_stage        text NOT NULL,
  actor_id        text NOT NULL,
  actor_type      text NOT NULL CHECK (actor_type IN ('candidate', 'recruiter')),
  note            text CHECK (length(note) <= 2000),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_events_application_idx ON public.application_events (application_id, created_at);

CREATE TABLE public.saved_jobs (
  user_id     text NOT NULL,
  job_id      uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);
CREATE INDEX saved_jobs_user_idx ON public.saved_jobs (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Transactional outbox: integration events for other ProSolutions modules.
-- Consumers page through it with an id cursor (GET /internal/events?after=).
-- ---------------------------------------------------------------------------
CREATE TABLE public.outbox_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type      text NOT NULL,
  aggregate_type  text NOT NULL,
  aggregate_id    text NOT NULL,
  payload         jsonb NOT NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Row level security for candidate-private data
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.projobs_is_job_member(target_job uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.company_members m ON m.company_id = j.company_id
    WHERE j.id = target_job AND m.user_id = public.projobs_current_user()
  )
$$;
REVOKE ALL ON FUNCTION public.projobs_is_job_member(uuid) FROM PUBLIC;

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications FORCE ROW LEVEL SECURITY;
CREATE POLICY applications_candidate ON public.applications FOR ALL TO projobs_api
  USING (candidate_id = public.projobs_current_user())
  WITH CHECK (candidate_id = public.projobs_current_user());
CREATE POLICY applications_recruiter_read ON public.applications FOR SELECT TO projobs_api
  USING (public.projobs_is_job_member(job_id));
CREATE POLICY applications_recruiter_update ON public.applications FOR UPDATE TO projobs_api
  USING (public.projobs_is_job_member(job_id))
  WITH CHECK (public.projobs_is_job_member(job_id));

ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_events FORCE ROW LEVEL SECURITY;
CREATE POLICY application_events_visible ON public.application_events FOR SELECT TO projobs_api
  USING (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id));
CREATE POLICY application_events_insert ON public.application_events FOR INSERT TO projobs_api
  WITH CHECK (actor_id = public.projobs_current_user()
              AND EXISTS (SELECT 1 FROM public.applications a WHERE a.id = application_id));

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY saved_jobs_owner ON public.saved_jobs FOR ALL TO projobs_api
  USING (user_id = public.projobs_current_user())
  WITH CHECK (user_id = public.projobs_current_user());

-- ---------------------------------------------------------------------------
-- Least-privilege grants for the runtime role
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.companies TO projobs_api;
GRANT SELECT, INSERT, DELETE ON public.company_members TO projobs_api;
GRANT SELECT, INSERT, UPDATE ON public.jobs TO projobs_api;
GRANT SELECT, INSERT, UPDATE ON public.applications TO projobs_api;
GRANT SELECT, INSERT ON public.application_events TO projobs_api;
GRANT SELECT, INSERT, DELETE ON public.saved_jobs TO projobs_api;
GRANT SELECT, INSERT ON public.outbox_events TO projobs_api;
GRANT EXECUTE ON FUNCTION public.projobs_fold(text),
                          public.projobs_join_words(text[]),
                          public.projobs_current_user(),
                          public.projobs_touch_updated_at(),
                          public.projobs_is_job_member(uuid) TO projobs_api;
