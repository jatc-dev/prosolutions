import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import prisma from '../../src/prismaClient';
import {
  contactSchema,
  DEFAULT_ADS,
  getPublicAdsSettings,
  submitContact,
  updateAdminAdsSettings,
} from '../../src/controllers/platformController';
import { moderateCompany, moderateJob } from '../../src/controllers/projobsAdminProxyController';

const originals = {
  settingFind: prisma.platformSetting.findUnique,
  settingUpsert: prisma.platformSetting.upsert,
  contactCreate: prisma.contactRequest.create,
  fetch: globalThis.fetch,
};

after(() => {
  (prisma.platformSetting as any).findUnique = originals.settingFind;
  (prisma.platformSetting as any).upsert = originals.settingUpsert;
  (prisma.contactRequest as any).create = originals.contactCreate;
  globalThis.fetch = originals.fetch;
  delete process.env.PROJOBS_API_URL;
  delete process.env.PROJOBS_INTERNAL_TOKEN;
});

function recorder() {
  const result: { status: number; body?: any; headers: Record<string, string> } = { status: 200, headers: {} };
  const res: any = {
    status(code: number) { result.status = code; return this; },
    json(body: unknown) { result.body = body; return this; },
    set(name: string, value: string) { result.headers[name] = value; return this; },
  };
  return { res, result };
}

const request = (body: unknown, extra: Record<string, unknown> = {}) =>
  ({ body, headers: {}, ip: '127.0.0.1', params: {}, query: {}, ...extra }) as any;

test('public ads settings default to disabled and ignore corrupted stored values', async () => {
  (prisma.platformSetting as any).findUnique = async () => null;
  const first = recorder();
  await getPublicAdsSettings(request(undefined), first.res);
  assert.deepEqual(first.result.body.ads, DEFAULT_ADS);
  assert.equal(first.result.body.ads.enabled, false);

  (prisma.platformSetting as any).findUnique = async () => ({ value: { enabled: 'yes', publisherId: 'evil' } });
  const second = recorder();
  await getPublicAdsSettings(request(undefined), second.res);
  assert.deepEqual(second.result.body.ads, DEFAULT_ADS);
});

test('admins can only store a valid AdSense configuration', async () => {
  let stored: any;
  (prisma.platformSetting as any).upsert = async (args: any) => { stored = args.create.value; return {}; };
  const placements = { 'academy-article': true, 'academy-index': false, 'tools-result': true, 'jobs-listing': true };

  const bad = recorder();
  await updateAdminAdsSettings(request({ enabled: true, publisherId: 'pub-123', placements }, { userId: 'admin-1' }), bad.res);
  assert.equal(bad.result.status, 400);

  const good = recorder();
  await updateAdminAdsSettings(request({ enabled: true, publisherId: 'ca-pub-1234567890123456', placements }, { userId: 'admin-1' }), good.res);
  assert.equal(good.result.status, 200);
  assert.equal(stored.publisherId, 'ca-pub-1234567890123456');
  assert.equal(stored.placements['academy-index'], false);
});

test('contact form validates input, requires privacy acceptance and traps bots', async () => {
  const valid = { topic: 'datos-personales', name: 'Ana Pérez', email: 'ana@example.com', message: 'Quiero conocer qué datos tienen sobre mí.', acceptPrivacyPolicy: true };
  assert.equal(contactSchema.validate(valid).error, undefined);
  assert.ok(contactSchema.validate({ ...valid, acceptPrivacyPolicy: false }).error);
  assert.ok(contactSchema.validate({ ...valid, topic: 'spam' }).error);
  assert.ok(contactSchema.validate({ ...valid, message: 'corto' }).error);

  let created = 0;
  (prisma.contactRequest as any).create = async () => { created += 1; return { id: 'cmabcdefgh12345678' }; };
  const bot = recorder();
  await submitContact(request({ ...valid, website: 'http://spam.example' }), bot.res);
  assert.equal(bot.result.status, 201);
  assert.equal(created, 0, 'honeypot submissions are never stored');

  const human = recorder();
  await submitContact(request(valid), human.res);
  assert.equal(human.result.status, 201);
  assert.equal(created, 1);
  assert.equal(human.result.body.reference, '12345678');
});

test('ProJobs moderation proxy validates input and uses the internal token server-side', async () => {
  const notConfigured = recorder();
  await moderateCompany(request({ status: 'verified' }, { params: { companyId: '6f1c1b0e-0000-4000-8000-000000000001' } }), notConfigured.res);
  assert.equal(notConfigured.result.status, 503);

  process.env.PROJOBS_API_URL = 'https://projobs-api.test/';
  process.env.PROJOBS_INTERNAL_TOKEN = 'internal-token-0123456789abcdef0123456789';
  const calls: Array<{ url: string; init: any }> = [];
  globalThis.fetch = (async (url: string, init: any) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;

  const badId = recorder();
  await moderateJob(request({ action: 'pause' }, { params: { jobId: '../../etc' } }), badId.res);
  assert.equal(badId.result.status, 404);

  const badAction = recorder();
  await moderateJob(request({ action: 'delete' }, { params: { jobId: '6f1c1b0e-0000-4000-8000-000000000001' } }), badAction.res);
  assert.equal(badAction.result.status, 400);

  const ok = recorder();
  await moderateCompany(request({ status: 'suspended', note: 'Denuncias' }, { params: { companyId: '6f1c1b0e-0000-4000-8000-000000000001' }, userId: 'admin-1' }), ok.res);
  assert.equal(ok.result.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://projobs-api.test/internal/companies/6f1c1b0e-0000-4000-8000-000000000001/verification');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer internal-token-0123456789abcdef0123456789');
  assert.deepEqual(JSON.parse(calls[0].init.body), { status: 'suspended', note: 'Denuncias' });
});
