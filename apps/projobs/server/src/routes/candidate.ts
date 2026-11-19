import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { CandidateProfile, SessionInfo } from '../contracts.js';
import { principalOf, requireCandidate, requireUser } from '../auth/identity.js';
import { computeMatch, normalizeSkills } from '../domain/skills.js';
import { asyncHandler, badRequest, notFound, parse } from '../http/errors.js';
import { alertInput, applicationInput, matchQuery } from '../http/schemas.js';
import { listCandidateApplications, submitApplication, withdrawApplication } from '../repositories/applications.js';
import { listMemberCompanies } from '../repositories/employer.js';
import { alertSearchParams, createAlert, deleteAlert, listAlerts, sanitizeAlertQuery } from '../repositories/alerts.js';
import { findPublicJob } from '../repositories/jobs.js';
import { listSavedJobs, saveJob, unsaveJob } from '../repositories/saved-jobs.js';
import type { AppDeps } from './context.js';

export function candidateRouter({ db, verify, procv }: AppDeps): Router {
  const router = Router();
  const candidate = requireCandidate(verify);

  const applyLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.principal?.userId ?? ipKeyGenerator(req.ip ?? '0.0.0.0'),
    message: { error: { code: 'rate_limited', message: 'Too many applications, try again later' } },
  });

  /** Session context for the web app: capabilities derived from ProIdentity modules. */
  router.get(
    '/me',
    requireUser(verify),
    asyncHandler(async (req, res) => {
      const principal = principalOf(req);
      // Self-service recruiters have no PRORECRUIT grant: membership counts too.
      const companies = await db.withContext({ userId: principal.userId }, (tx) => listMemberCompanies(tx, principal.userId));
      const session: SessionInfo = {
        userId: principal.userId,
        email: principal.email,
        isCandidate: principal.isCandidate,
        isRecruiter: principal.isRecruiter || companies.length > 0,
        companies,
      };
      res.set('Cache-Control', 'private, no-store');
      res.json(session);
    }),
  );

  /** CVs available in ProCV for one-click apply. */
  router.get(
    '/me/cvs',
    candidate,
    asyncHandler(async (req, res) => {
      const cvs = await procv.listCvs(principalOf(req).token);
      res.set('Cache-Control', 'private, no-store');
      res.json({ cvs });
    }),
  );

  /** Skills from the candidate's most recent CV (personalized ranking and badges). */
  router.get(
    '/me/skills',
    candidate,
    asyncHandler(async (req, res) => {
      const { token } = principalOf(req);
      const cvs = await procv.listCvs(token).catch(() => []);
      const latest = cvs[0];
      const skills = latest ? (await procv.getProfile(token, latest.id)).skills : [];
      res.set('Cache-Control', 'private, max-age=300');
      res.json({ cvId: latest?.id ?? null, skills });
    }),
  );

  router.get(
    '/jobs/:jobId/match',
    candidate,
    asyncHandler(async (req, res) => {
      const { cvId } = parse(matchQuery, req.query);
      const principal = principalOf(req);
      const job = await db.withContext({ userId: principal.userId }, (tx) => findPublicJob(tx, String(req.params.jobId)));
      if (!job) throw notFound('Job not found');
      const profile = await procv.getProfile(principal.token, cvId);
      res.set('Cache-Control', 'private, no-store');
      res.json({ match: computeMatch(job.skills, profile.skills), profile });
    }),
  );

  router.post(
    '/jobs/:jobId/applications',
    candidate,
    applyLimiter,
    asyncHandler(async (req, res) => {
      const input = parse(applicationInput, req.body);
      const principal = principalOf(req);

      let profile: CandidateProfile;
      if (input.cvId) {
        profile = await procv.getProfile(principal.token, input.cvId);
      } else {
        const manual = input.profile!;
        profile = {
          fullName: manual.fullName,
          email: manual.email ?? principal.email,
          phone: manual.phone,
          headline: manual.headline,
          summary: manual.summary,
          location: manual.location,
          skills: normalizeSkills(manual.skills),
          experience: [],
          education: [],
          links: manual.links.filter((link) => /^https?:\/\//i.test(link.url)),
        };
      }
      if (!profile.email) profile = { ...profile, email: principal.email };

      const result = await db.withContext({ userId: principal.userId }, async (tx) => {
        const job = await findPublicJob(tx, String(req.params.jobId));
        if (!job) throw notFound('Job not found');
        const match = computeMatch(job.skills, profile.skills);
        const created = await submitApplication(tx, {
          jobId: job.id,
          candidateId: principal.userId,
          source: input.cvId ? 'procv' : 'manual',
          procvCvId: input.cvId ?? null,
          profile,
          coverLetter: input.coverLetter,
          match,
          candidateEmail: principal.email ?? profile.email ?? null,
          jobTitle: job.title,
          companyName: job.company.name,
        });
        return { ...created, match };
      });
      res.status(201).json(result);
    }),
  );

  router.get(
    '/me/applications',
    candidate,
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      const applications = await db.withContext({ userId }, (tx) => listCandidateApplications(tx, userId));
      res.set('Cache-Control', 'private, no-store');
      res.json({ applications });
    }),
  );

  router.post(
    '/me/applications/:applicationId/withdraw',
    candidate,
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      await db.withContext({ userId }, (tx) => withdrawApplication(tx, userId, String(req.params.applicationId)));
      res.status(204).end();
    }),
  );

  router.get(
    '/me/saved-jobs',
    candidate,
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      const jobs = await db.withContext({ userId }, (tx) => listSavedJobs(tx, userId));
      res.set('Cache-Control', 'private, no-store');
      res.json({ jobs });
    }),
  );

  router.put(
    '/me/saved-jobs/:jobId',
    candidate,
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      await db.withContext({ userId }, (tx) => saveJob(tx, userId, String(req.params.jobId)));
      res.status(204).end();
    }),
  );

  router.delete(
    '/me/saved-jobs/:jobId',
    candidate,
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      await db.withContext({ userId }, (tx) => unsaveJob(tx, userId, String(req.params.jobId)));
      res.status(204).end();
    }),
  );

  // -------------------------------------------------------------------------
  // Job alerts (saved searches delivered by email)
  // -------------------------------------------------------------------------
  router.get(
    '/me/alerts',
    requireUser(verify),
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      res.set('Cache-Control', 'private, no-store');
      res.json({ alerts: await db.withContext({ userId }, (tx) => listAlerts(tx, userId)) });
    }),
  );

  router.post(
    '/me/alerts',
    requireUser(verify),
    asyncHandler(async (req, res) => {
      const input = parse(alertInput, req.body);
      const principal = principalOf(req);
      if (!principal.email) throw badRequest('Your account has no email address for alerts');
      const query = sanitizeAlertQuery(input.query);
      if (!alertSearchParams(query, input.frequency)) throw badRequest('Invalid search filters');
      const alert = await db.withContext({ userId: principal.userId }, (tx) =>
        createAlert(tx, principal.userId, { email: principal.email!, label: input.label, query, frequency: input.frequency }),
      );
      res.status(201).json({ alert });
    }),
  );

  router.delete(
    '/me/alerts/:alertId',
    requireUser(verify),
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      await db.withContext({ userId }, (tx) => deleteAlert(tx, userId, String(req.params.alertId)));
      res.status(204).end();
    }),
  );

  // -------------------------------------------------------------------------
  // Personal-data rights (Ley 1581 / GDPR): export and erasure
  // -------------------------------------------------------------------------
  router.get(
    '/me/export',
    requireUser(verify),
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      const data = await db.withContext({ userId }, async (tx) => ({
        applications: (
          await tx.query(
            `SELECT a.id, a.job_id, j.title AS job_title, a.stage, a.source, a.candidate_snapshot, a.cover_letter,
                    a.match_score, a.consent_at, a.created_at, a.updated_at
             FROM public.applications a JOIN public.jobs j ON j.id = a.job_id
             WHERE a.candidate_id = $1 ORDER BY a.created_at`,
            [userId],
          )
        ).rows,
        applicationEvents: (
          await tx.query(
            `SELECT e.application_id, e.from_stage, e.to_stage, e.actor_type, e.created_at
             FROM public.application_events e JOIN public.applications a ON a.id = e.application_id
             WHERE a.candidate_id = $1 ORDER BY e.created_at`,
            [userId],
          )
        ).rows,
        savedJobs: (await tx.query('SELECT job_id, created_at FROM public.saved_jobs WHERE user_id = $1', [userId])).rows,
        alerts: await listAlerts(tx, userId),
        companyMemberships: (
          await tx.query(
            `SELECT c.name AS company, m.role, m.created_at
             FROM public.company_members m JOIN public.companies c ON c.id = m.company_id WHERE m.user_id = $1`,
            [userId],
          )
        ).rows,
      }));
      res.set('Cache-Control', 'private, no-store');
      res.setHeader('Content-Disposition', 'attachment; filename="prosolutions-projobs-export.json"');
      res.json({ service: 'ProJobs', exportedAt: new Date().toISOString(), ...data });
    }),
  );

  router.delete(
    '/me',
    requireUser(verify),
    asyncHandler(async (req, res) => {
      const { userId } = principalOf(req);
      const deleted = await db.withContext({ userId }, async (tx) => ({
        applications: (await tx.query('DELETE FROM public.applications WHERE candidate_id = $1 RETURNING id', [userId])).rows.length,
        savedJobs: (await tx.query('DELETE FROM public.saved_jobs WHERE user_id = $1 RETURNING job_id', [userId])).rows.length,
        alerts: (await tx.query('DELETE FROM public.job_alerts WHERE user_id = $1 RETURNING id', [userId])).rows.length,
        companyMemberships: (await tx.query('DELETE FROM public.company_members WHERE user_id = $1 RETURNING company_id', [userId])).rows.length,
      }));
      res.json({ message: 'ProJobs data deleted', deleted });
    }),
  );

  return router;
}
