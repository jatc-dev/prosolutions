import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { asyncHandler, notFound, parse, unauthorized } from '../http/errors.js';
import { companyVerification, eventsQuery } from '../http/schemas.js';
import { UUID } from '../repositories/jobs.js';
import { listEvents } from '../repositories/outbox.js';
import type { AppDeps } from './context.js';

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

  return router;
}
