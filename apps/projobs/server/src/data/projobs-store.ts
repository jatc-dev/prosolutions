import { Pool, type PoolClient } from 'pg';
import { config } from '../config.js';

export class StoreNotConfiguredError extends Error {
  constructor() { super('ProJobs PostgreSQL persistence is not configured'); this.name = 'StoreNotConfiguredError'; }
}
export class StoreRequestError extends Error {
  constructor(public readonly status = 503) { super('ProJobs persistence request failed'); this.name = 'StoreRequestError'; }
}
type SavedJobInput = { userId: string; jobId: string; jobUrl: string; jobTitle: string; company: string };
type ApplicationInput = SavedJobInput & { coverLetter: string };
export type ApplicationStatus = 'redirected_to_employer' | 'applied' | 'interview' | 'rejected' | 'offer' | 'withdrawn';
export type SavedSearchInput = { userId: string; email: string; name: string; filters: Record<string, unknown>; frequency: 'daily' | 'weekly' };
let pool: Pool | undefined;

function getPool(): Pool {
  if (!config.databaseUrl) throw new StoreNotConfiguredError();
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, query_timeout: 8000, application_name: 'projobs-api' });
    pool.on('error', () => { /* never log credentials */ });
  }
  return pool;
}
async function withUserTransaction<T>(userId: string, action: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!userId || userId.length > 512) throw new StoreRequestError(401);
  let client: PoolClient;
  try { client = await getPool().connect(); } catch (e) { if (e instanceof StoreNotConfiguredError) throw e; throw new StoreRequestError(503); }
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE projobs_api');
    await client.query("SELECT set_config('projobs.user_id', $1, true)", [userId]);
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch {
    try { await client.query('ROLLBACK'); } catch { /* ignore rollback failure */ }
    throw new StoreRequestError(503);
  } finally { client.release(); }
}
const SAVED = 'id, job_id, job_url, job_title, company, created_at';
const APPLICATION = 'id, job_id, job_url, job_title, company, cover_letter, status, status_history, last_status_changed_at, created_at, updated_at';

export async function saveJob(x: SavedJobInput) {
  return withUserTransaction(x.userId, async c => {
    const q = await c.query(`INSERT INTO public.projobs_saved_jobs(user_id,job_id,job_url,job_title,company) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,job_id) DO UPDATE SET job_url=EXCLUDED.job_url,job_title=EXCLUDED.job_title,company=EXCLUDED.company RETURNING ${SAVED}`, [x.userId, x.jobId, x.jobUrl, x.jobTitle, x.company]);
    if (!q.rows[0]) throw new StoreRequestError();
    return q.rows[0];
  });
}
export async function listSavedJobs(userId: string) {
  return withUserTransaction(userId, async c => (await c.query(`SELECT ${SAVED} FROM public.projobs_saved_jobs ORDER BY created_at DESC`)).rows);
}
export async function removeSavedJob(userId: string, jobId: string) {
  return withUserTransaction(userId, async c => (await c.query('DELETE FROM public.projobs_saved_jobs WHERE job_id=$1 RETURNING id', [jobId])).rowCount! > 0);
}
export async function createApplication(x: ApplicationInput) {
  return withUserTransaction(x.userId, async c => {
    const q = await c.query(`INSERT INTO public.projobs_applications(user_id,job_id,job_url,job_title,company,cover_letter,status,status_history) VALUES($1,$2,$3,$4,$5,$6,'redirected_to_employer',jsonb_build_array(jsonb_build_object('status','redirected_to_employer','at',now(),'note','Actividad iniciada desde ProJobs'))) ON CONFLICT(user_id,job_id) DO UPDATE SET job_url=EXCLUDED.job_url,job_title=EXCLUDED.job_title,company=EXCLUDED.company,cover_letter=EXCLUDED.cover_letter RETURNING ${APPLICATION}`, [x.userId, x.jobId, x.jobUrl, x.jobTitle, x.company, x.coverLetter]);
    if (!q.rows[0]) throw new StoreRequestError();
    return q.rows[0];
  });
}
export async function listApplications(userId: string) {
  return withUserTransaction(userId, async c => (await c.query(`SELECT ${APPLICATION} FROM public.projobs_applications ORDER BY updated_at DESC`)).rows);
}
export async function removeApplication(userId: string, jobId: string) {
  return withUserTransaction(userId, async c => (await c.query('DELETE FROM public.projobs_applications WHERE job_id=$1 RETURNING id', [jobId])).rowCount! > 0);
}
export async function updateApplicationStatus(userId: string, jobId: string, status: ApplicationStatus, note = '') {
  return withUserTransaction(userId, async c => {
    const previous = await c.query('SELECT status FROM public.projobs_applications WHERE job_id=$1', [jobId]);
    if (!previous.rows[0]) return null;
    const previousStatus = previous.rows[0].status as ApplicationStatus;
    const q = await c.query(
      `UPDATE public.projobs_applications
       SET status=$2, status_history=status_history || jsonb_build_array(jsonb_build_object('status',$2,'at',now(),'note',$3)),
           last_status_changed_at=now(), updated_at=now()
       WHERE job_id=$1 RETURNING ${APPLICATION}`,
      [jobId, status, note],
    );
    if (!q.rows[0]) return null;
    await c.query(
      `INSERT INTO public.projobs_application_events(user_id,job_id,previous_status,new_status,note)
       VALUES($1,$2,$3,$4,$5)`,
      [userId, jobId, previousStatus, status, note],
    );
    return q.rows[0];
  });
}

