import type { AlertFrequency, JobAlert } from '../contracts.js';
import type { Queryable } from '../db/database.js';
import { conflict, notFound } from '../http/errors.js';
import { jobSearchQuery } from '../http/schemas.js';
import type { JobSearchParams } from './jobs.js';
import { UUID } from './jobs.js';
import { iso, json } from './mappers.js';

/** Keys of the public search URL that an alert may store. */
export const ALERT_QUERY_KEYS = ['q', 'workplace', 'type', 'seniority', 'skills', 'country', 'location', 'salaryMin'] as const;
const MAX_ALERTS_PER_USER = 10;

/** Keep only known search keys with short string values. */
export function sanitizeAlertQuery(raw: Record<string, unknown>): Record<string, string> {
  const query: Record<string, string> = {};
  for (const key of ALERT_QUERY_KEYS) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) query[key] = value.trim().slice(0, 200);
  }
  return query;
}

/** Turn a stored alert query into search parameters (new jobs only, newest first). */
export function alertSearchParams(query: Record<string, string>, frequency: AlertFrequency, pageSize = 10): JobSearchParams | null {
  const parsed = jobSearchQuery.safeParse(query);
  if (!parsed.success) return null;
  const q = parsed.data;
  return {
    q: q.q,
    workplace: q.workplace,
    employmentType: q.type,
    seniority: q.seniority,
    skills: q.skills,
    country: q.country,
    location: q.location,
    salaryMin: q.salaryMin,
    postedWithinDays: frequency === 'weekly' ? 7 : 1,
    sort: 'recent',
    page: 1,
    pageSize,
  };
}

function toAlert(row: Record<string, any>): JobAlert {
  return {
    id: row.id,
    label: row.label ?? null,
    email: row.email,
    query: json<Record<string, string>>(row.query) ?? {},
    frequency: row.frequency,
    active: Boolean(row.active),
    lastSentAt: iso(row.last_sent_at),
    createdAt: iso(row.created_at) ?? '',
  };
}

const ALERT_COLUMNS = 'id, label, email, query, frequency, active, last_sent_at, created_at';

export async function listAlerts(tx: Queryable, userId: string): Promise<JobAlert[]> {
  const { rows } = await tx.query<Record<string, any>>(
    `SELECT ${ALERT_COLUMNS} FROM public.job_alerts WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(toAlert);
}

export async function createAlert(
  tx: Queryable,
  userId: string,
  input: { email: string; label: string | null; query: Record<string, string>; frequency: AlertFrequency },
): Promise<JobAlert> {
  const { rows: count } = await tx.query<{ total: string }>(
    'SELECT count(*)::text AS total FROM public.job_alerts WHERE user_id = $1 AND active',
    [userId],
  );
  if (Number(count[0]?.total ?? 0) >= MAX_ALERTS_PER_USER) {
    throw conflict(`You can keep up to ${MAX_ALERTS_PER_USER} active alerts`, 'alert_limit');
  }
  const { rows } = await tx.query<Record<string, any>>(
    `INSERT INTO public.job_alerts (user_id, email, label, query, frequency)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     RETURNING ${ALERT_COLUMNS}`,
    [userId, input.email, input.label, JSON.stringify(input.query), input.frequency],
  );
  return toAlert(rows[0]!);
}

export async function deleteAlert(tx: Queryable, userId: string, alertId: string): Promise<void> {
  if (!UUID.test(alertId)) throw notFound('Alert not found');
  const { rows } = await tx.query('DELETE FROM public.job_alerts WHERE id = $1 AND user_id = $2 RETURNING id', [alertId, userId]);
  if (!rows.length) throw notFound('Alert not found');
}

export interface DueAlert {
  id: string;
  email: string;
  label: string | null;
  query: Record<string, string>;
  frequency: AlertFrequency;
  unsubscribeToken: string;
}

export async function dueAlerts(tx: Queryable, at: Date, limit = 50): Promise<DueAlert[]> {
  const { rows } = await tx.query<Record<string, any>>('SELECT * FROM public.projobs_due_job_alerts($1, $2)', [at, limit]);
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    label: row.label ?? null,
    query: json<Record<string, string>>(row.query) ?? {},
    frequency: row.frequency,
    unsubscribeToken: row.unsubscribe_token,
  }));
}

export async function markAlertSent(tx: Queryable, alertId: string, at: Date): Promise<void> {
  await tx.query('SELECT public.projobs_mark_job_alert_sent($1, $2)', [alertId, at]);
}

export async function unsubscribeAlert(tx: Queryable, token: string): Promise<boolean> {
  const { rows } = await tx.query<{ ok: boolean }>('SELECT public.projobs_unsubscribe_job_alert($1) AS ok', [token]);
  return Boolean(rows[0]?.ok);
}
