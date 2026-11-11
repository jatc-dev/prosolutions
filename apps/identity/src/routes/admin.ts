import { Router } from 'express';
import { Module } from '@prisma/client';
import {
  listIdentityUsers,
} from '../controllers/adminController';
import {
  listAdminRoles,
  listAdminAssignments,
  assignAdminRole,
  revokeAdminRole,
} from '../controllers/adminRolesController';
import {
  getProcvStats,
  getProcvCharts,
  getProcvAuditLogs,
  getProcvSettings,
  updateProcvSetting,
  bulkUpdateProcvSettings,
  deleteProcvSetting,
} from '../controllers/procvAdminProxyController';
import { identityMiddleware, requirePermission } from '../middleware/auth';

const router = Router();

router.use(identityMiddleware);

// Identity administration
router.get('/users', requirePermission('identity.users.read'), listIdentityUsers);
router.get('/roles', requirePermission('identity.roles.read'), listAdminRoles);
router.get('/role-assignments', requirePermission('identity.roles.read'), listAdminAssignments);
router.post('/role-assignments', requirePermission('identity.roles.manage'), assignAdminRole);
router.delete('/role-assignments/:assignmentId', requirePermission('identity.roles.manage'), revokeAdminRole);

// ProCV administration remains owned by ProCV and is permission-gated centrally.
router.get('/procv/stats', requirePermission('procv.analytics.read', Module.PROCV), getProcvStats);
router.get('/procv/charts', requirePermission('procv.analytics.read', Module.PROCV), getProcvCharts);
router.get('/procv/audit-logs', requirePermission('procv.audit.read', Module.PROCV), getProcvAuditLogs);
router.get('/procv/settings', requirePermission('procv.settings.read', Module.PROCV), getProcvSettings);
router.put('/procv/settings/:key', requirePermission('procv.settings.manage', Module.PROCV), updateProcvSetting);
router.put('/procv/settings', requirePermission('procv.settings.manage', Module.PROCV), bulkUpdateProcvSettings);
router.delete('/procv/settings/:key', requirePermission('procv.settings.manage', Module.PROCV), deleteProcvSetting);

export default router;
