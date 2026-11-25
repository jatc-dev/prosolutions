import { Router } from 'express';
import { Module } from '@prisma/client';
import {
  deleteIdentityUser,
  getIdentityUser,
  listIdentityAudit,
  listIdentityUsers,
  restoreIdentityUser,
  revokeIdentityUserSessions,
  updateIdentityUser,
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
import { adminResetMfa } from '../controllers/mfaController';
import { getAdminAdsSettings, updateAdminAdsSettings } from '../controllers/platformController';
import {
  listCompaniesForReview,
  listJobsForModeration,
  moderateCompany,
  moderateJob,
} from '../controllers/projobsAdminProxyController';

const router = Router();

router.use(identityMiddleware);

// Identity administration
router.get('/users', requirePermission('identity.users.read'), listIdentityUsers);
router.get('/users/:userId', requirePermission('identity.users.read'), getIdentityUser);
router.patch('/users/:userId', requirePermission('identity.users.manage'), updateIdentityUser);
router.post('/users/:userId/sessions/revoke', requirePermission('identity.sessions.revoke'), revokeIdentityUserSessions);
// Owner only (identity.users.delete): erase now or on a scheduled date; restore cancels a schedule.
router.delete('/users/:userId', requirePermission('identity.users.delete'), deleteIdentityUser);
router.post('/users/:userId/restore', requirePermission('identity.users.delete'), restoreIdentityUser);
router.post('/users/:userId/mfa/reset', requirePermission('identity.security.manage'), adminResetMfa);
router.get('/audit-logs', requirePermission('identity.audit.read'), listIdentityAudit);
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

// Platform settings (advertising)
router.get('/platform/ads', requirePermission('platform.settings.manage'), getAdminAdsSettings);
router.put('/platform/ads', requirePermission('platform.settings.manage'), updateAdminAdsSettings);

// ProJobs moderation (proxied to ProJobs' internal API)
router.get('/projobs/companies', requirePermission('projobs.catalog.read', Module.PROJOBS), listCompaniesForReview);
router.post('/projobs/companies/:companyId/verification', requirePermission('projobs.catalog.moderate', Module.PROJOBS), moderateCompany);
router.get('/projobs/jobs', requirePermission('projobs.catalog.read', Module.PROJOBS), listJobsForModeration);
router.post('/projobs/jobs/:jobId/moderation', requirePermission('projobs.catalog.moderate', Module.PROJOBS), moderateJob);

export default router;
