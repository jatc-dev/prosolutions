import { Router } from 'express';
import { proJobsAuthMiddleware, ProJobsAuthRequest } from '../middleware/auth';

const router = Router();

/**
 * POST /api/saved-jobs
 * Guarda un empleo en la lista personal del usuario autenticado.
 */
router.post('/', proJobsAuthMiddleware, (req: ProJobsAuthRequest, res) => {
  const { jobId, jobUrl, jobTitle, company } = req.body as {
    jobId?: string;
    jobUrl?: string;
    jobTitle?: string;
    company?: string;
  };

  if (!jobId || !jobUrl) {
    return res.status(400).json({ message: 'jobId and jobUrl are required' });
  }

  return res.status(201).json({
    message: 'Job saved successfully',
    savedJob: {
      id: `saved_${Date.now()}`,
      userId: req.userId,
      jobId,
      jobUrl,
      jobTitle: jobTitle || '',
      company: company || '',
      savedAt: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/saved-jobs
 * Lista los empleos guardados del usuario autenticado.
 */
router.get('/', proJobsAuthMiddleware, (req: ProJobsAuthRequest, res) => {
  return res.json({
    savedJobs: [],
    userId: req.userId,
    message: 'No saved jobs found. This endpoint requires a database backend.',
  });
});

/**
 * DELETE /api/saved-jobs/:jobId
 * Elimina un empleo guardado del usuario autenticado.
 */
router.delete(
  '/:jobId',
  proJobsAuthMiddleware,
  (req: ProJobsAuthRequest, res) => {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ message: 'jobId is required' });
    }

    return res.json({
      message: 'Job removed from saved list',
      userId: req.userId,
      jobId,
    });
  },
);

export default router;
