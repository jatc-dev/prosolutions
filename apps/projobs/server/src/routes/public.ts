import { Router } from 'express';
import type { JobSummary } from '../contracts.js';
import { optionalAuth } from '../auth/identity.js';
import { asyncHandler, notFound, parse } from '../http/errors.js';
import { jobSearchQuery } from '../http/schemas.js';
import { appliedJobIds } from '../repositories/applications.js';
import { findPublicJob, findSimilarJobs, searchJobs } from '../repositories/jobs.js';
import { COMPANY_COLUMNS, JOB_SUMMARY_COLUMNS, toCompany, toJobSummary } from '../repositories/mappers.js';
import { savedJobIds } from '../repositories/saved-jobs.js';
import type { Queryable } from '../db/database.js';
import type { AppDeps } from './context.js';

/** Decorate jobs with the signed-in candidate's saved/applied state. */
async function withViewer<T extends JobSummary>(tx: Queryable, userId: string | undefined, jobs: T[]): Promise<T[]> {
  if (!userId || !jobs.length) return jobs;
  const ids = jobs.map((job) => job.id);
  const [saved, applied] = await Promise.all([savedJobIds(tx, userId, ids), appliedJobIds(tx, userId, ids)]);
  return jobs.map((job) => ({ ...job, viewer: { saved: saved.has(job.id), applied: applied.has(job.id) } }));
}

export function publicRouter({ db, verify }: AppDeps): Router {
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
           WHERE c.slug = $1 AND j.status = 'published' AND (j.closes_at IS NULL OR j.closes_at > now())
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

  return router;
}
