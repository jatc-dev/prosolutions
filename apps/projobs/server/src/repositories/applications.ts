import type {
  ApplicationStage,
  CandidateApplication,
  CandidateProfile,
  MatchResult,
  PipelineApplication,
  PipelineStage,
} from '../contracts.js';
import type { Queryable } from '../db/database.js';
import { conflict, notFound } from '../http/errors.js';
import { UUID } from './jobs.js';
import { JOB_SUMMARY_COLUMNS, TIMELINE_SUBQUERY, iso, json, toJobSummary, toTimeline } from './mappers.js';
import { publishEvent } from './outbox.js';

export interface NewApplication {
  jobId: string;
  candidateId: string;
  source: 'procv' | 'manual';
  procvCvId: string | null;
  profile: CandidateProfile;
  coverLetter: string | null;
  match: MatchResult;
  /** Address for transactional emails (from the identity token). */
  candidateEmail: string | null;
  jobTitle: string;
  companyName: string;
}

const TERMINAL: ApplicationStage[] = ['hired', 'rejected', 'withdrawn'];

/** Insert an application for an open job, its first timeline event and the integration event. */
export async function submitApplication(tx: Queryable, input: NewApplication): Promise<{ id: string; createdAt: string }> {
  const { rows } = await tx.query<{ id: string; created_at: Date; company_id: string }>(
    `INSERT INTO public.applications (
       job_id, candidate_id, source, procv_cv_id, candidate_snapshot, cover_letter,
       match_score, matched_skills, missing_skills, consent_at, candidate_email)
     SELECT j.id, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, now(), $10
     FROM public.jobs j
     WHERE j.id = $1 AND j.status = 'published' AND (j.closes_at IS NULL OR j.closes_at > now())
       AND j.moderation_status = 'ok'
       AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = j.company_id AND c.verification_status NOT IN ('rejected', 'suspended'))
     ON CONFLICT ON CONSTRAINT applications_one_per_job DO NOTHING
     RETURNING id, created_at, (SELECT company_id FROM public.jobs WHERE id = $1) AS company_id`,
    [
      input.jobId, input.candidateId, input.source, input.procvCvId, JSON.stringify(input.profile),
      input.coverLetter, input.match.score, input.match.matchedSkills, input.match.missingSkills,
      input.candidateEmail,
    ],
  );
  const created = rows[0];
  if (!created) {
    const existing = await tx.query(
      'SELECT 1 FROM public.applications WHERE job_id = $1 AND candidate_id = $2',
      [input.jobId, input.candidateId],
    );
    if (existing.rows.length) throw conflict('You already applied to this job', 'already_applied');
    throw conflict('This job is not accepting applications', 'job_not_open');
  }
  await tx.query(
    `INSERT INTO public.application_events (application_id, from_stage, to_stage, actor_id, actor_type)
     VALUES ($1, NULL, 'applied', $2, 'candidate')`,
    [created.id, input.candidateId],
  );
  // Recipients are resolved now (company_members has no RLS) so the
  // notification worker never needs to read candidate-private rows.
  const { rows: members } = await tx.query<{ email: string }>(
    `SELECT email FROM public.company_members WHERE company_id = $1 AND email IS NOT NULL`,
    [created.company_id],
  );
  await publishEvent(tx, 'projobs.application.submitted', 'application', created.id, {
    applicationId: created.id,
    jobId: input.jobId,
    companyId: created.company_id,
    candidateId: input.candidateId,
    source: input.source,
    procvCvId: input.procvCvId,
    matchScore: input.match.score,
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    candidateName: input.profile.fullName,
    candidateEmail: input.candidateEmail,
    recruiterEmails: members.map((member) => member.email),
  });
  return { id: created.id, createdAt: iso(created.created_at) ?? '' };
}

function matchOf(row: Record<string, any>): MatchResult {
  return {
    score: Number(row.match_score),
    matchedSkills: Array.isArray(row.matched_skills) ? row.matched_skills : [],
    missingSkills: Array.isArray(row.missing_skills) ? row.missing_skills : [],
  };
}

export async function listCandidateApplications(tx: Queryable, candidateId: string): Promise<CandidateApplication[]> {
  const { rows } = await tx.query<Record<string, any>>(
    `SELECT a.id AS application_id, a.stage, a.source, a.match_score, a.matched_skills, a.missing_skills,
            a.created_at AS applied_at, a.updated_at AS application_updated_at,
            ${TIMELINE_SUBQUERY} AS timeline,
            ${JOB_SUMMARY_COLUMNS}
     FROM public.applications a
     JOIN public.jobs j ON j.id = a.job_id
     JOIN public.companies c ON c.id = j.company_id
     WHERE a.candidate_id = $1
     ORDER BY a.updated_at DESC`,
    [candidateId],
  );
  return rows.map((row) => ({
    id: row.application_id,
    stage: row.stage,
    source: row.source,
    job: toJobSummary(row),
    match: matchOf(row),
    createdAt: iso(row.applied_at) ?? '',
    updatedAt: iso(row.application_updated_at) ?? '',
    timeline: toTimeline(row.timeline),
  }));
}

/** Job ids the candidate already applied to (for "Applied" badges). */
export async function appliedJobIds(tx: Queryable, candidateId: string, jobIds: string[]): Promise<Set<string>> {
  const ids = jobIds.filter((id) => UUID.test(id));
  if (!ids.length) return new Set();
  const { rows } = await tx.query<{ job_id: string }>(
    'SELECT job_id FROM public.applications WHERE candidate_id = $1 AND job_id = ANY($2::uuid[])',
    [candidateId, ids],
  );
  return new Set(rows.map((row) => row.job_id));
}

