import { createHash } from 'node:crypto';
import type { ExternalJob, ExternalJobsResponse, ExternalSource } from '../contracts.js';

/**
 * Partner job feeds shown next to ProJobs' own offers. Searches run on the
 * server, results link to the original offer and are never
 * stored in the database, indexed or marked up as JobPosting.
 */
export interface ExternalJobsQuery {
  q: string;
  location: string;
  page: number;
  /** Visitor's IP and user agent: required by Careerjet to detect fraud. */
  userIp: string;
  userAgent: string;
}

export interface ExternalJobsResult {
  items: ExternalJob[];
  total: number;
}

export interface ExternalJobsProvider {
  readonly source: ExternalSource;
  search(query: ExternalJobsQuery): Promise<ExternalJobsResult>;
}

export const CAREERJET_ENDPOINT = 'https://search.api.careerjet.net/v4/query';
export const EXTERNAL_PAGE_SIZE = 10;

type Json = Record<string, unknown>;
const isRecord = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Plain text from a partner HTML fragment: tags removed, entities decoded, whitespace collapsed. */
export function plainText(html: string, maxLength = 280): string {
  const decoded = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] === '#') {
        const code = entity[1]?.toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ' ';
      }
      return ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, ' ')
    .trim();
  return decoded.length > maxLength ? `${decoded.slice(0, maxLength - 1).trimEnd()}…` : decoded;
}

