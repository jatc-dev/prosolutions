import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import jwt from 'jsonwebtoken';
import prisma from '../../src/prismaClient';
import { config } from '../../src/config';
import { refreshToken } from '../../src/controllers/refreshController';

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
  refreshToken: string;
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

test('concurrent refresh requests receive the same active successor session', async () => {
  const userAgent = 'Chrome/156 Windows';
  const predecessorJti = 'predecessor-jti';
  const predecessorRefreshToken = jwt.sign(
    { sub: 'user-123', jti: predecessorJti },
    config.jwtSecret,
    {
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: '12h',
    },
  );

  const predecessor: StoredSession = {
    id: 'session-before-rotation',
    userId: 'user-123',
    refreshToken: predecessorRefreshToken,
    jti: predecessorJti,
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
    if (where.refreshToken === predecessorRefreshToken) return { ...predecessor };
    if (where.jti && successor?.jti === where.jti) return { ...successor };
    return null;
  };
  (prisma.user as any).findUnique = async () => ({
    id: 'user-123',
    email: 'qa@example.invalid',
    role: 'user',
    isActive: true,
    moduleAccess: [],
  });
  (prisma.moduleAccess as any).upsert = async () => ({});
  (prisma.moduleAccess as any).findMany = async () => [{ module: 'PROCV' }];
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
          successor = { id: 'session-after-rotation', revokedAt: null, ...data };
          return successor;
        },
      },
    });

  const request = () => ({
    cookies: { refreshToken: predecessorRefreshToken },
    get: (header: string) => (header.toLowerCase() === 'user-agent' ? userAgent : undefined),
    headers: { 'user-agent': userAgent },
    ip: '127.0.0.1',
  });

  const first = responseRecorder();
  const second = responseRecorder();
  await Promise.all([
    refreshToken(request() as any, first.res),
    refreshToken(request() as any, second.res),
  ]);

  assert.equal(first.result.statusCode, 200);
  assert.equal(second.result.statusCode, 200);
  assert.ok(successor);
  assert.equal(first.result.refreshCookie, successor!.refreshToken);
  assert.equal(second.result.refreshCookie, successor!.refreshToken);
  assert.equal(first.result.body.accessToken ? true : false, true);
  assert.equal(second.result.body.accessToken ? true : false, true);
  assert.equal(predecessor.revokedAt?.getTime(), predecessor.lastAccessedAt.getTime());
  assert.equal(successor!.createdAt.getTime(), predecessor.revokedAt?.getTime());
});
