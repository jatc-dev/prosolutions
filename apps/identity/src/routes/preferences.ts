import { Router } from 'express';
import { getUserPreferences, updateUserPreferences } from '../controllers/preferencesController';
import { identityMiddleware } from '../middleware/auth';

const router = Router();

router.get('/me', identityMiddleware, getUserPreferences);
router.put('/me', identityMiddleware, updateUserPreferences);

export default router;
