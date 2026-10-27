import { Router } from 'express';
import { proJobsAuthMiddleware, type ProJobsAuthRequest } from '../middleware/auth.js';
import { createSavedSearch, listSavedSearches, removeSavedSearch, StoreNotConfiguredError } from '../data/projobs-store.js';

const router = Router();
const FILTER_KEYS = new Set(['q','country','sector','modality','contract','jobType','experience','salaryMin','salaryMax','keywords']);
function storeError(error: unknown, res: any) {
  if (error instanceof StoreNotConfiguredError) return res.status(503).json({ code: 'PROJOBS_PERSISTENCE_NOT_CONFIGURED', message: 'Las alertas aún no están habilitadas.' });
  return res.status(503).json({ code: 'PROJOBS_PERSISTENCE_UNAVAILABLE', message: 'No se pudo guardar la alerta. Inténtalo de nuevo.' });
}
router.get('/', proJobsAuthMiddleware, async (req: ProJobsAuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ message: 'Sesión inválida.' });
  try { return res.json({ alerts: await listSavedSearches(req.userId) }); } catch (error) { return storeError(error, res); }
});
router.post('/', proJobsAuthMiddleware, async (req: ProJobsAuthRequest, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const frequency = req.body?.frequency === 'weekly' ? 'weekly' : req.body?.frequency === 'daily' ? 'daily' : null;
  const rawFilters = req.body?.filters;
  if (!req.userId) return res.status(401).json({ message: 'Sesión inválida.' });
  if (!req.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email) || req.email.length > 320) return res.status(400).json({ message: 'Tu sesión no incluye un correo válido para recibir alertas.' });
  if (!name || name.length > 120 || !frequency || !rawFilters || typeof rawFilters !== 'object' || Array.isArray(rawFilters)) return res.status(400).json({ message: 'Nombre, frecuencia o filtros inválidos.' });
  const filters: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(rawFilters as Record<string, unknown>)) {
    if (!FILTER_KEYS.has(key)) return res.status(400).json({ message: 'Hay un filtro no admitido.' });
    if (typeof value === 'string' && value.length <= 160 && value.trim()) filters[key] = value.trim();
    else if ((key === 'salaryMin' || key === 'salaryMax') && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000000000) filters[key] = value;
    else if (value !== '' && value !== null && value !== undefined) return res.status(400).json({ message: 'El valor de un filtro no es válido.' });
  }
  if (Object.keys(filters).length === 0) return res.status(400).json({ message: 'Selecciona al menos un criterio antes de crear una alerta.' });
  try {
    const alert = await createSavedSearch({ userId: req.userId, email: req.email, name, filters, frequency });
    return res.status(201).json({ message: 'Alerta guardada. La frecuencia seleccionada se aplicará cuando el envío de notificaciones esté configurado.', alert });
  } catch (error) { return storeError(error, res); }
});
router.delete('/:id', proJobsAuthMiddleware, async (req: ProJobsAuthRequest, res) => {
  if (!req.userId) return res.status(401).json({ message: 'Sesión inválida.' });
  const id = req.params.id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ message: 'Identificador de alerta inválido.' });
  try {
    const removed = await removeSavedSearch(req.userId, id);
    if (!removed) return res.status(404).json({ message: 'La alerta no existe.' });
    return res.json({ message: 'Alerta eliminada.' });
  } catch (error) { return storeError(error, res); }
});
export default router;
