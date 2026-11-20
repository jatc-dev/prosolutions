import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import {
  CAREERJET_ENDPOINT,
  REMOTIVE_ENDPOINT,
  createCareerjetProvider,
  createJoobleProvider,
  createRemotiveProvider,
  searchExternalJobs,
  toJoobleJob,
  toRemotiveJob,
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

  it('keeps every feed off unless explicitly enabled (Careerjet also needs its key)', () => {
    const base = { NODE_ENV: 'test' as const };
    expect(loadConfig({ ...base, CAREERJET_API_KEY: 'key-123456' }).externalJobs).toMatchObject({ careerjet: { enabled: false }, remotiveEnabled: false });
    expect(loadConfig({ ...base, CAREERJET_ENABLED: 'true' }).externalJobs.careerjet.enabled).toBe(false);
    expect(loadConfig({ ...base, CAREERJET_ENABLED: 'true', CAREERJET_API_KEY: 'key-123456' }).externalJobs).toMatchObject({ careerjet: { enabled: true, locale: 'es_CO' }, cacheSeconds: 0 });
    expect(loadConfig({ ...base, REMOTIVE_ENABLED: 'true' }).externalJobs).toMatchObject({ remotiveEnabled: true, careerjet: { enabled: false } });
  });
});

const remotiveJob = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  url: 'https://remotive.com/remote-jobs/customer-support/agente-soporte-1',
  title: 'Agente de soporte al cliente',
  company_name: 'Acme',
  category: 'Customer Service',
  tags: ['soporte', 'español'],
  publication_date: '2026-11-18T09:00:00',
  candidate_required_location: 'LATAM',
  salary: '$1,200 - $1,500',
  description: '<p>Atención por <b>chat</b> y correo.</p>',
  ...overrides,
});

