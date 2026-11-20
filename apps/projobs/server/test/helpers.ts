import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { createIdentityVerifier } from '../src/auth/identity.js';
import { loadConfig, type AppConfig } from '../src/config.js';
import type { CandidateProfile, CvOption } from '../src/contracts.js';
import type { Database } from '../src/db/database.js';
import { runMigrations } from '../src/db/migrate.js';
import { createPgliteDatabase } from '../src/db/pglite.js';
import { seedDemoData } from '../src/db/seed.js';
import { notFound } from '../src/http/errors.js';
import type { ProCvClient } from '../src/integrations/procv.js';
import type { ExternalJobsProvider } from '../src/integrations/externalJobs.js';

export const JWT = { secret: 'test-secret-with-at-least-32-characters!!', issuer: 'https://identity.test', audience: 'prosolutions-api' };
export const INTERNAL_TOKEN = 'internal-token-for-tests-0123456789abcdef';

export function tokenFor(userId: string, modules: string[] = ['PROCV', 'PROJOBS'], overrides: jwt.SignOptions = {}) {
  return jwt.sign({ email: `${userId}@example.com`, role: 'user', modules, token_use: 'access' }, JWT.secret, {
    subject: userId,
    issuer: JWT.issuer,
    audience: JWT.audience,
    expiresIn: '15m',
    ...overrides,
  });
}

export const PROFILE: CandidateProfile = {
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  phone: null,
  headline: 'Frontend Developer',
  summary: 'Me encanta construir interfaces accesibles.',
  location: 'Bogotá, CO',
  skills: ['react', 'typescript', 'css'],
  experience: [{ position: 'Frontend Developer', company: 'Acme', startDate: '2020-01', endDate: null, current: true }],
  education: [],
  links: [],
};

/** In-memory ProCV double: candidate "ana" owns cv-1. */
export function fakeProCv(profiles: Record<string, CandidateProfile> = { 'cv-1': PROFILE }): ProCvClient {
  return {
    async listCvs(): Promise<CvOption[]> {
      return Object.entries(profiles).map(([id, profile]) => ({
        id,
        title: `CV ${id}`,
        updatedAt: new Date().toISOString(),
        headline: profile.headline,
        skillCount: profile.skills.length,
      }));
    },
    async getProfile(_token, cvId) {
      const profile = profiles[cvId];
      if (!profile) throw notFound('CV not found in ProCV');
      return profile;
    },
  };
}

export interface TestApi {
  db: Database;
  config: AppConfig;
  url: string;
  request: (path: string, init?: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> }) => Promise<{ status: number; body: any }>;
  close: () => Promise<void>;
}

export async function startTestApi(options: { internalToken?: boolean; seed?: boolean; externalJobs?: ExternalJobsProvider[] } = {}): Promise<TestApi> {
  // Runtime role projobs_api: queries run with the same privileges and RLS as production.
  const db = await createPgliteDatabase('projobs_api');
  await runMigrations(db);
  if (options.seed !== false) await seedDemoData(db, null);

  const config = loadConfig({
    NODE_ENV: 'test',
    IDENTITY_JWT_SECRET: JWT.secret,
    IDENTITY_ISSUER: JWT.issuer,
    IDENTITY_AUDIENCE: JWT.audience,
    ...(options.internalToken ? { PROJOBS_INTERNAL_TOKEN: INTERNAL_TOKEN } : {}),
  });
  const app = createApp({
    config,
    db,
    log: () => undefined,
    verify: createIdentityVerifier(config.jwt),
    procv: fakeProCv(),
    externalJobs: options.externalJobs ?? [],
  });
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  return {
    db,
    config,
    url,
    async request(path, init = {}) {
      const response = await fetch(`${url}${path}`, {
        method: init.method ?? 'GET',
        headers: {
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
          ...init.headers,
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
    },
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await db.close();
    },
  };
}
