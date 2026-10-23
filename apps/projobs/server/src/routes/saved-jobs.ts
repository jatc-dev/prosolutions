import { Router } from 'express';
import { proJobsAuthMiddleware, ProJobsAuthRequest } from '../middleware/auth.js';
import {
  listSavedJobs,
  removeSavedJob,
  saveJob,
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
      message: 'Las funciones personales de ProJobs aún no están habilitadas.',
    });
  }
  return res.status(503).json({
    code: 'PROJOBS_PERSISTENCE_UNAVAILABLE',
    message: 'No se pudo completar la operación. Intenta de nuevo.',
  });
}

/** POST /api/saved-jobs — guarda o actualiza un empleo de forma idempotente. */
router.post('/', proJobsAuthMiddleware, async (req: ProJobsAuthRequest, res) => {
  const { jobId, jobTitle, company } = req.body as {
    jobId?: string;
    jobUrl?: string;
    jobTitle?: string;
    company?: string;
  };
  const jobUrl = safeJobUrl(req.body?.jobUrl);

  if (
    typeof jobId !== 'string' || !jobId.trim() || jobId.length > 512 ||
    !jobUrl ||
    (jobTitle !== undefined && (typeof jobTitle !== 'string' || jobTitle.length > 500)) ||
    (company !== undefined && (typeof company !== 'string' || company.length > 500))
  ) {
    return res.status(400).json({ message: 'Datos de empleo inválidos.' });
  }
  if (!req.userId) return res.status(401).json({ message: 'Sesión inválida.' });

  try {
    const savedJob = await saveJob({
      userId: req.userId,
      jobId: jobId.trim(),
      jobUrl,
      jobTitle: (jobTitle || '').trim(),
      company: (company || '').trim(),
    });
    return res.status(200).json({ message: 'Empleo guardado en tu lista.', savedJob });
  } catch (error) {
    return handleStoreError(error, res);
  }
});

/** GET /api/saved-jobs — devuelve únicamente los empleos del sujeto autenticado. */
router.get('/', proJobsAuthMiddleware, async (req: ProJobsAuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ message: 'Sesión inválida.' });
  try {
    return res.json({ savedJobs: await listSavedJobs(req.userId) });
  } catch (error) {
    return handleStoreError(error, res);
  }
});

/** DELETE /api/saved-jobs/:jobId — elimina solo el registro del usuario autenticado. */
router.delete('/:jobId', proJobsAuthMiddleware, async (req: ProJobsAuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ message: 'Sesión inválida.' });
  const jobId = req.params.jobId;
  if (!jobId || jobId.length > 512) {
    return res.status(400).json({ message: 'Identificador de empleo inválido.' });
  }
  try {
    const removed = await removeSavedJob(req.userId, jobId);
    if (!removed) return res.status(404).json({ message: 'El empleo no estaba guardado.' });
    return res.json({ message: 'Empleo eliminado de tu lista.' });
  } catch (error) {
    return handleStoreError(error, res);
  }
});

export default router;
