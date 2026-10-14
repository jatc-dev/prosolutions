import { Router } from 'express';
import {
  login,
  register,
  refreshToken,
  logout,
  me,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import {
  refreshLimiter,
  authLimiter,
  verificationLimiter,
  passwordResetLimiter,
} from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refreshLimiter, refreshToken);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);
router.put('/profile', authMiddleware, updateProfile);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/verify-email', verificationLimiter, verifyEmail);
router.post('/resend-verification', verificationLimiter, resendVerification);

export default router;
