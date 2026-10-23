import { config } from '../config';

export class StoreNotConfiguredError extends Error {
  constructor() {
    super('ProJobs persistence is not configured');
    this.name = 'StoreNotConfiguredError';
  }
}

export class StoreRequestError extends Error {
  constructor(public readonly status: number) {
    super('ProJobs persistence request failed');
    this.name = 'StoreRequestError';
  }
}

type SavedJobInput = {
  userId: string;
  jobId: string;
  jobUrl: string;
  jobTitle: string;
  company: string;
};

type ApplicationInput = SavedJobInput & {
  coverLetter: string;
};

function getTableUrl(table: string, query?: URLSearchParams): string {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new StoreNotConfiguredError();
  }
  const url = new URL(`/rest/v1/${table}`, config.supabaseUrl);
  if (query) url.search = query.toString();
  return url.toString();
}

async function requestTable(
  table: string,
  query: URLSearchParams,
  init: { method: string; body?: unknown; prefer?: string },
): Promise<any[]> {
  const headers: Record<string, string> = {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    Accept: 'application/json',
  };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.prefer) headers.Prefer = init.prefer;

  let response: Response;
  try {
    response = await fetch(getTableUrl(table, query), {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new StoreRequestError(503);
  }

  if (!response.ok) throw new StoreRequestError(response.status);
  if (response.status === 204) return [];
  const text = await response.text();
  if (!text) return [];

  try {
    const data: unknown = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    throw new StoreRequestError(502);
  }
}

function userQuery(userId: string): URLSearchParams {
  const query = new URLSearchParams();
  query.set('select', 'id,job_id,job_url,job_title,company,created_at');
  query.set('user_id', `eq.${userId}`);
  return query;
}

export async function saveJob(input: SavedJobInput) {
  const query = new URLSearchParams({ on_conflict: 'user_id,job_id' });
  query.set('select', 'id,job_id,job_url,job_title,company,created_at');
  const rows = await requestTable('projobs_saved_jobs', query, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      user_id: input.userId,
      job_id: input.jobId,
      job_url: input.jobUrl,
      job_title: input.jobTitle,
      company: input.company,
    },
  });
  if (!rows[0]) throw new StoreRequestError(502);
  return rows[0];
}

export async function listSavedJobs(userId: string) {
  const query = userQuery(userId);
  query.set('order', 'created_at.desc');
  return requestTable('projobs_saved_jobs', query, { method: 'GET' });
}

export async function removeSavedJob(userId: string, jobId: string) {
  const query = new URLSearchParams();
  query.set('user_id', `eq.${userId}`);
  query.set('job_id', `eq.${jobId}`);
  query.set('select', 'id');
  const rows = await requestTable('projobs_saved_jobs', query, {
    method: 'DELETE',
    prefer: 'return=representation',
  });
  return rows.length > 0;
}

export async function createApplication(input: ApplicationInput) {
  const query = new URLSearchParams({ on_conflict: 'user_id,job_id' });
  query.set('select', 'id,job_id,job_url,job_title,company,cover_letter,status,created_at');
  const rows = await requestTable('projobs_applications', query, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      user_id: input.userId,
      job_id: input.jobId,
      job_url: input.jobUrl,
      job_title: input.jobTitle,
      company: input.company,
      cover_letter: input.coverLetter,
      status: 'redirected_to_employer',
    },
  });
  if (!rows[0]) throw new StoreRequestError(502);
  return rows[0];
}

export async function listApplications(userId: string) {
  const query = new URLSearchParams();
  query.set('select', 'id,job_id,job_url,job_title,company,cover_letter,status,created_at');
  query.set('user_id', `eq.${userId}`);
  query.set('order', 'created_at.desc');
  return requestTable('projobs_applications', query, { method: 'GET' });
}

export function isStoreConfigured() {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}