export async function withdrawApplication(tx: Queryable, candidateId: string, applicationId: string) {
  if (!UUID.test(applicationId)) throw notFound('Application not found');
  const { rows } = await tx.query<{ from_stage: string; job_id: string }>(
    `WITH previous AS (
       SELECT id, stage FROM public.applications WHERE id = $1 AND candidate_id = $2 FOR UPDATE
     )
     UPDATE public.applications a SET stage = 'withdrawn'
     FROM previous
     WHERE a.id = previous.id AND previous.stage <> ALL($3::text[])
     RETURNING previous.stage AS from_stage, a.job_id`,
    [applicationId, candidateId, TERMINAL],
  );
  const changed = rows[0];
  if (!changed) {
    const exists = await tx.query('SELECT 1 FROM public.applications WHERE id = $1 AND candidate_id = $2', [applicationId, candidateId]);
    if (!exists.rows.length) throw notFound('Application not found');
    throw conflict('This application can no longer be withdrawn', 'application_closed');
  }
  await tx.query(
    `INSERT INTO public.application_events (application_id, from_stage, to_stage, actor_id, actor_type)
     VALUES ($1, $2, 'withdrawn', $3, 'candidate')`,
    [applicationId, changed.from_stage, candidateId],
  );
  await publishEvent(tx, 'projobs.application.withdrawn', 'application', applicationId, {
    applicationId,
    jobId: changed.job_id,
    candidateId,
  });
}

/** Applications of one job for a member of the hiring company (RLS enforces visibility). */
export async function listPipeline(tx: Queryable, recruiterId: string, jobId: string): Promise<PipelineApplication[]> {
  if (!UUID.test(jobId)) throw notFound('Job not found');
  const member = await tx.query(
    `SELECT 1 FROM public.jobs j JOIN public.company_members m ON m.company_id = j.company_id
     WHERE j.id = $1 AND m.user_id = $2`,
    [jobId, recruiterId],
  );
  if (!member.rows.length) throw notFound('Job not found');
  const { rows } = await tx.query<Record<string, any>>(
    `SELECT a.id, a.stage, a.source, a.candidate_snapshot, a.cover_letter, a.match_score,
            a.matched_skills, a.missing_skills, a.created_at, a.updated_at,
            ${TIMELINE_SUBQUERY} AS timeline
     FROM public.applications a
     WHERE a.job_id = $1
     ORDER BY a.match_score DESC, a.created_at`,
    [jobId],
  );
  return rows.map((row) => ({
    id: row.id,
    stage: row.stage,
    source: row.source,
    candidate: json<CandidateProfile>(row.candidate_snapshot),
    coverLetter: row.cover_letter ?? null,
    match: matchOf(row),
    createdAt: iso(row.created_at) ?? '',
    updatedAt: iso(row.updated_at) ?? '',
    timeline: toTimeline(row.timeline),
  }));
}

/** Move an application through the hiring pipeline (recruiter action). */
export async function moveApplication(
  tx: Queryable,
  recruiterId: string,
  applicationId: string,
  toStage: PipelineStage,
  note: string | null,
) {
  if (!UUID.test(applicationId)) throw notFound('Application not found');
  const { rows } = await tx.query<{
    from_stage: string; job_id: string; candidate_id: string; candidate_email: string | null;
    candidate_name: string | null; job_title: string; company_name: string;
  }>(
    `WITH previous AS (
       SELECT id, stage FROM public.applications WHERE id = $1 FOR UPDATE
     )
     UPDATE public.applications a SET stage = $2
     FROM previous
     WHERE a.id = previous.id AND previous.stage <> 'withdrawn'
       AND public.projobs_is_job_member(a.job_id)
     RETURNING previous.stage AS from_stage, a.job_id, a.candidate_id, a.candidate_email,
       a.candidate_snapshot->>'fullName' AS candidate_name,
       (SELECT j.title FROM public.jobs j WHERE j.id = a.job_id) AS job_title,
       (SELECT c.name FROM public.jobs j JOIN public.companies c ON c.id = j.company_id WHERE j.id = a.job_id) AS company_name`,
    [applicationId, toStage],
  );
  const changed = rows[0];
  if (!changed) {
    // RLS hides applications of other companies, so "not visible" and "missing" are the same 404.
    const visible = await tx.query<{ stage: string }>('SELECT stage FROM public.applications WHERE id = $1', [applicationId]);
    if (!visible.rows.length) throw notFound('Application not found');
    throw conflict('The candidate withdrew this application', 'application_withdrawn');
  }
  if (changed.from_stage !== toStage || note) {
    await tx.query(
      `INSERT INTO public.application_events (application_id, from_stage, to_stage, actor_id, actor_type, note)
       VALUES ($1, $2, $3, $4, 'recruiter', $5)`,
      [applicationId, changed.from_stage, toStage, recruiterId, note],
    );
  }
  if (changed.from_stage !== toStage) {
    await publishEvent(tx, 'projobs.application.stage_changed', 'application', applicationId, {
      applicationId,
      jobId: changed.job_id,
      candidateId: changed.candidate_id,
      fromStage: changed.from_stage,
      toStage,
      candidateEmail: changed.candidate_email,
      candidateName: changed.candidate_name,
      jobTitle: changed.job_title,
      companyName: changed.company_name,
    });
  }
}
