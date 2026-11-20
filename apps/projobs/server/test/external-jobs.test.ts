import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import {
  CAREERJET_ENDPOINT,
  createCareerjetProvider,
  plainText,
  toExternalJob,
  type ExternalJobsProvider,
  type ExternalJobsQuery,
} from '../src/integrations/externalJobs.js';
import { startTestApi, type TestApi } from './helpers.js';

const CAREERJET_JOB = {
  title: 'Auxiliar contable <b>Bogotá</b>',
  company: 'Comercial Andina S.A.S.',
  date: 'Wed, 18 Nov 2026 10:00:00 GMT',
  description: 'Causación de facturas &amp; conciliaciones.<br/>Experiencia de 1 año.',
  locations: 'Bogotá, Cundinamarca',
  salary: '$1.800.000 - $2.200.000',
  url: 'https://jobviewtrack.com/es-co/job-123',
};

function fakeFetch(body: unknown, status = 200) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), headers: (init?.headers ?? {}) as Record<string, string> });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { impl, calls };
}

const QUERY: ExternalJobsQuery = { q: 'contador', location: 'Bogotá', page: 1, userIp: '203.0.113.7', userAgent: 'Mozilla/5.0 test' };

describe('careerjet mapping', () => {
  it('turns partner HTML into plain text and keeps only http(s) links', () => {
    expect(plainText('<p>Uno &amp; dos&nbsp;<b>tres</b> &#241;</p>')).toBe('Uno & dos tres ñ');
    expect(plainText('a'.repeat(400), 10)).toHaveLength(10);
    const job = toExternalJob(CAREERJET_JOB)!;
    expect(job).toMatchObject({
      title: 'Auxiliar contable Bogotá',
      company: 'Comercial Andina S.A.S.',
      location: 'Bogotá, Cundinamarca',
      snippet: 'Causación de facturas & conciliaciones. Experiencia de 1 año.',
      salary: '$1.800.000 - $2.200.000',
      postedAt: '2026-11-18T10:00:00.000Z',
      url: 'https://jobviewtrack.com/es-co/job-123',
      source: 'careerjet',
    });
    expect(job.id).toMatch(/^[0-9a-f]{16}$/);
    expect(toExternalJob({ ...CAREERJET_JOB, url: 'javascript:alert(1)' })).toBeNull();
    expect(toExternalJob({ ...CAREERJET_JOB, title: '' })).toBeNull();
  });

  it('calls the v4 endpoint with basic auth, the visitor ip/agent and the locale', async () => {
    const { impl, calls } = fakeFetch({ type: 'JOBS', hits: 42, jobs: [CAREERJET_JOB, { title: 'sin enlace' }] });
    const provider = createCareerjetProvider({ apiKey: 'key-123456', locale: 'es_CO', timeoutMs: 1000, fetchImpl: impl });
    const result = await provider.search(QUERY);
    expect(result.total).toBe(42);
    expect(result.items).toHaveLength(1);
    const url = new URL(calls[0]!.url);
    expect(`${url.origin}${url.pathname}`).toBe(CAREERJET_ENDPOINT);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      locale_code: 'es_CO',
      keywords: 'contador',
      location: 'Bogotá',
      user_ip: '203.0.113.7',
      user_agent: 'Mozilla/5.0 test',
      page: '1',
    });
    expect(calls[0]!.headers.Authorization).toBe(`Basic ${Buffer.from('key-123456:').toString('base64')}`);
  });

  it('returns nothing for ambiguous locations and fails on partner errors', async () => {
    const ambiguous = createCareerjetProvider({ apiKey: 'key-123456', locale: 'es_CO', timeoutMs: 1000, fetchImpl: fakeFetch({ type: 'LOCATIONS', locations: [] }).impl });
    expect(await ambiguous.search(QUERY)).toEqual({ items: [], total: 0 });
    const failing = createCareerjetProvider({ apiKey: 'key-123456', locale: 'es_CO', timeoutMs: 1000, fetchImpl: fakeFetch({}, 403).impl });
    await expect(failing.search(QUERY)).rejects.toThrow('403');
  });

  it('caches identical searches only when a TTL is configured', async () => {
    let clock = 0;
    const { impl, calls } = fakeFetch({ type: 'JOBS', hits: 1, jobs: [CAREERJET_JOB] });
    const cached = createCareerjetProvider({ apiKey: 'key-123456', locale: 'es_CO', timeoutMs: 1000, cacheSeconds: 60, fetchImpl: impl, now: () => clock });
    await cached.search(QUERY);
    await cached.search({ ...QUERY, userIp: '198.51.100.1' });
    expect(calls).toHaveLength(1);
    clock = 61_000;
    await cached.search(QUERY);
    expect(calls).toHaveLength(2);

    const uncached = fakeFetch({ type: 'JOBS', hits: 1, jobs: [CAREERJET_JOB] });
    const live = createCareerjetProvider({ apiKey: 'key-123456', locale: 'es_CO', timeoutMs: 1000, fetchImpl: uncached.impl });
    await live.search(QUERY);
    await live.search(QUERY);
    expect(uncached.calls).toHaveLength(2);
  });

  it('stays off unless explicitly enabled with a key', () => {
    const base = { NODE_ENV: 'test' as const };
    expect(loadConfig({ ...base, CAREERJET_API_KEY: 'key-123456' }).externalJobs.enabled).toBe(false);
    expect(loadConfig({ ...base, EXTERNAL_JOBS_ENABLED: 'true' }).externalJobs.enabled).toBe(false);
    expect(loadConfig({ ...base, EXTERNAL_JOBS_ENABLED: 'true', CAREERJET_API_KEY: 'key-123456' }).externalJobs).toMatchObject({ enabled: true, careerjetLocale: 'es_CO', cacheSeconds: 0 });
  });
});

