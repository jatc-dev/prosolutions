import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { asyncHandler, notFound, parse, unauthorized } from '../http/errors.js';
import { companyListQuery, companyVerification, eventsQuery, jobModeration, moderationListQuery } from '../http/schemas.js';
import { UUID } from '../repositories/jobs.js';
import { listEvents } from '../repositories/outbox.js';
import type { AppDeps } from './context.js';

/** ProIdentity user ids (cuid-like): letters, digits, "_" and "-". */
const USER_ID = /^[A-Za-z0-9_-]{3,64}$/;
function parseUserIds(raw: unknown): string[] {
  const ids = String(raw ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  if (!ids.length || ids.length > 100 || !ids.every((id) => USER_ID.test(id))) throw notFound('Invalid user ids');
  return [...new Set(ids)];
}

function sameSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Service-to-service API for future ProSolutions modules (e.g. notifications,
 * analytics, ProCareer). Consumers poll the outbox with an id cursor:
 *   GET /internal/events?after=<lastId>&limit=100
 *   Authorization: Bearer <PROJOBS_INTERNAL_TOKEN>
 * Disabled (404) unless PROJOBS_INTERNAL_TOKEN is configured.
 */
export function internalRouter({ db, config }: AppDeps): Router {
  const router = Router();

  router.use((req, _res, next) => {
    if (!config.internalToken) return next(notFound('Route not found'));
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !sameSecret(token, config.internalToken)) return next(unauthorized('Invalid service token'));
    next();
  });

  router.get(
    '/events',
    asyncHandler(async (req, res) => {
      const { after, limit } = parse(eventsQuery, req.query);
      const events = await db.withContext({ userId: null }, (tx) => listEvents(tx, after, limit));
      res.set('Cache-Control', 'no-store');
      res.json({ events, nextCursor: events.length ? events[events.length - 1]!.id : after });
    }),
  );

  /** Administrative company verification (ProAdmin / operations). */
  router.post(
    '/companies/:companyId/verification',
    asyncHandler(async (req, res) => {
      const input = parse(companyVerification, req.body);
      const companyId = String(req.params.companyId);
      if (!UUID.test(companyId)) throw notFound('Company not found');
      const { rows } = await db.withContext({ userId: null }, (tx) =>
        tx.query<{ id: string; verification_status: string }>(
          `UPDATE public.companies
           SET verification_status = $2, verification_method = 'manual', verification_note = $3,
               verified_at = CASE WHEN $2 = 'verified' THEN now() ELSE NULL END
           WHERE id = $1 RETURNING id, verification_status`,
          [companyId, input.status, input.note],
        ),
      );
      if (!rows[0]) throw notFound('Company not found');
      res.json({ company: { id: rows[0].id, verificationStatus: rows[0].verification_status } });
    }),
  );

  /** Companies for ProAdmin review, oldest first. */
  router.get(
    '/companies',
    asyncHandler(async (req, res) => {
      const { status } = parse(companyListQuery, req.query);
      const { rows } = await db.withContext({ userId: null }, (tx) =>
        tx.query<Record<string, any>>(
          `SELECT c.id, c.slug, c.name, c.website, c.industry, c.verification_status, c.verification_method,
                  c.verification_note, c.verified_at, c.created_at,
                  (SELECT count(*)::int FROM public.company_members m WHERE m.company_id = c.id) AS members,
                  (SELECT string_agg(m.email, ', ') FROM public.company_members m WHERE m.company_id = c.id AND m.email IS NOT NULL) AS member_emails,
                  (SELECT count(*)::int FROM public.jobs j WHERE j.company_id = c.id AND j.status = 'published') AS published_jobs
           FROM public.companies c
           WHERE ($1 = 'all' OR c.verification_status = $1)
           ORDER BY c.created_at ASC
           LIMIT 200`,
          [status],
        ),
      );
      res.set('Cache-Control', 'no-store');
      res.json({
        companies: rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          website: row.website,
          industry: row.industry,
          verificationStatus: row.verification_status,
          verificationMethod: row.verification_method,
          verificationNote: row.verification_note,
          verifiedAt: row.verified_at,
          createdAt: row.created_at,
          members: Number(row.members),
          memberEmails: row.member_emails,
          publishedJobs: Number(row.published_jobs),
        })),
      });
    }),
  );

  /** Jobs needing moderation: open reports and/or paused. */
  router.get(
    '/jobs/moderation',
    asyncHandler(async (req, res) => {
      const { filter } = parse(moderationListQuery, req.query);
      const { rows } = await db.withContext({ userId: null }, (tx) =>
        tx.query<Record<string, any>>(
          `SELECT j.id, j.slug, j.title, j.status, j.moderation_status, j.moderation_note, j.published_at,
                  c.name AS company_name, c.verification_status,
                  (count(r.id) FILTER (WHERE r.resolved_at IS NULL))::int AS open_reports,
                  array_remove(array_agg(DISTINCT r.reason) FILTER (WHERE r.resolved_at IS NULL), NULL) AS reasons,
                  max(r.created_at) AS last_report_at
           FROM public.jobs j
           JOIN public.companies c ON c.id = j.company_id
           LEFT JOIN public.job_reports r ON r.job_id = j.id
           GROUP BY j.id, c.id
           HAVING ($1 = 'all' AND (count(r.id) > 0 OR j.moderation_status = 'paused'))
               OR ($1 = 'reported' AND count(r.id) FILTER (WHERE r.resolved_at IS NULL) > 0)
               OR ($1 = 'paused' AND j.moderation_status = 'paused')
           ORDER BY open_reports DESC, last_report_at DESC NULLS LAST
           LIMIT 200`,
          [filter],
        ),
      );
      res.set('Cache-Control', 'no-store');
      res.json({
        jobs: rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          status: row.status,
          moderationStatus: row.moderation_status,
          moderationNote: row.moderation_note,
          publishedAt: row.published_at,
          companyName: row.company_name,
          companyStatus: row.verification_status,
          openReports: Number(row.open_reports),
          reasons: row.reasons ?? [],
          lastReportAt: row.last_report_at,
        })),
      });
    }),
  );

  /** pause: hide from every public surface; restore: show again and close reports; dismiss: close reports. */
  router.post(
    '/jobs/:jobId/moderation',
    asyncHandler(async (req, res) => {
      const input = parse(jobModeration, req.body);
      const jobId = String(req.params.jobId);
      if (!UUID.test(jobId)) throw notFound('Job not found');
      const result = await db.withContext({ userId: null }, async (tx) => {
        const exists = await tx.query('SELECT 1 FROM public.jobs WHERE id = $1', [jobId]);
        if (!exists.rows.length) return null;
        if (input.action !== 'dismiss') {
          await tx.query(
            'UPDATE public.jobs SET moderation_status = $2, moderation_note = $3, moderated_at = now() WHERE id = $1',
            [jobId, input.action === 'pause' ? 'paused' : 'ok', input.note],
          );
        }
        if (input.action !== 'pause') {
          await tx.query('UPDATE public.job_reports SET resolved_at = now() WHERE job_id = $1 AND resolved_at IS NULL', [jobId]);
        }
        const { rows } = await tx.query<{ moderation_status: string }>('SELECT moderation_status FROM public.jobs WHERE id = $1', [jobId]);
        return rows[0]!;
      });
      if (!result) throw notFound('Job not found');
      res.json({ job: { id: jobId, moderationStatus: result.moderation_status } });
    }),
  );

  /**
   * Per-user content counts for the ProSolutions admin console (users page).
   *   GET /internal/users/summary?ids=<id>,<id>…   (max 100)
   * Each user is read inside their own RLS context, exactly like GET /api/me.
   */
  router.get(
    '/users/summary',
    asyncHandler(async (req, res) => {
      const ids = parseUserIds(req.query.ids);
      const users: Record<string, Record<string, number>> = {};
      for (const userId of ids) {
        users[userId] = await db.withContext({ userId }, async (tx) => {
          const count = async (sql: string) => Number((await tx.query<{ n: number }>(sql, [userId])).rows[0]?.n ?? 0);
          return {
            applications: await count('SELECT count(*)::int AS n FROM public.applications WHERE candidate_id = $1'),
            savedJobs: await count('SELECT count(*)::int AS n FROM public.saved_jobs WHERE user_id = $1'),
            alerts: await count('SELECT count(*)::int AS n FROM public.job_alerts WHERE user_id = $1'),
            companyMemberships: await count('SELECT count(*)::int AS n FROM public.company_members WHERE user_id = $1'),
          };
        });
      }
      res.set('Cache-Control', 'no-store');
      res.json({ users });
    }),
  );

  /**
   * Erase a user's ProJobs data when ProIdentity deletes the account (same
   * scope as DELETE /api/me, run in the user's RLS context).
   */
  router.delete(
    '/users/:userId',
    asyncHandler(async (req, res) => {
      const [userId] = parseUserIds(req.params.userId);
      if (!userId) throw notFound('User not found');
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
