import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../prismaClient';
import { config } from '../config';
import { logger } from '../utils/logger';
import { auditLog, extractRequestInfo } from '../utils/auditLog';
import { setRefreshTokenCookie } from '../utils/cookies';
import { createTokenPair } from '../services/tokenService';
import { ensureDefaultModuleAccess, getDefaultModules } from '../services/moduleAccessService';
import { recordConsent } from '../services/consentService';
import { CHALLENGE_TTL_MS, sealChallenge } from '../services/mfa';
import {
  buildAuthorizationUrl,
  createPkcePair,
  exchangeCode,
  openTransaction,
  readGoogleConfig,
  safeEqual,
  sealTransaction,
  verifyGoogleIdToken,
} from '../services/googleOAuth';

const TRANSACTION_TTL_MS = 10 * 60 * 1000;
const TRANSACTION_COOKIE = `g_oauth${config.cookieNameSuffix}`;
const TRANSACTION_PATH = '/api/auth/google';

function coreLoginUrl(): string {
  return (process.env.CORE_LOGIN_URL || 'https://prosolutions.page/login').trim();
}

/** Only first-party origins (the CORS allow-list) may receive the user back. */
export function safeNextUrl(raw: unknown): string {
  const fallback = coreLoginUrl().replace(/\/login$/, '/dashboard');
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    const url = new URL(raw);
    const httpsOrLocal = url.protocol === 'https:' || (!config.isProduction && url.protocol === 'http:');
    if (!httpsOrLocal || !config.allowedOrigins.includes(url.origin)) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

function failureRedirect(res: Response, reason: string) {
  const url = new URL(coreLoginUrl());
  url.searchParams.set('oauth_error', reason);
  return res.redirect(302, url.toString());
}

/** GET /api/auth/providers — lets the login UI show only configured providers. */
export function listProviders(_req: Request, res: Response) {
  return res.json({ google: Boolean(readGoogleConfig()) });
}

/** GET /api/auth/google/start?next=<url>&privacy=1 */
export function startGoogleLogin(req: Request, res: Response) {
  const google = readGoogleConfig();
  if (!google) return failureRedirect(res, 'google_not_configured');

  const { verifier, challenge } = createPkcePair();
  const state = crypto.randomBytes(24).toString('base64url');
  const sealed = sealTransaction(
    {
      state,
      verifier,
      next: safeNextUrl(req.query.next),
      privacyAccepted: req.query.privacy === '1',
      exp: Date.now() + TRANSACTION_TTL_MS,
    },
    config.jwtSecret,
  );
  res.cookie(TRANSACTION_COOKIE, sealed, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: TRANSACTION_PATH,
    maxAge: TRANSACTION_TTL_MS,
  });
  return res.redirect(302, buildAuthorizationUrl(google, state, challenge));
}

/** GET /api/auth/google/callback?code&state */
export async function googleCallback(req: Request, res: Response) {
  const google = readGoogleConfig();
  const transaction = openTransaction(req.cookies?.[TRANSACTION_COOKIE], config.jwtSecret);
  res.clearCookie(TRANSACTION_COOKIE, { path: TRANSACTION_PATH });
  const info = extractRequestInfo(req);

  if (!google) return failureRedirect(res, 'google_not_configured');
  if (typeof req.query.error === 'string') return failureRedirect(res, 'google_cancelled');
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  if (!transaction || !code || !state || !safeEqual(state, transaction.state)) {
    auditLog('authentication.oauth_failed', { ...info, details: { provider: 'google', reason: 'invalid_state' } });
    return failureRedirect(res, 'invalid_state');
  }

  try {
    const idToken = await exchangeCode(google, code, transaction.verifier);
    const identity = await verifyGoogleIdToken(idToken, google.clientId);
    if (!identity.emailVerified) {
      auditLog('authentication.oauth_failed', { ...info, details: { provider: 'google', reason: 'email_not_verified' } });
      return failureRedirect(res, 'email_not_verified');
    }

    let user = await prisma.user.findUnique({ where: { googleSub: identity.sub } });
    let created = false;
    if (!user) {
      const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
      if (byEmail) {
        // Google verified ownership of this address: link the accounts.
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleSub: identity.sub, emailVerified: true },
        });
      } else {
        const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
        user = await prisma.$transaction(async (tx) => {
          const createdUser = await tx.user.create({
            data: {
              email: identity.email,
              name: identity.name,
              passwordHash,
              emailVerified: true,
              googleSub: identity.sub,
            },
          });
          for (const module of getDefaultModules(createdUser.role)) {
            await tx.moduleAccess.create({ data: { userId: createdUser.id, module } });
          }
          if (transaction.privacyAccepted) {
            await recordConsent({
              userId: createdUser.id,
              purpose: 'privacy_policy',
              granted: true,
              source: 'google_signup',
              ...info,
              client: tx,
            });
          }
          return createdUser;
        });
        created = true;
      }
    }

    if (!user.isActive) return failureRedirect(res, 'account_inactive');

    if (user.mfaEnabledAt) {
      // Second step on the login page; the challenge travels in the fragment (never sent to servers or logs).
      auditLog('authentication.mfa_challenge', { userId: user.id, ...info, details: { provider: 'google' } });
      const challenge = sealChallenge({ userId: user.id, rememberMe: false, next: transaction.next, exp: Date.now() + CHALLENGE_TTL_MS }, config.jwtSecret);
      const url = new URL(coreLoginUrl());
      url.hash = `mfa=${encodeURIComponent(challenge)}`;
      return res.redirect(302, url.toString());
    }

    const modules = await ensureDefaultModuleAccess(user.id, user.role);
    const { refreshToken } = await createTokenPair(
      { id: user.id, email: user.email, role: user.role, modules },
      { rememberMe: false, deviceName: 'Google', userAgent: req.get('user-agent') || null, ipAddress: req.ip || null },
    );
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => undefined);
    setRefreshTokenCookie(res, refreshToken, false);
    auditLog(created ? 'authentication.register_success' : 'authentication.oauth_login', {
      userId: user.id,
      ...info,
      details: { provider: 'google' },
    });
    // The destination app exchanges the refresh cookie for an access token.
    return res.redirect(302, transaction.next);
  } catch (error) {
    logger.warn('Google sign-in failed', { error: error instanceof Error ? error.message : String(error) });
    auditLog('authentication.oauth_failed', { ...info, details: { provider: 'google', reason: 'exchange_failed' } });
    return failureRedirect(res, 'google_failed');
  }
}
