import { Router } from 'express';
import { listIdentityUsers } from '../controllers/adminController';
import { identityMiddleware, requireRole } from '../middleware/auth';

const router = Router();

// All account administration lives in Identity; the module APIs never own users.
router.use(identityMiddleware, requireRole('admin'));
router.get('/users', listIdentityUsers);

export default router;
