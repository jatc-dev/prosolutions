import { Router } from 'express';
import { deleteAccount, exportAccount, getConsents, updateConsent } from '../controllers/accountController';
import { identityMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

/** Personal-data rights: consents, export (access/portability) and erasure. */
const router = Router();

router.get('/consents', identityMiddleware, getConsents);
router.put('/consents/:purpose', identityMiddleware, updateConsent);
router.get('/export', identityMiddleware, exportAccount);
router.delete('/', authLimiter, identityMiddleware, deleteAccount);

export default router;
