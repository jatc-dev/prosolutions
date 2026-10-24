import { Router } from 'express';
import { proJobsAuthMiddleware, ProJobsAuthRequest } from '../middleware/auth.js';
import {
  createApplication,
  listApplications,
  removeApplication,
  StoreNotConfiguredError,
} from '../data/projobs-store.js';

const router = Router();

function safeJobUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function handleStoreError(error: unknown, res: any) {
  if (error instanceof StoreNotConfiguredError) {
    return res.status(503).json({
      code: 'PROJOBS_PERSISTENCE_NOT_CONFIGURED',
      message: 'El seguimiento de postulaciones aún no está habilitado.',
    });
  }
  return res.status(503).json({
    code: 'PROJOBS_PERSISTENCE_UNAVAILABLE',
    message: 'No se pudo registrar la actividad. Intenta de nuevo.',
  });
}

/** POST /api/applications — registra que el usuario va a continuar en la web empleadora. */
router.post('/', proJobsAuthMiddleware, async (req: ProJobsAuthRequest, res) => {
  const { jobId, jobTitle, company, coverLetter } = req.body as {
    jobId?: string;
    jobUrl?: string;
    jobTitle?: string;
    company?: string;
    coverLetter?: string;
  };
  const jobUrl = safeJobUrl(req.body?.jobUrl);

  if (
    typeof jobId !== 'string' || !jobId.trim() || jobId.length > 512 ||
    !jobUrl ||
    (jobTitle !== undefined && (typeof jobTitle !== 'string' || jobTitle.length > 500)) ||
    (company !== undefined && (typeof company !== 'string' || company.length > 500)) ||
    (coverLetter !== undefined && (typeof coverLetter !== 'string' || coverLetter.length > 8000))
  ) {
    return res.status(400).json({ message: 'Datos de postulación inválidos.' });
  }
  if (!req.userId) return res.status(401).json({ message: 'Sesión inválida.' });

  try {
    const application = await createApplication({
      userId: req.userId,
      jobId: jobId.trim(),
      jobUrl,
      jobTitle: (jobTitle || '').trim(),
      company: (company || '').trim(),
      coverLetter: coverLetter || '',
    });
    return res.status(201).json({
      message: 'Actividad registrada. La postulación se completa en el sitio de la empresa.',
      application,
    });
  } catch (error) {
    return handleStoreError(error, res);
  }
});

/** GET /api/applications — muestra el historial del usuario autenticado. */
router.get('/', proJobsAuthMiddleware, async (req: ProJobsAuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ message: 'Sesión inválida.' });
  try {
    return res.json({ applications: await listApplications(req.userId) });
  } catch (error) {
    return handleStoreError(error, res);
  }
});

/** DELETE /api/applications/:jobId — elimina una actividad del historial del usuario autenticado. */
router.delete('/:jobId', proJobsAuthMiddleware, async (req: ProJobsAuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ message: 'Sesión inválida.' });
  const jobId = req.params.jobId;
  if (!jobId || jobId.length > 512) {
    return res.status(400).json({ message: 'Identificador de empleo inválido.' });
  }
  try {
    const removed = await removeApplication(req.userId, jobId);
    if (!removed) return res.status(404).json({ message: 'La actividad no existe en tu historial.' });
    return res.json({ message: 'Actividad eliminada del historial.' });
  } catch (error) {
    return handleStoreError(error, res);
  }
});

export default router;
