import { Router } from 'express';
import {
  createModule,
  getModuleAccess,
  getModuleAdminMetrics,
  getModuleCatalog,
  grantModuleAccess,
  listUsersForModuleAdmin,
  revokeModuleAccess,
  updateModule,
  updateAdminUser,
} from '../controllers/profileController';
import { identityMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// Catalog metadata is public; account entitlements are always resolved separately.
router.get('/catalog', getModuleCatalog);
router.post('/catalog', identityMiddleware, requireRole('admin'), createModule);
router.patch('/catalog/:code', identityMiddleware, requireRole('admin'), updateModule);

router.get('/me', identityMiddleware, getModuleAccess);
router.get('/admin/users', identityMiddleware, requireRole('admin'), listUsersForModuleAdmin);
router.patch('/admin/users/:id', identityMiddleware, requireRole('admin'), updateAdminUser);
router.get('/admin/metrics', identityMiddleware, requireRole('admin'), getModuleAdminMetrics);
router.post('/grant', identityMiddleware, requireRole('admin'), grantModuleAccess);
router.post('/revoke', identityMiddleware, requireRole('admin'), revokeModuleAccess);

export default router;