describe('remotive feed', () => {
  it('keeps only offers open to Colombia and maps them as remote', () => {
    expect(toRemotiveJob(remotiveJob())).toMatchObject({ title: 'Agente de soporte al cliente', location: 'Remoto · LATAM', snippet: 'Atención por chat y correo.', source: 'remotive' });
    expect(toRemotiveJob(remotiveJob({ candidate_required_location: 'Worldwide' }))).not.toBeNull();
    expect(toRemotiveJob(remotiveJob({ candidate_required_location: 'USA Only' }))).toBeNull();
    expect(toRemotiveJob(remotiveJob({ candidate_required_location: 'Europe' }))).toBeNull();
    expect(toRemotiveJob(remotiveJob({ url: 'ftp://x' }))).toBeNull();
  });

  it('fetches at most once per 6 hours, filters by keywords (accents aside) and paginates', async () => {
    let clock = 0;
    const many = Array.from({ length: 23 }, (_, i) => remotiveJob({ id: i, url: `https://remotive.com/remote-jobs/x/${i}`, title: i < 15 ? `Soporte técnico ${i}` : `Diseñador ${i}` }));
    const { impl, calls } = fakeFetch({ jobs: many });
    const provider = createRemotiveProvider({ fetchImpl: impl, now: () => clock });
    const all = await provider.search({ ...QUERY, q: '', page: 1 });
    expect(all.total).toBe(23);
    expect(all.items).toHaveLength(10);
    const tecnico = await provider.search({ ...QUERY, q: 'TECNICO', page: 2 });
    expect(tecnico.total).toBe(15);
    expect(tecnico.items).toHaveLength(5);
    expect(tecnico.items[0]).not.toHaveProperty('searchText');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(REMOTIVE_ENDPOINT);
    clock = 6 * 60 * 60 * 1000;
    await provider.search({ ...QUERY, q: '' });
    expect(calls).toHaveLength(2);
  });

  it('keeps the last good copy when a refresh fails and waits before retrying', async () => {
    let clock = 0;
    let fail = false;
    let count = 0;
    const impl = (async () => {
      count += 1;
      if (fail) return new Response('{}', { status: 500 });
      return new Response(JSON.stringify({ jobs: [remotiveJob()] }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    const provider = createRemotiveProvider({ fetchImpl: impl, now: () => clock });
    expect((await provider.search(QUERY)).items).toHaveLength(0); // "contador" does not match
    expect((await provider.search({ ...QUERY, q: 'soporte' })).total).toBe(1);
    fail = true;
    clock = 7 * 60 * 60 * 1000;
    await provider.search({ ...QUERY, q: 'soporte' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((await provider.search({ ...QUERY, q: 'soporte' })).total).toBe(1);
    expect(count).toBe(2);
  });

  it('combines feeds and drops only the failing one', async () => {
    const ok: ExternalJobsProvider = { source: { id: 'remotive', name: 'Remotive', url: 'https://remotive.com' }, search: async () => ({ items: [toRemotiveJob(remotiveJob())!], total: 1 }) };
    const broken: ExternalJobsProvider = { source: { id: 'careerjet', name: 'Careerjet', url: 'https://www.careerjet.com.co' }, search: async () => { throw new Error('down'); } };
    const logs: string[] = [];
    const result = await searchExternalJobs([broken, ok], QUERY, (message) => logs.push(message));
    expect(result).toMatchObject({ enabled: true, total: 1, sources: [{ id: 'remotive' }] });
    expect(logs).toEqual(['external jobs search failed']);
  });
});

const JOOBLE_JOB = {
  title: 'Auxiliar <b>administrativo</b>',
  location: 'Bogotá, Cundinamarca',
  snippet: '&nbsp;...Apoyo en <b>facturación</b> y archivo...&nbsp;',
  salary: '$1.900.000',
  source: 'elempleo.com',
  type: 'Tiempo completo',
  link: 'https://co.jooble.org/desc/123456789',
  company: 'Servicios Integrales',
  updated: '2026-11-18T08:30:00.0000000',
  id: 123456789,
};

describe('jooble feed', () => {
  it('maps offers and keeps only http(s) links', () => {
    expect(toJoobleJob(JOOBLE_JOB)).toMatchObject({
      title: 'Auxiliar administrativo',
      company: 'Servicios Integrales',
      location: 'Bogotá, Cundinamarca · Tiempo completo',
      snippet: '...Apoyo en facturación y archivo...',
      salary: '$1.900.000',
      url: 'https://co.jooble.org/desc/123456789',
      source: 'jooble',
    });
    expect(toJoobleJob({ ...JOOBLE_JOB, link: 'javascript:alert(1)' })).toBeNull();
  });

  it('posts only the search terms, defaults the location to Colombia and never leaks the key', async () => {
    const { impl, calls } = fakeFetch({ totalCount: 321, jobs: [JOOBLE_JOB] });
    const bodies: unknown[] = [];
    const recording = (async (input: string | URL | Request, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      expect(init?.method).toBe('POST');
      return impl(input, init);
    }) as typeof fetch;
    const provider = createJoobleProvider({ apiKey: 'secret-key-1234', timeoutMs: 1000, defaultLocation: 'Colombia', fetchImpl: recording });
    const result = await provider.search({ ...QUERY, location: '' });
    expect(result.total).toBe(321);
    expect(calls[0]!.url).toBe('https://jooble.org/api/secret-key-1234');
    expect(bodies[0]).toEqual({ keywords: 'contador', location: 'Colombia', page: '1', ResultOnPage: '10' });
    // Visitor data is not part of the request.
    expect(JSON.stringify(bodies[0])).not.toContain('203.0.113.7');

    const failing = createJoobleProvider({ apiKey: 'secret-key-1234', timeoutMs: 1000, fetchImpl: fakeFetch({}, 403).impl });
    await expect(failing.search(QUERY)).rejects.toThrow(/^jooble responded 403$/);
  });

  it('is off unless enabled with a key', () => {
    const base = { NODE_ENV: 'test' as const };
    expect(loadConfig({ ...base, JOOBLE_API_KEY: 'secret-key-1234' }).externalJobs.jooble.enabled).toBe(false);
    expect(loadConfig({ ...base, JOOBLE_ENABLED: 'true' }).externalJobs.jooble.enabled).toBe(false);
    expect(loadConfig({ ...base, JOOBLE_ENABLED: 'true', JOOBLE_API_KEY: 'secret-key-1234' }).externalJobs.jooble).toMatchObject({ enabled: true, apiUrl: 'https://jooble.org/api/', defaultLocation: 'Colombia' });
  });
});

describe('GET /api/external-jobs', () => {
  let off: TestApi;
  let on: TestApi;
  let failing: TestApi;
  const seen: ExternalJobsQuery[] = [];

  const provider = (fail = false): ExternalJobsProvider => ({
    source: { id: 'careerjet', name: 'Careerjet', url: 'https://www.careerjet.com.co' },
    async search(query) {
      seen.push(query);
      if (fail) throw new Error('partner down');
      return { items: [toExternalJob(CAREERJET_JOB)!], total: 1 };
    },
  });

  beforeAll(async () => {
    [off, on, failing] = await Promise.all([
      startTestApi({ seed: false }),
      startTestApi({ seed: false, externalJobs: [provider()] }),
      startTestApi({ seed: false, externalJobs: [provider(true)] }),
    ]);
  });
  afterAll(async () => {
    await Promise.all([off.close(), on.close(), failing.close()]);
  });

  it('reports the integration as disabled when no provider is configured', async () => {
    const response = await off.request('/api/external-jobs?q=contador');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: false, sources: [], items: [], total: 0 });
  });

  it('forwards the search with the visitor user agent and returns attributed results', async () => {
    const response = await on.request('/api/external-jobs?q=contador&location=Bogot%C3%A1&page=2', { headers: { 'user-agent': 'TestBrowser/1.0' } });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ enabled: true, sources: [{ id: 'careerjet', name: 'Careerjet' }], total: 1 });
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
