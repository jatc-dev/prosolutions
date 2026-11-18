import { Router } from 'express';
import { principalOf, requireRecruiter } from '../auth/identity.js';
import { asyncHandler, notFound, parse } from '../http/errors.js';
import { companyInput, companyPatch, jobInput, jobUpdate, stageChange } from '../http/schemas.js';
import { listPipeline, moveApplication } from '../repositories/applications.js';
import {
  closeJob,
  createCompany,
  createJob,
  listEmployerJobs,
  listMemberCompanies,
  publishJob,
  updateCompany,
  updateJob,
} from '../repositories/employer.js';
import { findJobForMember } from '../repositories/jobs.js';
import type { AppDeps } from './context.js';

/**
 * Employer / lightweight ATS API. Requires the PRORECRUIT module issued by
 * ProIdentity; company-level authorization is enforced in SQL (membership)
 * and by row level security on applications.
 */
export function employerRouter({ db, verify }: AppDeps): Router {
  const router = Router();
  router.use(requireRecruiter(verify));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  });

  const run = <T>(userId: string, work: Parameters<typeof db.withContext<T>>[1]) => db.withContext({ userId }, work);

  router.get(
    '/companies',
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      res.json({ companies: await run(userId, (tx) => listMemberCompanies(tx, userId)) });
    }),
  );

  router.post(
    '/companies',
    asyncHandler(async (req, res) => {
      const input = parse(companyInput, req.body);
      const { userId } = principalOf(req);
      res.status(201).json({ company: await run(userId, (tx) => createCompany(tx, userId, input)) });
    }),
  );

  router.patch(
    '/companies/:companyId',
    asyncHandler(async (req, res) => {
      const input = parse(companyPatch, req.body);
      const { userId } = principalOf(req);
      res.json({ company: await run(userId, (tx) => updateCompany(tx, userId, String(req.params.companyId), input)) });
    }),
  );

  router.get(
    '/jobs',
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      const companyId = typeof req.query.companyId === 'string' ? req.query.companyId : undefined;
      res.json({ jobs: await run(userId, (tx) => listEmployerJobs(tx, userId, companyId)) });
    }),
  );

  router.post(
    '/jobs',
    asyncHandler(async (req, res) => {
      const input = parse(jobInput, req.body);
      const { userId } = principalOf(req);
      res.status(201).json({ job: await run(userId, (tx) => createJob(tx, userId, input)) });
    }),
  );

  router.get(
    '/jobs/:jobId',
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      const job = await run(userId, (tx) => findJobForMember(tx, String(req.params.jobId), userId));
      if (!job) throw notFound('Job not found');
      res.json({ job });
    }),
  );

  router.put(
    '/jobs/:jobId',
    asyncHandler(async (req, res) => {
      const input = parse(jobUpdate, req.body);
      const { userId } = principalOf(req);
      res.json({ job: await run(userId, (tx) => updateJob(tx, userId, String(req.params.jobId), input)) });
    }),
  );

  router.post(
    '/jobs/:jobId/publish',
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      res.json({ job: await run(userId, (tx) => publishJob(tx, userId, String(req.params.jobId))) });
    }),
  );

  router.post(
    '/jobs/:jobId/close',
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      res.json({ job: await run(userId, (tx) => closeJob(tx, userId, String(req.params.jobId))) });
    }),
  );

  router.get(
    '/jobs/:jobId/applications',
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      res.json({ applications: await run(userId, (tx) => listPipeline(tx, userId, String(req.params.jobId))) });
    }),
  );

  router.patch(
    '/applications/:applicationId',
    asyncHandler(async (req, res) => {
      const input = parse(stageChange, req.body);
      const { userId } = principalOf(req);
      await run(userId, (tx) => moveApplication(tx, userId, String(req.params.applicationId), input.stage, input.note));
      res.status(204).end();
    }),
  );

  return router;
}
