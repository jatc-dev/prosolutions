import { Router } from 'express';
import { proJobsAuthMiddleware, type ProJobsAuthRequest } from '../middleware/auth.js';
import { getCareerProgress, StoreNotConfiguredError } from '../data/projobs-store.js';
const router = Router();
router.get('/', proJobsAuthMiddleware, async (req: ProJobsAuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ message: 'Sesión inválida.' });
  try { return res.json(await getCareerProgress(req.userId)); }
  catch (error) {
    if (error instanceof StoreNotConfiguredError) return res.status(503).json({ code: 'PROJOBS_PERSISTENCE_NOT_CONFIGURED', message: 'El panel de progreso aún no está habilitado.' });
    return res.status(503).json({ code: 'PROJOBS_PERSISTENCE_UNAVAILABLE', message: 'No se pudo cargar el progreso profesional.' });
  }
});
export default router;