/** Only http(s) links leave our site; anything else is dropped. */
function safeUrl(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Map one Careerjet v4 job to our contract (null when it has no title or valid link). */
export function toExternalJob(raw: unknown): ExternalJob | null {
  return toCareerjetJob(raw);
}

function toCareerjetJob(raw: unknown): ExternalJob | null {
  if (!isRecord(raw)) return null;
  const title = text(raw.title);
  const url = safeUrl(raw.url);
  if (!title || !url) return null;
  const date = text(raw.date);
  const parsedDate = date ? new Date(date) : null;
  return {
    id: createHash('sha256').update(url).digest('hex').slice(0, 16),
    title: plainText(title, 160),
    company: text(raw.company) ? plainText(String(raw.company), 120) : null,
    location: text(raw.locations) ? plainText(String(raw.locations), 120) : null,
    snippet: plainText(String(raw.description ?? '')),
    salary: text(raw.salary) ? plainText(String(raw.salary), 80) : null,
    postedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
    url,
    source: 'careerjet',
  };
}

export interface CareerjetOptions {
  apiKey: string;
  locale: string;
  timeoutMs: number;
  cacheSeconds?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export function createCareerjetProvider(options: CareerjetOptions): ExternalJobsProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const auth = `Basic ${Buffer.from(`${options.apiKey}:`).toString('base64')}`;
  const cache = new Map<string, { expires: number; value: ExternalJobsResult }>();
  const ttlMs = (options.cacheSeconds ?? 0) * 1000;

  return {
    source: { id: 'careerjet', name: 'Careerjet', url: 'https://www.careerjet.com.co' },
    async search(query) {
      const key = JSON.stringify([query.q.toLowerCase(), query.location.toLowerCase(), query.page]);
      const cached = ttlMs > 0 ? cache.get(key) : undefined;
      if (cached && cached.expires > now()) return cached.value;

      const params = new URLSearchParams({
        locale_code: options.locale,
        keywords: query.q,
        page: String(Math.min(Math.max(query.page, 1), 10)),
        page_size: String(EXTERNAL_PAGE_SIZE),
        fragment_size: '280',
        sort: 'relevance',
        user_ip: query.userIp,
        user_agent: query.userAgent,
      });
      if (query.location) params.set('location', query.location);

      const response = await fetchImpl(`${CAREERJET_ENDPOINT}?${params}`, {
        headers: { Authorization: auth, Accept: 'application/json' },
        signal: AbortSignal.timeout(options.timeoutMs),
      });
      if (!response.ok) throw new Error(`careerjet responded ${response.status}`);
      const body: unknown = await response.json();
      // type "LOCATIONS" means an ambiguous or unknown location: no search ran.
      if (!isRecord(body) || body.type !== 'JOBS' || !Array.isArray(body.jobs)) return { items: [], total: 0 };

      const items = body.jobs.map(toExternalJob).filter((job): job is ExternalJob => job !== null);
      const total = typeof body.hits === 'number' && body.hits >= 0 ? body.hits : items.length;
      const value = { items, total };
      if (ttlMs > 0) {
        if (cache.size > 500) cache.clear();
        cache.set(key, { expires: now() + ttlMs, value });
      }
      return value;
    },
  };
}

// ---------------------------------------------------------------------------
// Jooble partner API: POST {apiUrl}{key} with { keywords, location, page }.
// Only the search terms are sent (no visitor IP or user agent). The key is
// part of the URL, so the URL is never logged.
// ---------------------------------------------------------------------------

export interface JoobleOptions {
  apiKey: string;
  apiUrl?: string;
  /** Used when the visitor leaves the location empty, so results stay in Colombia. */
  defaultLocation?: string;
  timeoutMs: number;
  cacheSeconds?: number;
  /** Offers older than this are dropped (Jooble mixes in long-running sponsored ads). Default 60. */
  maxAgeDays?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export function toJoobleJob(raw: unknown): ExternalJob | null {
  if (!isRecord(raw)) return null;
  const title = text(raw.title);
  const url = safeUrl(raw.link);
  if (!title || !url) return null;
  const updated = text(raw.updated);
  const parsedDate = updated ? new Date(updated) : null;
  const company = text(raw.company);
  const location = text(raw.location);
  const type = text(raw.type);
  return {
    id: createHash('sha256').update(url).digest('hex').slice(0, 16),
    title: plainText(title, 160),
    company: company ? plainText(company, 120) : null,
    location: location ? plainText([location, type].filter(Boolean).join(' · '), 120) : type ? plainText(type, 60) : null,
    snippet: plainText(String(raw.snippet ?? '')),
    salary: text(raw.salary) ? plainText(String(raw.salary), 80) : null,
    postedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
    url,
    source: 'jooble',
  };
}

export function createJoobleProvider(options: JoobleOptions): ExternalJobsProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const endpoint = `${options.apiUrl ?? 'https://jooble.org/api/'}${encodeURIComponent(options.apiKey)}`;
  const cache = new Map<string, { expires: number; value: ExternalJobsResult }>();
  const ttlMs = (options.cacheSeconds ?? 0) * 1000;

  return {
    source: { id: 'jooble', name: 'Jooble', url: 'https://co.jooble.org' },
    async search(query) {
      const location = query.location.trim() || options.defaultLocation || '';
      const page = Math.min(Math.max(query.page, 1), 10);
      const key = JSON.stringify([query.q.toLowerCase(), location.toLowerCase(), page]);
      const cached = ttlMs > 0 ? cache.get(key) : undefined;
      if (cached && cached.expires > now()) return cached.value;

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ keywords: query.q, location, page: String(page), ResultOnPage: String(EXTERNAL_PAGE_SIZE) }),
        signal: AbortSignal.timeout(options.timeoutMs),
      });
      // Never include the endpoint in errors: it contains the key.
      if (!response.ok) throw new Error(`jooble responded ${response.status}`);
      const body: unknown = await response.json();
      if (!isRecord(body) || !Array.isArray(body.jobs)) return { items: [], total: 0 };
      const oldest = now() - (options.maxAgeDays ?? 60) * 24 * 60 * 60 * 1000;
      const items = body.jobs
        .map(toJoobleJob)
        .filter((job): job is ExternalJob => job !== null)
        // Undated offers stay; dated ones older than maxAgeDays are stale or sponsored filler.
        .filter((job) => !job.postedAt || Date.parse(job.postedAt) >= oldest)
        .slice(0, EXTERNAL_PAGE_SIZE);
      const total = typeof body.totalCount === 'number' && body.totalCount >= 0 ? body.totalCount : items.length;
      const value = { items, total };
      if (ttlMs > 0) {
        if (cache.size > 500) cache.clear();
        cache.set(key, { expires: now() + ttlMs, value });
      }
      return value;
    },
  };
}

// ---------------------------------------------------------------------------
// Remotive: public remote-jobs feed. Its terms allow at most ~4 fetches a day,
// require naming and linking Remotive, forbid passing the jobs to Google Jobs
// or other boards, and forbid using them to capture sign-ups. So: one cached
// copy refreshed every 6 hours, filtered locally, each offer linking back.
// ---------------------------------------------------------------------------

