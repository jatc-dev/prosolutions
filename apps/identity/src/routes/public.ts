import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getPublicAdsSettings, submitContact } from '../controllers/platformController';

/** Unauthenticated, read-mostly platform endpoints used by the public pages. */
const router = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: process.env.NODE_ENV === 'production' ? 5 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Has enviado demasiados mensajes. Inténtalo de nuevo en una hora.' },
});

router.get('/platform/ads', getPublicAdsSettings);
router.post('/contact', contactLimiter, submitContact);

export default router;
