import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { withUserContext } from '../dbContext';
import { logger } from '../utils/logger';

/**
 * Personal-data rights for ProCV (Ley 1581 / GDPR). Both endpoints run inside
 * the signed RLS user context, so they can only ever touch the caller's rows.
 */
export async function exportMyData(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const cvs = await withUserContext(userId, tx =>
      tx.cV.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        include: {
          versions: { orderBy: { createdAt: 'asc' } },
          atsAnalyses: { orderBy: { createdAt: 'asc' } },
        },
      }),
    );
    res.setHeader('Content-Disposition', 'attachment; filename="prosolutions-procv-export.json"');
    return res.json({ service: 'ProCV', exportedAt: new Date().toISOString(), cvs });
  } catch (error) {
    logger.error('ProCV export failed', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Export failed' });
  }
}

export async function deleteMyData(req: AuthRequest, res: Response) {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  try {
    // Versions and ATS analyses cascade from CV.
    const result = await withUserContext(userId, tx => tx.cV.deleteMany({ where: { userId } }));
    logger.info('ProCV user data erased', { deletedCvs: result.count });
    return res.json({ message: 'ProCV data deleted', deletedCvs: result.count });
  } catch (error) {
    logger.error('ProCV erasure failed', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Deletion failed' });
  }
}
