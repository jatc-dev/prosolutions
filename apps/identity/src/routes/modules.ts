import { Router } from 'express';
import {
  getModuleAccess,
  grantModuleAccess,
  revokeModuleAccess,
} from '../controllers/profileController';
import { identityMiddleware, requirePermission } from '../middleware/auth';

const router = Router();

router.get('/me', identityMiddleware, getModuleAccess);
router.post('/grant', identityMiddleware, requirePermission('identity.users.manage'), grantModuleAccess);
router.post('/revoke', identityMiddleware, requireRole('admin'), revokeModuleAccess);

export default router;
