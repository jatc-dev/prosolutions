import { Router } from 'express';
import { listIdentityUsers } from '../controllers/adminController';
import { getProcvStats, getProcvCharts, getProcvAuditLogs, getProcvSettings, updateProcvSetting, bulkUpdateProcvSettings, deleteProcvSetting } from '../controllers/procvAdminProxyController';
import { identityMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All account administration lives in Identity; the module APIs never own users.
router.use(identityMiddleware, requireRole('admin'));
router.get('/users', listIdentityUsers);

// ProCV administration is exposed centrally through ProIdentity.
router.get('/procv/stats', getProcvStats);
router.get('/procv/charts', getProcvCharts);
router.get('/procv/audit-logs', getProcvAuditLogs);
router.get('/procv/settings', getProcvSettings);
router.put('/procv/settings/:key', updateProcvSetting);
router.put('/procv/settings', bulkUpdateProcvSettings);
router.delete('/procv/settings/:key', deleteProcvSetting);

export default router;
