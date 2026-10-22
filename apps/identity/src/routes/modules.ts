import { Router } from 'express';
import {
  getModuleAccess,
  grantModuleAccess,
  revokeModuleAccess,
} from '../controllers/profileController';
import { identityMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/me', identityMiddleware, getModuleAccess);
router.post('/grant', identityMiddleware, requireRole('admin'), grantModuleAccess);
router.post('/revoke', identityMiddleware, requireRole('admin'), revokeModuleAccess);

export default router;
