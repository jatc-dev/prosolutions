import { Router } from 'express';
import { proJobsAuthMiddleware, ProJobsAuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/applications
 * Crea una postulación de usuario autenticado a una oferta de empleo.
 */
router.post('/', proJobsAuthMiddleware, (req: ProJobsAuthRequest, res) => {
  const { jobId, jobUrl, coverLetter } = req.body as {
    jobId?: string;
    jobUrl?: string;
    coverLetter?: string;
  };

  if (!jobId || !jobUrl) {
    return res.status(400).json({ message: 'jobId and jobUrl are required' });
  }

  // En una implementación completa, esto se persistiría en una base de datos
  // asociado a req.userId. Por ahora se devuelve una confirmación.
  return res.status(201).json({
    message: 'Application created successfully',
    application: {
      id: `app_${Date.now()}`,
      userId: req.userId,
      jobId,
      jobUrl,
      coverLetter: coverLetter || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/applications
 * Lista las postulaciones del usuario autenticado.
 */
router.get('/', proJobsAuthMiddleware, (req: ProJobsAuthRequest, res) => {
  // En una implementación completa, se consultarían desde una base de datos filtrando por userId
  return res.json({
    applications: [],
    userId: req.userId,
    message: 'No applications found. This endpoint requires a database backend.',
  });
});

export default router;
