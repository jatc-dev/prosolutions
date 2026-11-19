import { Router } from 'express';
import type { JobSummary } from '../contracts.js';
import { optionalAuth } from '../auth/identity.js';
import { asyncHandler, notFound, parse } from '../http/errors.js';
import { jobReportInput, jobSearchQuery } from '../http/schemas.js';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { appliedJobIds } from '../repositories/applications.js';
import { findPublicJob, findSimilarJobs, searchJobs, UUID } from '../repositories/jobs.js';
import { COMPANY_COLUMNS, JOB_SUMMARY_COLUMNS, PUBLICLY_VISIBLE, toCompany, toJobSummary } from '../repositories/mappers.js';
import { savedJobIds } from '../repositories/saved-jobs.js';
import { unsubscribeAlert } from '../repositories/alerts.js';
import type { Queryable } from '../db/database.js';
import type { AppDeps } from './context.js';

/** Decorate jobs with the signed-in candidate's saved/applied state. */
async function withViewer<T extends JobSummary>(tx: Queryable, userId: string | undefined, jobs: T[]): Promise<T[]> {
  if (!userId || !jobs.length) return jobs;
  const ids = jobs.map((job) => job.id);
  const [saved, applied] = await Promise.all([savedJobIds(tx, userId, ids), appliedJobIds(tx, userId, ids)]);
  return jobs.map((job) => ({ ...job, viewer: { saved: saved.has(job.id), applied: applied.has(job.id) } }));
}

