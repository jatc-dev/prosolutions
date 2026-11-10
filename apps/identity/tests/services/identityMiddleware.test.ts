import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import jwt from 'jsonwebtoken';
import prisma from '../../src/prismaClient';
import { config } from '../../src/config';
import { identityMiddleware, type IdentityRequest } from '../../src/middleware/auth';
import { deriveRefreshSuccessorJti } from '../../src/utils/refreshRotation';

const originalFindUnique = prisma.session.findUnique;
const originalUpdate = prisma.session.update;

after(() => {
  (prisma.session as any).findUnique = originalFindUnique;
  (prisma.session as any).update = originalUpdate;
});

function signedToken(sub: string, jti: string): string {
  return jwt.sign(
    { sub, jti, email: 'qa@example.invalid', role: 'user', modules: ['PROCV'] },
    config.jwtSecret,
    { issuer: config.issuer, audience: config.audience, expiresIn: '15m' },
  );
}

function session(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-current',
    userId: 'user-123',
    refreshToken: 'refresh-current',
    jti: 'successor-jti',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    revokedAt: null,
    lastAccessedAt: new Date(),
    rememberMe: false,
    deviceName: 'Windows',
    userAgent: 'Chrome/156 Windows',
    ipAddress: null,
    ...overrides,
  };
}

function harness(cookieToken: string | undefined) {
  const response: { statusCode: number; body?: unknown; clearedCookie: boolean } = {
    statusCode: 200,
    clearedCookie: false,
  };
  const res: any = {
    status(code: number) {
      response.statusCode = code;
      return this;
    },
    json(body: unknown) {
      response.body = body;
      return this;
    },
    clearCookie(name: string) {
      if (name === 'refreshToken') response.clearedCookie = true;
      return this;
    },
  };
  const req: any = {
    headers: {
      authorization: `Bearer ${signedToken('user-123', 'predecessor-jti')}`,
      'user-agent': 'Chrome/156 Windows',
    },
    cookies: cookieToken ? { refreshToken: cookieToken } : {},
    get(name: string) {
      return name.toLowerCase() === 'user-agent' ? 'Chrome/156 Windows' : undefined;
    },
    ip: '127.0.0.1',
  };
  return { req: req as IdentityRequest, res, response };
}

test('accepts a stale app access token only when the current cookie is its exact rotation successor', async () => {
  const rotationAt = new Date();
  const predecessorRefreshToken = 'refresh-old';
  const successorJti = deriveRefreshSuccessorJti(predecessorRefreshToken, config.jwtSecret);
  const predecessor = session({
    id: 'session-predecessor',
    refreshToken: predecessorRefreshToken,
    jti: 'predecessor-jti',
    revokedAt: rotationAt,
    lastAccessedAt: rotationAt,
  });
  const successor = session({ jti: successorJti, createdAt: rotationAt });
  const refreshToken = signedToken('user-123', successorJti);
  const { req, res, response } = harness(refreshToken);
  let updatedSessionId: string | undefined;
  let nextCalled = false;

  (prisma.session as any).findUnique = async ({ where }: any) =>
    where.jti === 'predecessor-jti' ? predecessor :
      where.refreshToken === refreshToken ? successor : null;
  (prisma.session as any).update = async ({ where }: any) => {
    updatedSessionId = where.id;
    return successor;
  };

  await identityMiddleware(req, res, () => { nextCalled = true; });

  assert.equal(response.statusCode, 200);
  assert.equal(response.clearedCookie, false);
  assert.equal(nextCalled, true);
  assert.equal(req.sessionId, 'session-current');
  assert.equal(updatedSessionId, 'session-current');
});

test('rejects an explicitly revoked session when another same-user browser session is active', async () => {
  const predecessor = session({
    id: 'session-explicitly-revoked',
    refreshToken: 'refresh-revoked',
    jti: 'predecessor-jti',
    revokedAt: new Date(),
    // Explicit revocation does not stamp the rotation marker on lastAccessedAt.
    lastAccessedAt: new Date(Date.now() - 60_000),
  });
  const unrelatedSuccessor = session();
  const refreshToken = signedToken('user-123', unrelatedSuccessor.jti);
  const { req, res, response } = harness(refreshToken);
  let nextCalled = false;

  (prisma.session as any).findUnique = async ({ where }: any) =>
    where.jti === 'predecessor-jti' ? predecessor :
      where.refreshToken === refreshToken ? unrelatedSuccessor : null;

  await identityMiddleware(req, res, () => { nextCalled = true; });

  assert.equal(response.statusCode, 401);
  assert.equal(response.clearedCookie, true);
  assert.equal(nextCalled, false);
});

test('rejects and clears a refresh cookie belonging to another user', async () => {
  const predecessor = session({
    id: 'session-predecessor',
    jti: 'predecessor-jti',
    revokedAt: new Date(),
  });
  const otherUserSession = session({
    id: 'other-user-session',
    userId: 'user-456',
    jti: 'other-user-jti',
    refreshToken: 'refresh-other-user',
    userAgent: 'Chrome/156 Windows',
  });
  const refreshToken = signedToken('user-456', 'other-user-jti');
  const { req, res, response } = harness(refreshToken);
  let nextCalled = false;

  (prisma.session as any).findUnique = async ({ where }: any) =>
    where.jti === 'predecessor-jti' ? predecessor :
      where.refreshToken === refreshToken ? otherUserSession : null;

  await identityMiddleware(req, res, () => { nextCalled = true; });

  assert.equal(response.statusCode, 401);
  assert.equal(response.clearedCookie, true);
  assert.equal(nextCalled, false);
});

test('rejects a revoked access session when no current refresh cookie is present', async () => {
  const predecessor = session({
    id: 'session-predecessor',
    jti: 'predecessor-jti',
    revokedAt: new Date(),
  });
  const { req, res, response } = harness(undefined);
  let nextCalled = false;

  (prisma.session as any).findUnique = async () => predecessor;

  await identityMiddleware(req, res, () => { nextCalled = true; });

  assert.equal(response.statusCode, 401);
  assert.equal(response.clearedCookie, false);
  assert.equal(nextCalled, false);
});
