import { Router } from 'express';
import {
  login,
  register,
  logout,
  me,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from '../controllers/authController';
import { refreshToken } from '../controllers/refreshController';
import { introspectToken } from '../controllers/introspectController';
import {
  refreshLimiter,
  authLimiter,
  verificationLimiter,
  passwordResetLimiter,
  introspectLimiter,
} from '../middleware/rateLimiter';
import { identityMiddleware } from '../middleware/auth';
import { listSessions, revokeSessionById, revokeOtherSessions } from '../controllers/sessionController';
import { googleCallback, listProviders, startGoogleLogin } from '../controllers/googleAuthController';
import { disableMfa, enableMfa, getMfaStatus, regenerateRecoveryCodes, startMfaSetup, verifyMfaChallenge } from '../controllers/mfaController';

const router = Router();

router.get('/providers', listProviders);
router.get('/google/start', authLimiter, startGoogleLogin);
router.get('/google/callback', authLimiter, googleCallback);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
// Two-step verification (optional, TOTP + recovery codes).
router.post('/mfa/verify', authLimiter, verifyMfaChallenge);
router.get('/mfa', identityMiddleware, getMfaStatus);
router.post('/mfa/setup', identityMiddleware, startMfaSetup);
router.post('/mfa/enable', authLimiter, identityMiddleware, enableMfa);
router.post('/mfa/disable', authLimiter, identityMiddleware, disableMfa);
router.post('/mfa/recovery-codes', authLimiter, identityMiddleware, regenerateRecoveryCodes);
router.post('/refresh', refreshLimiter, refreshToken);
router.post('/logout', logout);
router.post('/introspect', introspectLimiter, introspectToken);
router.get('/me', identityMiddleware, me);
router.get('/sessions', identityMiddleware, listSessions);
router.delete('/sessions/:sessionId', identityMiddleware, revokeSessionById);
router.post('/sessions/revoke-others', identityMiddleware, revokeOtherSessions);
router.put('/profile', identityMiddleware, updateProfile);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.post('/verify-email', verificationLimiter, verifyEmail);
router.post('/resend-verification', verificationLimiter, resendVerification);

export default router;
