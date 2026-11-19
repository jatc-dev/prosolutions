import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { deleteMyData, exportMyData } from '../controllers/meController';

const router = Router();

router.use(authMiddleware);
router.get('/export', exportMyData);
router.delete('/', deleteMyData);

export default router;
