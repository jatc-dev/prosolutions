import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { config } from '../config';
import { logger } from '../utils/logger';
import { auditLog, extractRequestInfo } from '../utils/auditLog';
import { IdentityRequest } from '../middleware/auth';
import { setRefreshTokenCookie } from '../utils/cookies';
import { createTokenPair } from '../services/tokenService';
import { ensureDefaultModuleAccess } from '../services/moduleAccessService';
import { getUserPermissions } from '../services/adminAuthorization';
import { issuePasswordSession } from './authController';
import {
  consumeRecoveryCode,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  mfaKey,
  openChallenge,
  otpauthUrl,
  verifyTotp,
} from '../services/mfa';

const key = () => mfaKey(process.env, config.jwtSecret, config.isProduction);
const UNAVAILABLE = { message: 'Two-step verification is not available right now. Contact support.' };

type MfaUser = { id: string; mfaSecret: string | null; mfaLastStep: number | null; mfaRecoveryCodes: string[] };

/**
 * Checks a TOTP code or a recovery code and records its use (replay
 * protection / single use). Returns how it matched, or null.
 */
async function checkSecondFactor(user: MfaUser, code: unknown): Promise<'totp' | 'recovery' | null> {
  const value = typeof code === 'string' ? code.trim() : '';
  if (!value) return null;
  const encryption = key();
  const secret = encryption && user.mfaSecret ? decryptSecret(user.mfaSecret, encryption) : null;
  if (secret) {
    const step = verifyTotp(secret, value, user.mfaLastStep);
    if (step !== null) {
      // Conditional update: two concurrent requests cannot both use the same step.
      const updated = await prisma.user.updateMany({
        where: { id: user.id, OR: [{ mfaLastStep: null }, { mfaLastStep: { lt: step } }] },
        data: { mfaLastStep: step },
      });
      return updated.count === 1 ? 'totp' : null;
    }
  } else if (user.mfaSecret) {
    logger.error('MFA secret could not be decrypted (MFA_ENCRYPTION_KEY missing or changed); only recovery codes work', { userId: user.id });
  }
  const remaining = consumeRecoveryCode(user.mfaRecoveryCodes, value);
  if (remaining) {
    const updated = await prisma.user.updateMany({
      where: { id: user.id, mfaRecoveryCodes: { equals: user.mfaRecoveryCodes } },
      data: { mfaRecoveryCodes: remaining },
    });
    return updated.count === 1 ? 'recovery' : null;
  }
  return null;
}

const mfaSelect = { id: true, email: true, mfaSecret: true, mfaPendingSecret: true, mfaEnabledAt: true, mfaLastStep: true, mfaRecoveryCodes: true } as const;

async function currentUser(req: Request) {
  const userId = (req as IdentityRequest).userId;
  return userId ? prisma.user.findUnique({ where: { id: userId }, select: mfaSelect }) : null;
}

/** GET /api/auth/mfa */
export async function getMfaStatus(req: Request, res: Response) {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  return res.json({
    enabled: Boolean(user.mfaEnabledAt),
    enabledAt: user.mfaEnabledAt,
    recoveryCodesLeft: user.mfaRecoveryCodes.length,
    available: Boolean(key()),
  });
}

/** POST /api/auth/mfa/setup → new secret to scan; not active until confirmed. */
export async function startMfaSetup(req: Request, res: Response) {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (user.mfaEnabledAt) return res.status(409).json({ message: 'Two-step verification is already enabled' });
  const encryption = key();
  if (!encryption) return res.status(503).json(UNAVAILABLE);
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { mfaPendingSecret: encryptSecret(secret, encryption) } });
  res.set('Cache-Control', 'no-store');
  return res.json({ secret, otpauthUrl: otpauthUrl(user.email, secret) });
}

/** POST /api/auth/mfa/enable { code } → activates and returns recovery codes once. */
export async function enableMfa(req: Request, res: Response) {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (user.mfaEnabledAt) return res.status(409).json({ message: 'Two-step verification is already enabled' });
  const encryption = key();
  if (!encryption) return res.status(503).json(UNAVAILABLE);
  const secret = user.mfaPendingSecret ? decryptSecret(user.mfaPendingSecret, encryption) : null;
  if (!secret) return res.status(400).json({ message: 'Start the setup again' });
  const step = verifyTotp(secret, String(req.body?.code ?? ''), null);
  if (step === null) return res.status(400).json({ message: 'The code is not valid. Check the time on your phone and try again.' });
  const { codes, hashes } = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: user.mfaPendingSecret, mfaPendingSecret: null, mfaEnabledAt: new Date(), mfaLastStep: step, mfaRecoveryCodes: hashes },
  });
  auditLog('authentication.mfa_enabled', { userId: user.id, ...extractRequestInfo(req) });
  res.set('Cache-Control', 'no-store');
  return res.json({ enabled: true, recoveryCodes: codes });
}

