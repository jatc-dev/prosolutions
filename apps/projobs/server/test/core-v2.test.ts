import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { decideVerification } from '../src/domain/companyVerification.js';
import { createMemoryMailer } from '../src/notifications/mailer.js';
import { deliverDueAlerts, deliverPendingEvents, messagesForEvent } from '../src/notifications/worker.js';
import { INTERNAL_TOKEN, JWT, startTestApi, tokenFor, type TestApi } from './helpers.js';

function tokenWithEmail(userId: string, email: string, modules: string[] = ['PROCV', 'PROJOBS']) {
  return jwt.sign({ email, role: 'user', modules, token_use: 'access' }, JWT.secret, {
    subject: userId,
    issuer: JWT.issuer,
    audience: JWT.audience,
    expiresIn: '15m',
  });
}

const ANA = tokenFor('ana');
const CARLA = tokenWithEmail('carla', 'carla@acme-logistica.co');
const DARIO = tokenWithEmail('dario', 'dario.empresa@gmail.com');

const JOB_BODY = {
  title: 'Auxiliar de Bodega',
  summary: 'Recepción y despacho de mercancía',
  description: 'Buscamos una persona organizada para recibir, almacenar y despachar mercancía en nuestra bodega principal.',
  requirements: ['Bachillerato'],
  skills: ['inventarios', 'montacargas'],
  employmentType: 'full_time',
  workplace: 'onsite',
  seniority: 'junior',
  locationCity: 'Bogotá',
  locationCountry: 'CO',
};

describe('company verification decision', () => {
  it('verifies corporate emails on the company website domain only', () => {
    expect(decideVerification({ email: 'ana@acme.co', website: 'https://www.acme.co', grantedRecruiter: false })).toEqual({ status: 'verified', method: 'email_domain' });
    expect(decideVerification({ email: 'ana@rrhh.acme.co', website: 'https://acme.co', grantedRecruiter: false }).status).toBe('verified');
    expect(decideVerification({ email: 'ana@gmail.com', website: 'https://gmail.com', grantedRecruiter: false }).status).toBe('pending');
    expect(decideVerification({ email: 'ana@otra.co', website: 'https://acme.co', grantedRecruiter: false }).status).toBe('pending');
    expect(decideVerification({ email: 'ana@acme.co', website: null, grantedRecruiter: false }).status).toBe('pending');
    expect(decideVerification({ email: null, website: null, grantedRecruiter: true })).toEqual({ status: 'verified', method: 'manual' });
  });
});

