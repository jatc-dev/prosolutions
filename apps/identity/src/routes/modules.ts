import { Router } from 'express';
import {
  getModuleAccess,
  grantModuleAccess,
  revokeModuleAccess,
} from '../controllers/profileController';
import { identityMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/me/modules', identityMiddleware, getModuleAccess);
router.post('/modules/grant', identityMiddleware, requireRole('admin'), grantModuleAccess);
router.post('/modules/revoke', identityMiddleware, requireRole('admin'), revokeModuleAccess);

export default router;