export function publicRouter({ db, verify, config }: AppDeps): Router {
  const router = Router();
  router.use(optionalAuth(verify));

  router.get(
    '/jobs',
    asyncHandler(async (req, res) => {
      const query = parse(jobSearchQuery, req.query);
      const userId = req.principal?.userId;
      const result = await db.withContext({ userId: userId ?? null }, async (tx) => {
        const page = await searchJobs(tx, {
          q: query.q,
          workplace: query.workplace,
          employmentType: query.type,
          seniority: query.seniority,
          skills: query.skills,
          candidateSkills: query.mySkills,
          country: query.country,
          location: query.location,
          salaryMin: query.salaryMin,
          postedWithinDays: query.postedWithin,
          sort: query.sort,
          page: query.page,
          pageSize: query.pageSize,
        });
        return { ...page, items: await withViewer(tx, userId, page.items) };
      });
      res.set('Cache-Control', userId ? 'private, no-store' : 'public, max-age=30');
      res.json(result);
    }),
  );

  router.get(
    '/jobs/:idOrSlug',
    asyncHandler(async (req, res) => {
      const userId = req.principal?.userId;
      const result = await db.withContext({ userId: userId ?? null }, async (tx) => {
        const job = await findPublicJob(tx, String(req.params.idOrSlug));
        if (!job) return null;
        const [decorated] = await withViewer(tx, userId, [job]);
        const similar = await findSimilarJobs(tx, job.id, job.skills);
        return { job: decorated!, similar };
      });
      if (!result) throw notFound('Job not found');
      res.set('Cache-Control', userId ? 'private, no-store' : 'public, max-age=60');
      res.json(result);
    }),
  );

  router.get(
    '/companies/:slug',
    asyncHandler(async (req, res) => {
      const result = await db.withContext({ userId: null }, async (tx) => {
        const company = await tx.query(`SELECT ${COMPANY_COLUMNS} FROM public.companies c WHERE c.slug = $1`, [req.params.slug]);
        if (!company.rows[0]) return null;
        const jobs = await tx.query(
          `SELECT ${JOB_SUMMARY_COLUMNS}
           FROM public.jobs j JOIN public.companies c ON c.id = j.company_id
           WHERE c.slug = $1 AND j.status = 'published' AND (j.closes_at IS NULL OR j.closes_at > now()) AND ${PUBLICLY_VISIBLE}
           ORDER BY j.published_at DESC LIMIT 50`,
          [req.params.slug],
        );
        return { company: toCompany(company.rows[0]), jobs: jobs.rows.map(toJobSummary) };
      });
      if (!result) throw notFound('Company not found');
      res.set('Cache-Control', 'public, max-age=60');
      res.json(result);
    }),
  );

  /** One-click unsubscribe link from job alert emails (no session needed). */
  router.get(
    '/alerts/unsubscribe',
    asyncHandler(async (req, res) => {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      const ok = await db.withContext({ userId: null }, (tx) => unsubscribeAlert(tx, token));
      res.set('Cache-Control', 'no-store');
      res
        .status(ok ? 200 : 404)
        .type('html')
        .send(
          `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProJobs</title>` +
            `<body style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f8fafc;color:#0f172a;display:grid;place-items:center;min-height:100vh;margin:0">` +
            `<main style="max-width:420px;padding:32px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;text-align:center">` +
            `<h1 style="font-size:20px">${ok ? 'Alerta cancelada' : 'Enlace no válido'}</h1>` +
            `<p style="color:#475569">${ok ? 'No volverás a recibir esta alerta de empleo.' : 'La alerta ya estaba cancelada o el enlace expiró.'}</p>` +
            `<a href="${config.webUrl}" style="color:#047857;font-weight:600">Ir a ProJobs</a></main></body></html>`,
        );
    }),
  );

  /** XML sitemap of every open job and hiring company (served by the API, linked from robots.txt). */
  router.get(
    '/sitemap.xml',
    asyncHandler(async (_req, res) => {
      const { jobs, companies } = await db.withContext({ userId: null }, async (tx) => ({
        jobs: (
          await tx.query<{ slug: string; updated_at: Date }>(
            `SELECT j.slug, j.updated_at FROM public.jobs j JOIN public.companies c ON c.id = j.company_id
             WHERE j.status = 'published' AND (j.closes_at IS NULL OR j.closes_at > now()) AND ${PUBLICLY_VISIBLE}
             ORDER BY j.published_at DESC LIMIT 45000`,
          )
        ).rows,
        companies: (
          await tx.query<{ slug: string; updated_at: Date }>(
            `SELECT DISTINCT c.slug, c.updated_at FROM public.companies c
             JOIN public.jobs j ON j.company_id = c.id AND j.status = 'published'
             WHERE ${PUBLICLY_VISIBLE}
             LIMIT 5000`,
          )
        ).rows,
      }));
      const xmlEscape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const entry = (loc: string, lastmod?: Date) =>
        `<url><loc>${xmlEscape(loc)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}</url>`;
      const urls = [
        entry(`${config.webUrl}/`),
        ...jobs.map((job) => entry(`${config.webUrl}/empleos/${encodeURIComponent(job.slug)}`, job.updated_at)),
        ...companies.map((company) => entry(`${config.webUrl}/empresas/${encodeURIComponent(company.slug)}`, company.updated_at)),
      ];
      res.set('Cache-Control', 'public, max-age=900');
      res
        .type('application/xml')
        .send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
    }),
  );

  const reportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: config.env === 'test' ? 1000 : 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.principal?.userId ?? ipKeyGenerator(req.ip ?? '0.0.0.0'),
    message: { error: { code: 'rate_limited', message: 'Too many reports, try again later' } },
  });

  /** Anyone can report a suspicious job; ProAdmin reviews it. */
  router.post(
    '/jobs/:jobId/reports',
    reportLimiter,
    asyncHandler(async (req, res) => {
      const input = parse(jobReportInput, req.body);
      const jobId = String(req.params.jobId);
      if (!UUID.test(jobId)) throw notFound('Job not found');
      const created = await db.withContext({ userId: req.principal?.userId ?? null }, async (tx) => {
        const { rows } = await tx.query<{ id: string }>(
          `INSERT INTO public.job_reports (job_id, reason, details, reporter_id)
           SELECT j.id, $2, $3, $4 FROM public.jobs j WHERE j.id = $1 AND j.status IN ('published', 'closed')
           RETURNING id`,
          [jobId, input.reason, input.details, req.principal?.userId ?? null],
        );
        return rows[0] ?? null;
      });
      if (!created) throw notFound('Job not found');
      res.status(201).json({ received: true });
    }),
  );

  return router;
}
