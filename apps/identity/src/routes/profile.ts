import { Router } from 'express';
import {
  getProfile,
  upsertProfile,
} from '../controllers/profileController';
import { identityMiddleware } from '../middleware/auth';

const router = Router();

router.get('/me', identityMiddleware, getProfile);
router.put('/me', identityMiddleware, upsertProfile);

export default router;