export async function createSavedSearch(x: SavedSearchInput) {
  return withUserTransaction(x.userId, async c => {
    const q = await c.query(
      `INSERT INTO public.projobs_saved_searches(user_id,email,name,filters,frequency)
       VALUES($1,$2,$3,$4::jsonb,$5)
       ON CONFLICT(user_id,name) DO UPDATE SET email=EXCLUDED.email,filters=EXCLUDED.filters,frequency=EXCLUDED.frequency,enabled=true,updated_at=now()
       RETURNING id,name,filters,frequency,enabled,created_at,updated_at,last_notified_at`,
      [x.userId, x.email, x.name, JSON.stringify(x.filters), x.frequency],
    );
    if (!q.rows[0]) throw new StoreRequestError();
    return q.rows[0];
  });
}
export async function listSavedSearches(userId: string) {
  return withUserTransaction(userId, async c => (await c.query(
    'SELECT id,name,filters,frequency,enabled,created_at,updated_at,last_notified_at FROM public.projobs_saved_searches ORDER BY created_at DESC',
  )).rows);
}
export async function removeSavedSearch(userId: string, id: string) {
  return withUserTransaction(userId, async c => (await c.query('DELETE FROM public.projobs_saved_searches WHERE id=$1 RETURNING id', [id])).rowCount! > 0);
}
export async function getCareerProgress(userId: string) {
  return withUserTransaction(userId, async c => {
    const [applications, saved, events] = await Promise.all([
      c.query(`SELECT status,count(*)::int AS count FROM public.projobs_applications GROUP BY status`),
      c.query('SELECT count(*)::int AS count FROM public.projobs_saved_jobs'),
      c.query(`SELECT e.job_id,a.job_title,a.company,e.previous_status,e.new_status,e.note,e.created_at
        FROM public.projobs_application_events e
        LEFT JOIN public.projobs_applications a ON a.user_id=e.user_id AND a.job_id=e.job_id
        ORDER BY e.created_at DESC LIMIT 20`),
    ]);
    const counts: Record<string, number> = {};
    let totalApplications = 0;
    for (const row of applications.rows) { counts[row.status] = row.count; totalApplications += row.count; }
    return { totalApplications, savedJobs: saved.rows[0]?.count || 0, statuses: counts, events: events.rows };
  });
}
export function isStoreConfigured() { return Boolean(config.databaseUrl); }
