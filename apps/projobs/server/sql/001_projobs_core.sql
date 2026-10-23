-- ProJobs personal data schema.
-- Apply only to a dedicated ProJobs Supabase project, never to ProIdentity or ProCV.
create extension if not exists pgcrypto;

create table if not exists public.projobs_saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  job_id text not null,
  job_url text not null check (job_url ~* '^https?://'),
  job_title text not null default '',
  company text not null default '',
  created_at timestamptz not null default now(),
  constraint projobs_saved_jobs_user_job_unique unique (user_id, job_id)
);

create index if not exists projobs_saved_jobs_user_created_idx
  on public.projobs_saved_jobs (user_id, created_at desc);

create table if not exists public.projobs_applications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  job_id text not null,
  job_url text not null check (job_url ~* '^https?://'),
  job_title text not null default '',
  company text not null default '',
  cover_letter text not null default '',
  status text not null default 'redirected_to_employer'
    check (status in ('redirected_to_employer', 'applied', 'interview', 'rejected', 'offer', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projobs_applications_user_job_unique unique (user_id, job_id)
);

create index if not exists projobs_applications_user_created_idx
  on public.projobs_applications (user_id, created_at desc);

create or replace function public.projobs_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projobs_applications_touch_updated_at on public.projobs_applications;
create trigger projobs_applications_touch_updated_at
before update on public.projobs_applications
for each row execute function public.projobs_touch_updated_at();

-- All access goes through the ProJobs server, which validates the ProIdentity JWT.
-- No browser role can read or mutate these tables directly.
alter table public.projobs_saved_jobs enable row level security;
alter table public.projobs_applications enable row level security;

revoke all on table public.projobs_saved_jobs from anon, authenticated;
revoke all on table public.projobs_applications from anon, authenticated;
grant all on table public.projobs_saved_jobs to service_role;
grant all on table public.projobs_applications to service_role;

revoke all on function public.projobs_touch_updated_at() from public, anon, authenticated;
