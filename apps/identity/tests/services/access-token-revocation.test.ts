import assert from 'node:assert/strict';
import { after, afterEach, test } from 'node:test';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';
import prisma from '../../src/prismaClient';
import { identityMiddleware } from '../../src/middleware/auth';

type MockSession = {
  id: string;
  userId: string;
  jti: string;
  refreshToken: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastAccessedAt: Date;
};

const originalFindUnique = prisma.session.findUnique;
const originalUpdate = prisma.session.update;
let currentSession: MockSession | null = null;

(prisma.session as any).findUnique = async ({ where }: { where: { jti?: string } }) =>
  currentSession && currentSession.jti === where.jti ? { ...currentSession } : null;
(prisma.session as any).update = async ({ where, data }: any) => {
  if (!currentSession || currentSession.id !== where.id) {
    throw new Error('Session not found');
  }
  currentSession = { ...currentSession, ...data };
  return currentSession;
};

function responseRecorder() {
  const result: { statusCode: number; body?: unknown; clearedCookie: boolean } = {
    statusCode: 200,
    clearedCookie: false,
  };
  const res: any = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
    clearCookie() {
      result.clearedCookie = true;
      return this;
    },
    cookie() {
      return this;
    },
  };
  return { res, result };
}

function accessToken(jti?: string) {
  return jwt.sign(
    { sub: 'user-123', ...(jti ? { jti } : {}) },
    config.jwtSecret,
    {
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: '5m',
    },
  );
}

function resetSession(revokedAt: Date | null = null) {
  currentSession = {
    id: 'session-123',
    userId: 'user-123',
    jti: 'session-jti-123',
    refreshToken: 'refresh-token-123',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt,
    lastAccessedAt: new Date(),
  };
}

afterEach(() => {
  currentSession = null;
});

test('rejects an access JWT saved before logout when its session is revoked and no refresh cookie is sent', async () => {
  resetSession();
  const savedAccessToken = accessToken('session-jti-123');

  // Simulate logout revoking the persisted session while the client retains its
  // already-issued access JWT. No refresh cookie is sent on the protected call.
  currentSession!.revokedAt = new Date();

  const { res, result } = responseRecorder();
  let nextCalled = false;
  await identityMiddleware(
    { headers: { authorization: `Bearer ${savedAccessToken}` }, cookies: {} } as any,
    res,
    (() => {
      nextCalled = true;
    }) as any,
  );

  assert.equal(result.statusCode, 401);
  assert.equal(nextCalled, false);
  assert.deepEqual(result.body, { message: 'Session revoked or expired' });
});

test('rejects legacy access JWTs that are not bound to a persisted session', async () => {
  resetSession();
  const { res, result } = responseRecorder();
  let nextCalled = false;
  await identityMiddleware(
    { headers: { authorization: `Bearer ${accessToken()}` }, cookies: {} } as any,
    res,
    (() => {
      nextCalled = true;
    }) as any,
  );

  assert.equal(result.statusCode, 401);
  assert.equal(nextCalled, false);
  assert.deepEqual(result.body, { message: 'Session token missing' });
});

test('accepts an active session-bound access JWT without requiring the refresh cookie', async () => {
  resetSession();
  const { res, result } = responseRecorder();
  let nextCalled = false;
  await identityMiddleware(
    { headers: { authorization: `Bearer ${accessToken('session-jti-123')}` }, cookies: {} } as any,
    res,
    (() => {
      nextCalled = true;
    }) as any,
  );

  assert.equal(result.statusCode, 200);
  assert.equal(nextCalled, true);
});

after(() => {
  (prisma.session as any).findUnique = originalFindUnique;
  (prisma.session as any).update = originalUpdate;
});
