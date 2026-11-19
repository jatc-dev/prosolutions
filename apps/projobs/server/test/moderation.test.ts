import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INTERNAL_TOKEN, startTestApi, tokenFor, type TestApi } from './helpers.js';

const ANA = tokenFor('ana');
const internal = { Authorization: `Bearer ${INTERNAL_TOKEN}` };

describe('ProAdmin moderation', () => {
  let api: TestApi;
  let jobId = '';

  beforeAll(async () => {
    api = await startTestApi({ internalToken: true });
    const job = await api.request('/api/jobs/asesor-credito-senior-andes');
    jobId = job.body.job.id;
  });
  afterAll(async () => {
    await api.close();
  });

  it('accepts public reports and lists them for review', async () => {
    const invalid = await api.request(`/api/jobs/${jobId}/reports`, { method: 'POST', body: { reason: 'aburrida' } });
    expect(invalid.status).toBe(400);
    const anonymous = await api.request(`/api/jobs/${jobId}/reports`, { method: 'POST', body: { reason: 'fraude', details: 'Piden dinero para la entrevista' } });
    expect(anonymous.status).toBe(201);
    await api.request(`/api/jobs/${jobId}/reports`, { method: 'POST', token: ANA, body: { reason: 'informacion-falsa' } });

    const queue = await api.request('/internal/jobs/moderation?filter=reported', { headers: internal });
    expect(queue.status).toBe(200);
    const item = queue.body.jobs.find((job: any) => job.id === jobId);
    expect(item).toMatchObject({ openReports: 2, moderationStatus: 'ok' });
    expect(item.reasons.sort()).toEqual(['fraude', 'informacion-falsa']);

    expect((await api.request('/internal/jobs/moderation')).status).toBe(401);
  });

  it('pausing hides a job from search, detail, sitemap and applications; restoring brings it back', async () => {
    const paused = await api.request(`/internal/jobs/${jobId}/moderation`, { method: 'POST', headers: internal, body: { action: 'pause', note: 'Posible fraude' } });
    expect(paused.body.job.moderationStatus).toBe('paused');

    expect((await api.request(`/api/jobs/${jobId}`)).status).toBe(404);
    const search = await api.request('/api/jobs?q=asesor');
    expect(search.body.items.map((job: any) => job.id)).not.toContain(jobId);
    const sitemap = await (await fetch(`${api.url}/api/sitemap.xml`)).text();
    expect(sitemap).not.toContain('asesor-credito-senior-andes');
    const apply = await api.request(`/api/jobs/${jobId}/applications`, { method: 'POST', token: ANA, body: { consentToShare: true, cvId: 'cv-1' } });
    expect(apply.status).not.toBe(201);

    const restored = await api.request(`/internal/jobs/${jobId}/moderation`, { method: 'POST', headers: internal, body: { action: 'restore' } });
    expect(restored.body.job.moderationStatus).toBe('ok');
    expect((await api.request(`/api/jobs/${jobId}`)).status).toBe(200);
    const queue = await api.request('/internal/jobs/moderation?filter=reported', { headers: internal });
    expect(queue.body.jobs.find((job: any) => job.id === jobId)).toBeUndefined();
  });

  it('suspending a company hides all its jobs and blocks publishing', async () => {
    const companies = await api.request('/internal/companies?status=all', { headers: internal });
    const andes = companies.body.companies.find((company: any) => company.slug === 'banco-andes');
    expect(andes.publishedJobs).toBeGreaterThan(0);

    const suspend = await api.request(`/internal/companies/${andes.id}/verification`, { method: 'POST', headers: internal, body: { status: 'suspended', note: 'Denuncias reiteradas' } });
    expect(suspend.body.company.verificationStatus).toBe('suspended');

    const search = await api.request('/api/jobs?q=andes');
    expect(search.body.total).toBe(0);
    expect((await api.request(`/api/jobs/${jobId}`)).status).toBe(404);

    const pending = await api.request('/internal/companies?status=suspended', { headers: internal });
    expect(pending.body.companies.map((company: any) => company.slug)).toEqual(['banco-andes']);

    await api.request(`/internal/companies/${andes.id}/verification`, { method: 'POST', headers: internal, body: { status: 'verified' } });
    expect((await api.request(`/api/jobs/${jobId}`)).status).toBe(200);
  });
});
