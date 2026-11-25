/**
 * Service-to-service access to each module's data about a user: a content
 * summary for the admin console and erasure when an account is deleted.
 * Each module exposes /internal endpoints protected by its own shared token
 * (never sent to browsers):
 *   ProCV   — PROCV_BACKEND_URL + PROCV_INTERNAL_TOKEN  → /api/internal/users/…
 *   ProJobs — PROJOBS_API_URL  + PROJOBS_INTERNAL_TOKEN → /internal/users/…
 */

export type ModuleKey = 'procv' | 'projobs';

export interface ModuleEndpoint {
  key: ModuleKey;
  baseUrl: string;
  token: string;
}

/** Per-user counts, e.g. { cvs: 3 } or { applications: 2, savedJobs: 5 }. */
export type ContentCounts = Record<string, number>;

export interface UserContentSummary {
  /** Module → counts, or null when the module could not be reached. */
  [module: string]: ContentCounts | null;
}

type Fetch = typeof fetch;
const TIMEOUT_MS = 8000;
const trim = (url: string) => url.replace(/\/+$/, '');

export function configuredModules(env: NodeJS.ProcessEnv = process.env): ModuleEndpoint[] {
  const modules: ModuleEndpoint[] = [];
  const procvUrl = env.PROCV_BACKEND_URL?.trim();
  const procvToken = env.PROCV_INTERNAL_TOKEN?.trim();
  if (procvUrl && procvToken) modules.push({ key: 'procv', baseUrl: `${trim(procvUrl)}/api/internal`, token: procvToken });
  const projobsUrl = env.PROJOBS_API_URL?.trim();
  const projobsToken = env.PROJOBS_INTERNAL_TOKEN?.trim();
  if (projobsUrl && projobsToken) modules.push({ key: 'projobs', baseUrl: `${trim(projobsUrl)}/internal`, token: projobsToken });
  return modules;
}

async function call(endpoint: ModuleEndpoint, path: string, init: RequestInit, fetchImpl: Fetch): Promise<Response> {
  return fetchImpl(`${endpoint.baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${endpoint.token}`, Accept: 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/** Content counts for a page of users, per module. Unreachable modules yield null. */
export async function summarizeUsers(
  userIds: string[],
  modules: ModuleEndpoint[] = configuredModules(),
  fetchImpl: Fetch = fetch,
): Promise<Record<string, UserContentSummary>> {
  const result: Record<string, UserContentSummary> = Object.fromEntries(userIds.map((id) => [id, {}]));
  if (!userIds.length) return result;
  await Promise.all(
    modules.map(async (endpoint) => {
      let summaries: Record<string, ContentCounts> | null = null;
      try {
        const response = await call(endpoint, `/users/summary?ids=${encodeURIComponent(userIds.join(','))}`, { method: 'GET' }, fetchImpl);
        if (response.ok) summaries = ((await response.json()) as { users?: Record<string, ContentCounts> }).users ?? {};
      } catch {
        summaries = null;
      }
      for (const id of userIds) result[id]![endpoint.key] = summaries ? summaries[id] ?? {} : null;
    }),
  );
  return result;
}

export class ModuleErasureError extends Error {
  constructor(public readonly module: ModuleKey, message: string) {
    super(message);
  }
}

/**
 * Erase a user's data in every configured module. Throws ModuleErasureError
 * when a module does not confirm, so the caller keeps the account (and can
 * retry) instead of leaving orphaned module data behind.
 */
export async function eraseUserModuleData(
  userId: string,
  modules: ModuleEndpoint[] = configuredModules(),
  fetchImpl: Fetch = fetch,
): Promise<Record<string, ContentCounts>> {
  const deleted: Record<string, ContentCounts> = {};
  for (const endpoint of modules) {
    let response: Response;
    try {
      response = await call(endpoint, `/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }, fetchImpl);
    } catch (error) {
      throw new ModuleErasureError(endpoint.key, `${endpoint.key} unreachable: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!response.ok) throw new ModuleErasureError(endpoint.key, `${endpoint.key} answered ${response.status}`);
    deleted[endpoint.key] = ((await response.json().catch(() => ({}))) as { deleted?: ContentCounts }).deleted ?? {};
  }
  return deleted;
}
