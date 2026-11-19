import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from '../src/db/migrate.js';
import { INTERNAL_TOKEN, startTestApi, tokenFor, type TestApi } from './helpers.js';

const ANA = tokenFor('ana');
const BRUNO = tokenFor('bruno');
const RECRUITER = tokenFor('rita', ['PROCV', 'PROJOBS', 'PRORECRUIT']);
const OTHER_RECRUITER = tokenFor('omar', ['PROJOBS', 'PRORECRUIT']);

let api: TestApi;

beforeAll(async () => {
  api = await startTestApi({ internalToken: true });
});
afterAll(async () => {
  await api?.close();
});

describe('health and migrations', () => {
  it('reports database status', async () => {
    const res = await api.request('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'OK', database: 'CONNECTED', version: 2 });
  });

  it('migrations are idempotent', async () => {
    const report = await runMigrations(api.db);
    expect(report.applied).toEqual([]);
    expect(report.skipped).toContain('001_projobs_v2.sql');
  });
});

describe('public job search', () => {
  it('lists published jobs with facets, newest first', async () => {
    const res = await api.request('/api/jobs?sort=recent');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(10);
    expect(res.body.items).toHaveLength(10);
    expect(res.body.items[0].slug).toBe('asesor-credito-senior-andes');
    expect(res.body.facets.workplace.map((f: any) => f.value).sort()).toEqual(['hybrid', 'onsite', 'remote']);
    expect(res.body.facets.skills.length).toBeGreaterThan(5);
    expect(res.body.items[0].viewer).toBeUndefined();
  });

  it('supports instant prefix search, accent-insensitive', async () => {
    const prefix = await api.request('/api/jobs?q=aseso');
    expect(prefix.body.items.map((j: any) => j.slug)).toEqual(
      expect.arrayContaining(['asesor-credito-senior-andes', 'asesor-comercial-junior-cobalto']),
    );
    const accents = await api.request(`/api/jobs?q=${encodeURIComponent('pasantía')}`);
    expect(accents.body.items.map((j: any) => j.slug)).toEqual(['pasantia-logistica-verde']);
    const byCompany = await api.request('/api/jobs?q=cobalto');
    expect(byCompany.body.total).toBe(3);
  });

  it('combines structured filters', async () => {
    const res = await api.request('/api/jobs?workplace=remote&skills=Excel&seniority=senior,mid');
    const slugs = res.body.items.map((j: any) => j.slug).sort();
    expect(slugs).toEqual(['asesor-credito-senior-andes', 'ejecutivo-cobranza-andes']);

    const salary = await api.request('/api/jobs?salaryMin=100000&country=MX');
    expect(salary.body.items.map((j: any) => j.slug)).toEqual(['gerente-regional-tiendas-cobalto']);

    // Seeded 1 and 2 days ago; the job seeded exactly 3 days ago sits just outside the window.
    const recent = await api.request('/api/jobs?postedWithin=3&sort=recent');
    expect(recent.body.items.map((j: any) => j.slug)).toEqual(['asesor-credito-senior-andes', 'auxiliar-enfermeria-nodo']);
  });

  it('ranks by candidate skill affinity and returns match details', async () => {
    const res = await api.request('/api/jobs?sort=match&mySkills=credito,negociacion,excel,ventas&pageSize=3');
    expect(res.body.items[0].slug).toBe('asesor-credito-senior-andes');
    expect(res.body.items[0].match).toEqual({
      score: 80,
      matchedSkills: ['credito', 'negociacion', 'excel', 'ventas'],
      missingSkills: ['cartera'],
    });
    expect(res.body.items).toHaveLength(3);
  });

  it('paginates and validates query params', async () => {
    const page2 = await api.request('/api/jobs?sort=recent&pageSize=4&page=2');
    expect(page2.body.items).toHaveLength(4);
    expect(page2.body.page).toBe(2);
    const invalid = await api.request('/api/jobs?workplace=moon');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('bad_request');
  });

  it('returns job detail with similar jobs and company profile', async () => {
    const res = await api.request('/api/jobs/analista-riesgo-andes');
    expect(res.status).toBe(200);
    expect(res.body.job.companyProfile.name).toBe('Banco Andes');
    expect(res.body.job.requirements.length).toBeGreaterThan(0);
    expect(res.body.similar.length).toBeGreaterThan(0);
    expect((await api.request('/api/jobs/does-not-exist')).status).toBe(404);
    expect((await api.request('/api/companies/banco-andes')).body.jobs).toHaveLength(3);
  });
});

describe('authentication via ProIdentity tokens', () => {
  it('rejects missing, forged and wrong-issuer tokens', async () => {
    expect((await api.request('/api/me/applications')).status).toBe(401);
    expect((await api.request('/api/me/applications', { token: `${ANA}x` })).status).toBe(401);
    const wrongIssuer = tokenFor('ana', ['PROJOBS'], { issuer: 'https://evil.example' });
    expect((await api.request('/api/me/applications', { token: wrongIssuer })).status).toBe(401);
  });

  it('requires the PROJOBS module for candidate features', async () => {
    const noModule = tokenFor('carla', ['PROCV']);
    const res = await api.request('/api/me/applications', { token: noModule });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('module_required');
  });

  it('exposes session capabilities derived from modules', async () => {
    const candidate = await api.request('/api/me', { token: ANA });
    expect(candidate.body).toMatchObject({ userId: 'ana', isCandidate: true, isRecruiter: false, companies: [] });
    const recruiter = await api.request('/api/me', { token: RECRUITER });
    expect(recruiter.body.isRecruiter).toBe(true);
  });
});

describe('employer workflow, applications and pipeline', () => {
  let companyId = '';
  let jobId = '';
  let applicationId = '';

  it('requires PRORECRUIT for the employer API', async () => {
    const res = await api.request('/api/employer/companies', { token: ANA });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('recruiter_required');
  });

  it('creates a company and a draft job hidden from the public catalog', async () => {
    const company = await api.request('/api/employer/companies', {
      method: 'POST',
      token: RECRUITER,
      body: { name: 'Talento Ágil', industry: 'Software', sizeRange: '11-50', website: 'https://talento.example' },
    });
    expect(company.status).toBe(201);
    expect(company.body.company).toMatchObject({ slug: 'talento-agil', role: 'owner' });
    companyId = company.body.company.id;

    const job = await api.request('/api/employer/jobs', {
      method: 'POST',
      token: RECRUITER,
      body: {
        companyId,
        title: 'React Developer',
        summary: 'Construye el portal de candidatos',
        description: 'Buscamos una persona con experiencia en React y TypeScript para construir productos de talento.',
        requirements: ['3 años con React'],
        skills: ['React', 'TypeScript', 'GraphQL', 'CSS'],
        employmentType: 'full_time',
        workplace: 'remote',
        seniority: 'mid',
        salaryMin: 3000,
        salaryMax: 4000,
        salaryCurrency: 'usd',
        salaryPeriod: 'month',
      },
    });
    expect(job.status).toBe(201);
    expect(job.body.job).toMatchObject({ status: 'draft', skills: ['react', 'typescript', 'graphql', 'css'] });
    jobId = job.body.job.id;

    expect((await api.request(`/api/jobs/${jobId}`)).status).toBe(404);
    const otherCompany = await api.request('/api/employer/jobs', {
      method: 'POST',
      token: OTHER_RECRUITER,
      body: { ...job.body.job, companyId, description: 'x'.repeat(60) },
    });
    expect(otherCompany.status).toBe(403);
  });

  it('validates job input', async () => {
    const res = await api.request('/api/employer/jobs', {
      method: 'POST',
      token: RECRUITER,
      body: { companyId, title: 'X', description: 'd', employmentType: 'full_time', workplace: 'onsite', seniority: 'mid', salaryMin: 10, salaryMax: 5 },
    });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((issue: any) => issue.path);
    expect(paths).toEqual(expect.arrayContaining(['title', 'salaryMax', 'salaryCurrency', 'locationCity']));
  });

  it('publishes the job and emits an integration event', async () => {
    const res = await api.request(`/api/employer/jobs/${jobId}/publish`, { method: 'POST', token: RECRUITER });
    expect(res.status).toBe(200);
    expect(res.body.job.status).toBe('published');
    expect((await api.request(`/api/jobs/${jobId}`)).status).toBe(200);
  });

  it('lets a candidate apply in one click with a ProCV CV', async () => {
    const preview = await api.request(`/api/jobs/${jobId}/match?cvId=cv-1`, { token: ANA });
    expect(preview.body.match).toEqual({ score: 75, matchedSkills: ['react', 'typescript', 'css'], missingSkills: ['graphql'] });

    const res = await api.request(`/api/jobs/${jobId}/applications`, {
      method: 'POST',
      token: ANA,
      body: { consentToShare: true, cvId: 'cv-1', coverLetter: 'Me encantaría sumarme.' },
    });
    expect(res.status).toBe(201);
    expect(res.body.match.score).toBe(75);
    applicationId = res.body.id;

    const duplicate = await api.request(`/api/jobs/${jobId}/applications`, { method: 'POST', token: ANA, body: { consentToShare: true, cvId: 'cv-1' } });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('already_applied');

    const missingCv = await api.request(`/api/jobs/${jobId}/applications`, { method: 'POST', token: BRUNO, body: { consentToShare: true, cvId: 'cv-404' } });
    expect(missingCv.status).toBe(404);
  });

  it('accepts a manual profile when the candidate has no CV', async () => {
    const res = await api.request(`/api/jobs/${jobId}/applications`, {
      method: 'POST',
      token: BRUNO,
      body: { consentToShare: true, profile: { fullName: 'Bruno Díaz', skills: ['GraphQL', 'Go'] } },
    });
    expect(res.status).toBe(201);
    expect(res.body.match).toEqual({ score: 25, matchedSkills: ['graphql'], missingSkills: ['react', 'typescript', 'css'] });
    const both = await api.request(`/api/jobs/${jobId}/applications`, {
      method: 'POST',
      token: BRUNO,
      body: { consentToShare: true, cvId: 'cv-1', profile: { fullName: 'Bruno' } },
    });
    expect(both.status).toBe(400);
  });

  it('marks applied and saved state for the signed-in candidate', async () => {
    expect((await api.request(`/api/me/saved-jobs/${jobId}`, { method: 'PUT', token: ANA })).status).toBe(204);
    const res = await api.request(`/api/jobs/${jobId}`, { token: ANA });
    expect(res.body.job.viewer).toEqual({ saved: true, applied: true });
    const saved = await api.request('/api/me/saved-jobs', { token: ANA });
    expect(saved.body.jobs.map((j: any) => j.id)).toEqual([jobId]);
    expect((await api.request(`/api/me/saved-jobs/${jobId}`, { method: 'DELETE', token: ANA })).status).toBe(204);
    expect((await api.request('/api/me/saved-jobs', { token: ANA })).body.jobs).toEqual([]);
  });

  it('shows the pipeline only to members of the hiring company (RLS)', async () => {
    const pipeline = await api.request(`/api/employer/jobs/${jobId}/applications`, { token: RECRUITER });
    expect(pipeline.status).toBe(200);
    expect(pipeline.body.applications).toHaveLength(2);
    expect(pipeline.body.applications[0]).toMatchObject({
      stage: 'applied',
      source: 'procv',
      candidate: { fullName: 'Ana Pérez', email: 'ana@example.com' },
      coverLetter: 'Me encantaría sumarme.',
    });

    expect((await api.request(`/api/employer/jobs/${jobId}/applications`, { token: OTHER_RECRUITER })).status).toBe(404);
    const hijack = await api.request(`/api/employer/applications/${applicationId}`, {
      method: 'PATCH',
      token: OTHER_RECRUITER,
      body: { stage: 'rejected' },
    });
    expect(hijack.status).toBe(404);

    // Direct database check: under the runtime role a different candidate sees nothing.
    const leaked = await api.db.withContext({ userId: 'bruno' }, (tx) =>
      tx.query('SELECT id FROM public.applications WHERE id = $1', [applicationId]),
    );
    expect(leaked.rows).toEqual([]);
  });

  it('moves candidates through stages and records the timeline', async () => {
    const move = await api.request(`/api/employer/applications/${applicationId}`, {
      method: 'PATCH',
      token: RECRUITER,
      body: { stage: 'interview', note: 'Entrevista técnica el lunes' },
    });
    expect(move.status).toBe(204);

    const mine = await api.request('/api/me/applications', { token: ANA });
    expect(mine.body.applications).toHaveLength(1);
    const application = mine.body.applications[0];
    expect(application.stage).toBe('interview');
    expect(application.job.id).toBe(jobId);
    expect(application.timeline.map((e: any) => [e.fromStage, e.toStage, e.actorType])).toEqual([
      [null, 'applied', 'candidate'],
      ['applied', 'interview', 'recruiter'],
    ]);

    const jobs = await api.request(`/api/employer/jobs?companyId=${companyId}`, { token: RECRUITER });
    expect(jobs.body.jobs[0]).toMatchObject({ applicants: 2, stageCounts: { applied: 1, interview: 1 } });
  });

  it('lets candidates withdraw and blocks further recruiter moves', async () => {
    expect((await api.request(`/api/me/applications/${applicationId}/withdraw`, { method: 'POST', token: ANA })).status).toBe(204);
    const again = await api.request(`/api/me/applications/${applicationId}/withdraw`, { method: 'POST', token: ANA });
    expect(again.body.error.code).toBe('application_closed');
    const move = await api.request(`/api/employer/applications/${applicationId}`, {
      method: 'PATCH',
      token: RECRUITER,
      body: { stage: 'offer' },
    });
    expect(move.status).toBe(409);
    expect((await api.request(`/api/me/applications/${applicationId}/withdraw`, { method: 'POST', token: BRUNO })).status).toBe(404);
  });

  it('closes the job and rejects new applications', async () => {
    expect((await api.request(`/api/employer/jobs/${jobId}/close`, { method: 'POST', token: RECRUITER })).body.job.status).toBe('closed');
    const res = await api.request(`/api/jobs/${jobId}/applications`, {
      method: 'POST',
      token: tokenFor('dana'),
      body: { consentToShare: true, profile: { fullName: 'Dana' } },
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('job_not_open');
  });

  it('publishes integration events through the internal outbox API', async () => {
    expect((await api.request('/internal/events')).status).toBe(401);
    const res = await api.request('/internal/events?after=0', { headers: { Authorization: `Bearer ${INTERNAL_TOKEN}` } });
    expect(res.status).toBe(200);
    const types = res.body.events.map((e: any) => e.type);
    expect(types).toEqual([
      'projobs.job.published',
      'projobs.application.submitted',
      'projobs.application.submitted',
      'projobs.application.stage_changed',
      'projobs.application.withdrawn',
      'projobs.job.closed',
    ]);
    expect(res.body.events[1].payload).toMatchObject({ jobId, candidateId: 'ana', source: 'procv', matchScore: 75 });
    const next = await api.request(`/internal/events?after=${res.body.nextCursor}`, {
      headers: { Authorization: `Bearer ${INTERNAL_TOKEN}` },
    });
    expect(next.body.events).toEqual([]);
  });
});
