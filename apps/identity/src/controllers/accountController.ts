import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prismaClient';
import { IdentityRequest } from '../middleware/auth';
import { auditLog, extractRequestInfo } from '../utils/auditLog';
import { clearRefreshTokenCookie } from '../utils/cookies';
import { logger } from '../utils/logger';
import {
  CONSENT_PURPOSES,
  getConsentHistory,
  getConsentStatus,
  isConsentPurpose,
  recordConsent,
} from '../services/consentService';

function requireUser(req: Request, res: Response): string | null {
  const userId = (req as IdentityRequest).userId;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return null;
  }
  return userId;
}

export async function getConsents(req: Request, res: Response) {
  const userId = requireUser(req, res);
  if (!userId) return;
  return res.json({ consents: await getConsentStatus(userId) });
}

export async function updateConsent(req: Request, res: Response) {
  const userId = requireUser(req, res);
  if (!userId) return;
  const purpose = req.params.purpose;
  const granted = (req.body as { granted?: unknown })?.granted;
  if (!isConsentPurpose(purpose)) return res.status(404).json({ message: 'Unknown consent purpose' });
  if (typeof granted !== 'boolean') return res.status(400).json({ message: '`granted` must be a boolean' });
  if (!granted && CONSENT_PURPOSES[purpose].required) {
    return res.status(409).json({
      message: 'This consent is required to keep an account. Delete the account to withdraw it.',
      code: 'consent_required',
    });
  }
  const info = extractRequestInfo(req);
  await recordConsent({ userId, purpose, granted, source: 'account_settings', ...info });
  auditLog(granted ? 'account.consent_granted' : 'account.consent_revoked', {
    userId,
    ...info,
    details: { purpose, version: CONSENT_PURPOSES[purpose].version },
  });
  return res.json({ consents: await getConsentStatus(userId) });
}

/**
 * Right of access / portability: everything ProIdentity stores about the user
 * (never secrets such as password or token hashes).
 */
export async function exportAccount(req: Request, res: Response) {
  const userId = requireUser(req, res);
  if (!userId) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      professionalProfile: true,
      moduleAccess: { select: { module: true, grantedAt: true } },
      sessions: {
        where: { revokedAt: null },
        select: { createdAt: true, lastAccessedAt: true, expiresAt: true, deviceName: true, userAgent: true, ipAddress: true },
      },
    },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const auditTrail = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { action: true, createdAt: true, ipAddress: true, userAgent: true },
  });

  auditLog('account.data_exported', { userId, ...extractRequestInfo(req) });
  res.setHeader('Content-Disposition', 'attachment; filename="prosolutions-identity-export.json"');
  return res.json({
    service: 'ProIdentity',
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      signInWithGoogle: Boolean(user.googleSub),
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      preferences: user.preferences,
    },
    professionalProfile: user.professionalProfile,
    modules: user.moduleAccess,
    activeSessions: user.sessions,
    consents: await getConsentHistory(userId),
    securityEvents: auditTrail,
  });
}

/**
 * Right of erasure. Requires typing the account email, plus the password for
 * password accounts. Deletes the user (cascade: sessions, tokens, profile,
 * modules, consents) and anonymises the user's audit trail. Module data
 * (ProCV CVs, ProJobs applications) is erased by each module's own
 * DELETE /me endpoint, which the account page calls first.
 */
export async function deleteAccount(req: Request, res: Response) {
  const userId = requireUser(req, res);
  if (!userId) return;
  const { confirmEmail, password } = (req.body ?? {}) as { confirmEmail?: unknown; password?: unknown };
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (typeof confirmEmail !== 'string' || confirmEmail.trim().toLowerCase() !== user.email) {
    return res.status(400).json({ message: 'Type your account email to confirm', code: 'confirmation_mismatch' });
  }
  if (!user.googleSub || typeof password === 'string') {
    const ok = typeof password === 'string' && (await bcrypt.compare(password, user.passwordHash).catch(() => false));
    if (!ok) return res.status(401).json({ message: 'Incorrect password', code: 'invalid_password' });
  }

  const info = extractRequestInfo(req);
  try {
    await prisma.$transaction([
      prisma.auditLog.updateMany({
        where: { userId },
        data: { userId: null, ipAddress: null, userAgent: null, details: { anonymized: true } },
      }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
  } catch (error) {
    logger.error('Account deletion failed', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ message: 'Account deletion failed' });
  }

  // Record the erasure itself without linking it to the deleted identity.
  auditLog('account.deleted', { ipAddress: info.ipAddress, userAgent: info.userAgent, details: { at: new Date().toISOString() } });
  clearRefreshTokenCookie(res);
  return res.json({ message: 'Account deleted' });
}
