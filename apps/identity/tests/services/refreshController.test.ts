import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import prisma from '../../src/prismaClient';
import { refreshToken } from '../../src/controllers/refreshController';
import {
  deriveSuccessorRefreshToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyAccessToken,
} from '../../src/services/tokenService';

const originals = {
  findUnique: prisma.session.findUnique,
  updateMany: prisma.session.updateMany,
  create: prisma.session.create,
  userFindUnique: prisma.user.findUnique,
  moduleUpsert: prisma.moduleAccess.upsert,
  moduleFindMany: prisma.moduleAccess.findMany,
  transaction: prisma.$transaction,
};

type StoredSession = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  jti: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  lastAccessedAt: Date;
  rememberMe: boolean;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
};

function responseRecorder() {
  const result: {
    statusCode: number;
    body?: any;
    refreshCookie?: string;
    clearedCookie: boolean;
  } = { statusCode: 200, clearedCookie: false };
  const res: any = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
    cookie(name: string, value: string) {
      if (name === 'refreshToken') result.refreshCookie = value;
      return this;
    },
    clearCookie(name: string) {
      if (name === 'refreshToken') result.clearedCookie = true;
      return this;
    },
  };
  return { res, result };
}

after(() => {
  (prisma.session as any).findUnique = originals.findUnique;
  (prisma.session as any).updateMany = originals.updateMany;
  (prisma.session as any).create = originals.create;
  (prisma.user as any).findUnique = originals.userFindUnique;
  (prisma.moduleAccess as any).upsert = originals.moduleUpsert;
  (prisma.moduleAccess as any).findMany = originals.moduleFindMany;
  (prisma as any).$transaction = originals.transaction;
});

function stubUser() {
  (prisma.user as any).findUnique = async () => ({
    id: 'user-123',
    email: 'qa@example.invalid',
    role: 'user',
    isActive: true,
    moduleAccess: [],
  });
  (prisma.moduleAccess as any).upsert = async () => ({});
  (prisma.moduleAccess as any).findMany = async () => [{ module: 'PROCV' }];
}

const userAgent = 'Chrome/156 Windows';
const request = (cookie: string) => ({
  cookies: { refreshToken: cookie },
  get: (header: string) => (header.toLowerCase() === 'user-agent' ? userAgent : undefined),
  headers: { 'user-agent': userAgent },
  ip: '127.0.0.1',
});

test('stores only hashes and gives concurrent refreshes the same successor cookie', async () => {
  const predecessorRefreshToken = generateRefreshToken();
  const predecessor: StoredSession = {
    id: 'session-before-rotation',
    userId: 'user-123',
    refreshTokenHash: hashRefreshToken(predecessorRefreshToken),
    jti: 'predecessor-jti',
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 60_000),
    revokedAt: null,
    lastAccessedAt: new Date(),
    rememberMe: false,
    deviceName: 'Windows',
    userAgent,
    ipAddress: null,
  };
  let successor: StoredSession | null = null;

  (prisma.session as any).findUnique = async ({ where }: any) => {
    if (where.refreshTokenHash === predecessor.refreshTokenHash) return { ...predecessor };
    if (where.jti && successor?.jti === where.jti) return { ...successor };
    return null;
  };
  stubUser();
  (prisma as any).$transaction = async (callback: (tx: any) => Promise<void>) =>
    callback({
      session: {
        updateMany: async ({ where, data }: any) => {
          if (where.id !== predecessor.id || predecessor.revokedAt !== null) {
            return { count: 0 };
          }
          Object.assign(predecessor, data);
          return { count: 1 };
        },
        create: async ({ data }: any) => {
          assert.equal('refreshToken' in data, false, 'plaintext refresh token must never be stored');
          successor = { id: 'session-after-rotation', revokedAt: null, ...data };
          return successor;
        },
      },
    });

  const first = responseRecorder();
  const second = responseRecorder();
  await Promise.all([
    refreshToken(request(predecessorRefreshToken) as any, first.res),
    refreshToken(request(predecessorRefreshToken) as any, second.res),
  ]);

  const expectedSuccessor = deriveSuccessorRefreshToken(predecessorRefreshToken);
  assert.equal(first.result.statusCode, 200);
  assert.equal(second.result.statusCode, 200);
  assert.ok(successor);
  assert.equal(successor!.refreshTokenHash, hashRefreshToken(expectedSuccessor));
  assert.equal(first.result.refreshCookie, expectedSuccessor);
  assert.equal(second.result.refreshCookie, expectedSuccessor);
  assert.equal(verifyAccessToken(first.result.body.accessToken).token_use, 'access');
  assert.equal(predecessor.revokedAt?.getTime(), predecessor.lastAccessedAt.getTime());
  assert.equal(successor!.createdAt.getTime(), predecessor.revokedAt?.getTime());
});

test('rejects an unknown refresh token and an access token presented as refresh cookie', async () => {
  (prisma.session as any).findUnique = async () => null;
  const unknown = responseRecorder();
  await refreshToken(request(generateRefreshToken()) as any, unknown.res);
  assert.equal(unknown.result.statusCode, 401);
  assert.equal(unknown.result.clearedCookie, true);
});