/** POST /api/auth/mfa/disable { code } (TOTP or recovery code). */
export async function disableMfa(req: Request, res: Response) {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (!user.mfaEnabledAt) return res.status(409).json({ message: 'Two-step verification is not enabled' });
  if (!(await checkSecondFactor(user, req.body?.code))) return res.status(400).json({ message: 'The code is not valid' });
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: null, mfaPendingSecret: null, mfaEnabledAt: null, mfaLastStep: null, mfaRecoveryCodes: [] },
  });
  auditLog('authentication.mfa_disabled', { userId: user.id, ...extractRequestInfo(req) });
  return res.json({ enabled: false });
}

/** POST /api/auth/mfa/recovery-codes { code } → replaces all recovery codes. */
export async function regenerateRecoveryCodes(req: Request, res: Response) {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (!user.mfaEnabledAt) return res.status(409).json({ message: 'Two-step verification is not enabled' });
  if ((await checkSecondFactor(user, req.body?.code)) !== 'totp') return res.status(400).json({ message: 'Enter a code from your authenticator app' });
  const { codes, hashes } = generateRecoveryCodes();
  await prisma.user.update({ where: { id: user.id }, data: { mfaRecoveryCodes: hashes } });
  auditLog('authentication.mfa_recovery_codes_regenerated', { userId: user.id, ...extractRequestInfo(req) });
  res.set('Cache-Control', 'no-store');
  return res.json({ recoveryCodes: codes });
}

/**
 * POST /api/auth/mfa/verify { challenge, code } — second sign-in step after
 * the password (or Google). Issues the session exactly like a normal login.
 */
export async function verifyMfaChallenge(req: Request, res: Response) {
  const info = extractRequestInfo(req);
  const challenge = openChallenge(req.body?.challenge, config.jwtSecret);
  if (!challenge) return res.status(401).json({ message: 'The sign-in step expired. Sign in again.', code: 'mfa_challenge_expired' });
  const user = await prisma.user.findUnique({
    where: { id: challenge.userId },
    select: { ...mfaSelect, name: true, role: true, emailVerified: true, isActive: true },
  });
  if (!user || !user.isActive || !user.mfaEnabledAt) return res.status(401).json({ message: 'Sign in again.', code: 'mfa_challenge_expired' });

  const method = await checkSecondFactor(user, req.body?.code);
  if (!method) {
    auditLog('authentication.mfa_failed', { userId: user.id, ...info });
    return res.status(401).json({ message: 'The code is not valid', code: 'mfa_invalid_code' });
  }
  auditLog('authentication.mfa_verified', { userId: user.id, ...info, details: { method, provider: challenge.next ? 'google' : 'password' } });

  if (!challenge.next) return issuePasswordSession(req, res, user, challenge.rememberMe);

  // Google sign-in: same as the OAuth callback, the destination app exchanges the refresh cookie.
  const modules = await ensureDefaultModuleAccess(user.id, user.role);
  const { refreshToken } = await createTokenPair(
    { id: user.id, email: user.email, role: user.role, modules },
    { rememberMe: false, deviceName: 'Google', userAgent: req.get('user-agent') || null, ipAddress: req.ip || null },
  );
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => undefined);
  setRefreshTokenCookie(res, refreshToken, false);
  auditLog('authentication.oauth_login', { userId: user.id, ...info, details: { provider: 'google', mfa: method } });
  return res.json({ next: challenge.next });
}

/** POST /api/admin/users/:userId/mfa/reset — owner-only recovery for a locked-out account. */
export async function adminResetMfa(req: Request, res: Response) {
  const actor = req as IdentityRequest;
  const targetId = String(req.params.userId);
  if (actor.userId === targetId) return res.status(400).json({ message: 'Use your own security page to change your two-step verification', code: 'self_action' });
  const permissions = await getUserPermissions(actor.userId!);
  if (!permissions.includes('identity.security.manage')) return res.status(403).json({ message: 'Only a platform owner can reset two-step verification', code: 'owner_only' });
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, mfaEnabledAt: true } });
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (!target.mfaEnabledAt) return res.status(409).json({ message: 'Two-step verification is not enabled for this account' });
  await prisma.$transaction([
    prisma.user.update({ where: { id: targetId }, data: { mfaSecret: null, mfaPendingSecret: null, mfaEnabledAt: null, mfaLastStep: null, mfaRecoveryCodes: [] } }),
    prisma.session.updateMany({ where: { userId: targetId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  auditLog('admin.user.mfa_reset', { userId: targetId, ...extractRequestInfo(req), details: { adminId: actor.userId, adminEmail: actor.email } });
  return res.json({ message: 'Two-step verification reset; the account sessions were closed' });
}