describe('GET /api/external-jobs', () => {
  let off: TestApi;
  let on: TestApi;
  let failing: TestApi;
  const seen: ExternalJobsQuery[] = [];

  const provider = (fail = false): ExternalJobsProvider => ({
    source: { name: 'Careerjet', url: 'https://www.careerjet.com.co' },
    async search(query) {
      seen.push(query);
      if (fail) throw new Error('partner down');
      return { items: [toExternalJob(CAREERJET_JOB)!], total: 1 };
    },
  });

  beforeAll(async () => {
    [off, on, failing] = await Promise.all([
      startTestApi({ seed: false }),
      startTestApi({ seed: false, externalJobs: provider() }),
      startTestApi({ seed: false, externalJobs: provider(true) }),
    ]);
  });
  afterAll(async () => {
    await Promise.all([off.close(), on.close(), failing.close()]);
  });

  it('reports the integration as disabled when no provider is configured', async () => {
    const response = await off.request('/api/external-jobs?q=contador');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: false, source: null, items: [], total: 0 });
  });

  it('forwards the search with the visitor user agent and returns attributed results', async () => {
    const response = await on.request('/api/external-jobs?q=contador&location=Bogot%C3%A1&page=2', { headers: { 'user-agent': 'TestBrowser/1.0' } });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ enabled: true, source: { name: 'Careerjet' }, total: 1 });
    expect(response.body.items[0]).toMatchObject({ title: 'Auxiliar contable Bogotá', source: 'careerjet' });
    expect(seen.at(-1)).toMatchObject({ q: 'contador', location: 'Bogotá', page: 2, userAgent: 'TestBrowser/1.0' });
    expect(seen.at(-1)!.userIp).not.toBe('');
  });

  it('rejects invalid pages and degrades to an empty list when the partner fails', async () => {
    expect((await on.request('/api/external-jobs?page=50')).status).toBe(400);
    const response = await failing.request('/api/external-jobs?q=contador');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ enabled: true, items: [], total: 0 });
  });
});
