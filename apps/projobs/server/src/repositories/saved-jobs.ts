import type { JobSummary } from '../contracts.js';
import type { Queryable } from '../db/database.js';
import { notFound } from '../http/errors.js';
import { UUID } from './jobs.js';
import { JOB_SUMMARY_COLUMNS, toJobSummary } from './mappers.js';

export async function listSavedJobs(tx: Queryable, userId: string): Promise<Array<JobSummary & { savedAt: string; open: boolean }>> {
  const { rows } = await tx.query<Record<string, any>>(
    `SELECT ${JOB_SUMMARY_COLUMNS}, s.created_at AS saved_at,
            (j.status = 'published' AND (j.closes_at IS NULL OR j.closes_at > now())) AS open
     FROM public.saved_jobs s
     JOIN public.jobs j ON j.id = s.job_id AND j.status IN ('published', 'closed')
     JOIN public.companies c ON c.id = j.company_id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC`,
    [userId],
  );
  return rows.map((row) => ({ ...toJobSummary(row), savedAt: new Date(row.saved_at).toISOString(), open: row.open === true }));
}

export async function savedJobIds(tx: Queryable, userId: string, jobIds: string[]): Promise<Set<string>> {
  const ids = jobIds.filter((id) => UUID.test(id));
  if (!ids.length) return new Set();
  const { rows } = await tx.query<{ job_id: string }>(
    'SELECT job_id FROM public.saved_jobs WHERE user_id = $1 AND job_id = ANY($2::uuid[])',
    [userId, ids],
  );
  return new Set(rows.map((row) => row.job_id));
}

export async function saveJob(tx: Queryable, userId: string, jobId: string): Promise<void> {
  if (!UUID.test(jobId)) throw notFound('Job not found');
  const { rows } = await tx.query(
    `INSERT INTO public.saved_jobs (user_id, job_id)
     SELECT $1, j.id FROM public.jobs j WHERE j.id = $2 AND j.status = 'published'
     ON CONFLICT DO NOTHING
     RETURNING job_id`,
    [userId, jobId],
  );
  if (!rows.length) {
    const exists = await tx.query('SELECT 1 FROM public.saved_jobs WHERE user_id = $1 AND job_id = $2', [userId, jobId]);
    if (!exists.rows.length) throw notFound('Job not found');
  }
}

export async function unsaveJob(tx: Queryable, userId: string, jobId: string): Promise<void> {
  if (!UUID.test(jobId)) return;
  await tx.query('DELETE FROM public.saved_jobs WHERE user_id = $1 AND job_id = $2', [userId, jobId]);
}
