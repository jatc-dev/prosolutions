import { timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response, Router } from 'express';
import { withUserContext } from '../dbContext';
import { logger } from '../utils/logger';

/**
 * Service-to-service API for ProIdentity (admin console):
 *   GET    /api/internal/users/summary?ids=<id>,<id>…  → CV counts per user
 *   DELETE /api/internal/users/:userId                  → erase the user's CVs
 * Authorization: Bearer <PROCV_INTERNAL_TOKEN> (never sent to browsers).
 * Disabled (404) unless PROCV_INTERNAL_TOKEN (32+ characters) is configured.
 * Every query runs inside the target user's signed RLS context, exactly like
 * the user's own GET/DELETE /api/me.
 */
const USER_ID = /^[A-Za-z0-9_-]{3,64}$/;

function sameSecret(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseUserIds(raw: unknown): string[] | null {
  const ids = String(raw ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  if (!ids.length || ids.length > 100 || !ids.every((id) => USER_ID.test(id))) return null;
  return [...new Set(ids)];
}

export function requireInternalToken(env: NodeJS.ProcessEnv = process.env) {
  return (req: Request, res: Response, next: NextFunction) => {
    const expected = env.PROCV_INTERNAL_TOKEN?.trim() ?? '';
    if (expected.length < 32) return res.status(404).json({ message: 'Route not found' });
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token || !sameSecret(token, expected)) return res.status(401).json({ message: 'Invalid service token' });
    return next();
  };
}

const router = Router();
router.use(requireInternalToken());

router.get('/users/summary', async (req: Request, res: Response) => {
  const ids = parseUserIds(req.query.ids);
  if (!ids) return res.status(400).json({ message: 'Invalid user ids' });
  try {
    const users: Record<string, { cvs: number }> = {};
    for (const userId of ids) {
      users[userId] = { cvs: await withUserContext(userId, (tx) => tx.cV.count({ where: { userId } })) };
    }
    res.set('Cache-Control', 'no-store');
    return res.json({ users });
  } catch (error) {
    logger.error('Internal CV summary failed', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Summary failed' });
  }
});

router.delete('/users/:userId', async (req: Request, res: Response) => {
  const [userId] = parseUserIds(req.params.userId) ?? [];
  if (!userId) return res.status(400).json({ message: 'Invalid user id' });
  try {
    // Versions and ATS analyses cascade from CV.
    const result = await withUserContext(userId, (tx) => tx.cV.deleteMany({ where: { userId } }));
    logger.info('ProCV user data erased by ProIdentity', { deletedCvs: result.count });
    return res.json({ message: 'ProCV data deleted', deleted: { cvs: result.count } });
  } catch (error) {
    logger.error('Internal CV erasure failed', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Deletion failed' });
  }
});

export default router;