describe('ProJobs core v2 flows', () => {
  let api: TestApi;
  let carlaJobId = '';
  let darioCompanyId = '';

  beforeAll(async () => {
    api = await startTestApi({ internalToken: true });
  });
  afterAll(async () => {
    await api.close();
  });

  it('lets any signed-in user onboard a company; corporate domains are verified automatically', async () => {
    const carla = await api.request('/api/employer/companies', {
      method: 'POST', token: CARLA, body: { name: 'Acme Logística', website: 'https://www.acme-logistica.co' },
    });
    expect(carla.status).toBe(201);
    expect(carla.body.company).toMatchObject({ verified: true, verificationStatus: 'verified', role: 'owner' });

    const dario = await api.request('/api/employer/companies', {
      method: 'POST', token: DARIO, body: { name: 'Panadería Dario', website: 'https://panaderiadario.co' },
    });
    expect(dario.body.company).toMatchObject({ verified: false, verificationStatus: 'pending' });
    darioCompanyId = dario.body.company.id;

    const session = await api.request('/api/me', { token: DARIO });
    expect(session.body).toMatchObject({ isRecruiter: true });
    expect(session.body.companies).toHaveLength(1);
  });

  it('caps published jobs of unverified companies until an administrator verifies them', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const job = await api.request('/api/employer/jobs', {
        method: 'POST', token: DARIO, body: { ...JOB_BODY, companyId: darioCompanyId, title: `Panadero ${i + 1}` },
      });
      expect(job.status).toBe(201);
      ids.push(job.body.job.id);
    }
    for (const id of ids.slice(0, 3)) {
      expect((await api.request(`/api/employer/jobs/${id}/publish`, { method: 'POST', token: DARIO })).status).toBe(200);
    }
    const blocked = await api.request(`/api/employer/jobs/${ids[3]}/publish`, { method: 'POST', token: DARIO });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('verification_pending_limit');

    const publicJob = await api.request(`/api/jobs/${ids[0]}`);
    expect(publicJob.body.job.company.verified).toBe(false);

    const verify = await api.request(`/internal/companies/${darioCompanyId}/verification`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${INTERNAL_TOKEN}` },
      body: { status: 'verified', note: 'NIT validado' },
    });
    expect(verify.body.company.verificationStatus).toBe('verified');
    expect((await api.request(`/api/employer/jobs/${ids[3]}/publish`, { method: 'POST', token: DARIO })).status).toBe(200);
  });

  it('requires explicit consent to share the CV when applying', async () => {
    const job = await api.request('/api/employer/jobs', { method: 'POST', token: CARLA, body: { ...JOB_BODY, companyId: (await api.request('/api/employer/companies', { token: CARLA })).body.companies[0].id } });
    carlaJobId = job.body.job.id;
    await api.request(`/api/employer/jobs/${carlaJobId}/publish`, { method: 'POST', token: CARLA });

    const withoutConsent = await api.request(`/api/jobs/${carlaJobId}/applications`, { method: 'POST', token: ANA, body: { cvId: 'cv-1' } });
    expect(withoutConsent.status).toBe(400);
    const applied = await api.request(`/api/jobs/${carlaJobId}/applications`, {
      method: 'POST', token: ANA, body: { consentToShare: true, cvId: 'cv-1' },
    });
    expect(applied.status).toBe(201);
  });

  it('emails the candidate and the recruiters from the outbox, then on stage changes', async () => {
    const mailer = createMemoryMailer();
    const deps = { db: api.db, mailer, log: () => undefined, webUrl: 'https://projobs.test', apiUrl: 'https://api.test' };
    expect(await deliverPendingEvents(deps)).toBeGreaterThan(0);
    const recipients = mailer.sent.map((message) => message.to);
    expect(recipients).toEqual(expect.arrayContaining(['ana@example.com', 'carla@acme-logistica.co']));
    expect(mailer.sent.find((m) => m.to === 'ana@example.com')!.subject).toContain('Auxiliar de Bodega');

    // Delivered once: a second pass finds nothing new.
    mailer.sent.length = 0;
    await deliverPendingEvents(deps);
    expect(mailer.sent).toHaveLength(0);

    const pipeline = await api.request(`/api/employer/jobs/${carlaJobId}/applications`, { token: CARLA });
    const applicationId = pipeline.body.applications[0].id;
    await api.request(`/api/employer/applications/${applicationId}`, { method: 'PATCH', token: CARLA, body: { stage: 'interview' } });
    await deliverPendingEvents(deps);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]).toMatchObject({ to: 'ana@example.com' });
    expect(mailer.sent[0]!.subject).toContain('Entrevista');
    expect(mailer.sent[0]!.html).not.toContain('<script');
  });

  it('escapes user-controlled values in email HTML', () => {
    const [message] = messagesForEvent(
      'projobs.application.submitted',
      { candidateEmail: 'x@y.co', candidateName: '<img src=x onerror=alert(1)>', jobTitle: '<b>Job</b>', companyName: 'C' },
      'https://projobs.test',
    );
    expect(message!.html).toContain('&lt;b&gt;Job&lt;/b&gt;');
    expect(message!.html).not.toContain('<img src=x');
  });

  it('stores job alerts, delivers matching new jobs and unsubscribes with one click', async () => {
    const created = await api.request('/api/me/alerts', {
      method: 'POST', token: ANA, body: { label: 'Asesor', frequency: 'weekly', query: { q: 'asesor', bogus: 'ignored' } },
    });
    expect(created.status).toBe(201);
    expect(created.body.alert.query).toEqual({ q: 'asesor' });
    expect((await api.request('/api/me/alerts', { token: ANA })).body.alerts).toHaveLength(1);
    expect((await api.request('/api/me/alerts', { token: CARLA })).body.alerts).toHaveLength(0);

    const mailer = createMemoryMailer();
    const deps = { db: api.db, mailer, log: () => undefined, webUrl: 'https://projobs.test', apiUrl: 'https://api.test' };
    const later = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    expect(await deliverDueAlerts(deps, later)).toBe(1);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]!.html).toContain('/empleos/asesor-credito-senior-andes');
    const token = mailer.sent[0]!.text.match(/token=([0-9a-f]{64})/)![1];

    // Already sent for this period: not due again.
    expect(await deliverDueAlerts(deps, later)).toBe(0);

    const first = await fetch(`${api.url}/api/alerts/unsubscribe?token=${token}`);
    expect(first.status).toBe(200);
    const again = await fetch(`${api.url}/api/alerts/unsubscribe?token=${token}`);
    expect(again.status).toBe(404);
  });

  it('exports and erases the candidate data on request', async () => {
    const exported = await api.request('/api/me/export', { token: ANA });
    expect(exported.status).toBe(200);
    expect(exported.body.applications.length).toBeGreaterThan(0);
    expect(exported.body.alerts).toHaveLength(1);

    const erased = await api.request('/api/me', { method: 'DELETE', token: ANA });
    expect(erased.body.deleted).toMatchObject({ alerts: 1 });
    expect(erased.body.deleted.applications).toBeGreaterThan(0);

    const after = await api.request('/api/me/export', { token: ANA });
    expect(after.body.applications).toHaveLength(0);
    expect(after.body.alerts).toHaveLength(0);
  });

  it('publishes an XML sitemap of open jobs and companies', async () => {
    const response = await fetch(`${api.url}/api/sitemap.xml`);
    const xml = await response.text();
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(xml).toContain('/empleos/asesor-credito-senior-andes');
    expect(xml).toContain('/empresas/banco-andes');
  });
});