export const REMOTIVE_ENDPOINT = 'https://remotive.com/api/remote-jobs';
const SIX_HOURS = 6 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE = 30 * 60 * 1000;

/** Locations a candidate in Colombia can apply from. */
const OPEN_TO_COLOMBIA = /(worldwide|anywhere|global|latam|latin america|south america|americas|colombia|no restriction)/i;

const fold = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

interface RemotiveJob extends ExternalJob {
  searchText: string;
}

export function toRemotiveJob(raw: unknown): RemotiveJob | null {
  if (!isRecord(raw)) return null;
  const title = text(raw.title);
  const url = safeUrl(raw.url);
  if (!title || !url) return null;
  const region = text(raw.candidate_required_location) ?? '';
  if (region && !OPEN_TO_COLOMBIA.test(region)) return null;
  const date = text(raw.publication_date);
  const parsedDate = date ? new Date(date) : null;
  const company = text(raw.company_name);
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === 'string') : [];
  return {
    id: createHash('sha256').update(url).digest('hex').slice(0, 16),
    title: plainText(title, 160),
    company: company ? plainText(company, 120) : null,
    location: region ? `Remoto · ${plainText(region, 80)}` : 'Remoto',
    snippet: plainText(String(raw.description ?? '')),
    salary: text(raw.salary) ? plainText(String(raw.salary), 80) : null,
    postedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
    url,
    source: 'remotive',
    searchText: fold([title, company, text(raw.category), ...tags].filter(Boolean).join(' ')),
  };
}

export interface RemotiveOptions {
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  log?: (message: string, meta?: Record<string, unknown>) => void;
}

export function createRemotiveProvider(options: RemotiveOptions = {}): ExternalJobsProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  let jobs: RemotiveJob[] = [];
  let nextFetchAt = 0;
  let inFlight: Promise<void> | null = null;

  const refresh = async () => {
    try {
      const response = await fetchImpl(REMOTIVE_ENDPOINT, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
      });
      if (!response.ok) throw new Error(`remotive responded ${response.status}`);
      const body: unknown = await response.json();
      const list = isRecord(body) && Array.isArray(body.jobs) ? body.jobs : [];
      jobs = list.map(toRemotiveJob).filter((job): job is RemotiveJob => job !== null);
      nextFetchAt = now() + SIX_HOURS;
    } catch (error) {
      // Keep serving the previous copy; do not hammer the feed after a failure.
      nextFetchAt = now() + RETRY_AFTER_FAILURE;
      options.log?.('remotive refresh failed', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  return {
    source: { id: 'remotive', name: 'Remotive', url: 'https://remotive.com' },
    async search(query) {
      if (now() >= nextFetchAt) {
        inFlight ??= refresh().finally(() => {
          inFlight = null;
        });
        // First load waits; later refreshes happen in the background.
        if (!jobs.length) await inFlight;
      }
      const words = fold(query.q).split(/\s+/).filter((word) => word.length > 1);
      const matches = words.length ? jobs.filter((job) => words.every((word) => job.searchText.includes(word))) : jobs;
      const start = (Math.min(Math.max(query.page, 1), 10) - 1) * EXTERNAL_PAGE_SIZE;
      const items = matches.slice(start, start + EXTERNAL_PAGE_SIZE).map(({ searchText: _searchText, ...job }) => job);
      return { items, total: matches.length };
    },
  };
}

/** Runs every enabled feed in parallel; a failing feed only drops its own results. */
export async function searchExternalJobs(
  providers: ExternalJobsProvider[],
  query: ExternalJobsQuery,
  log: (message: string, meta?: Record<string, unknown>) => void,
): Promise<ExternalJobsResponse> {
  const settled = await Promise.allSettled(providers.map((provider) => provider.search(query)));
  const response: ExternalJobsResponse = { enabled: true, sources: [], items: [], total: 0 };
  settled.forEach((result, index) => {
    const provider = providers[index]!;
    if (result.status === 'rejected') {
      log('external jobs search failed', { source: provider.source.id, error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
      return;
    }
    if (result.value.items.length) response.sources.push(provider.source);
    response.items.push(...result.value.items);
    response.total += result.value.total;
  });
  return response;
}
