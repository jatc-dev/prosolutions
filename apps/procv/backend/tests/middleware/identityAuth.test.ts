import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../../src/prismaClient', () => ({
  __esModule: true,
  default: {
    identityAccount: {
      upsert: jest.fn(),
    },
  },
}));

import prisma from '../../src/prismaClient';
import { authMiddleware, type AuthRequest } from '../../src/middleware/auth';
import { config } from '../../src/config';

const upsertMock = prisma.identityAccount.upsert as jest.MockedFunction<
  typeof prisma.identityAccount.upsert
>;

function makeResponse() {
  const state: { statusCode: number; body?: unknown } = { statusCode: 200 };
  const res = {} as Response & { state: typeof state };
  res.state = state;
  res.status = jest.fn((code: number) => {
    state.statusCode = code;
    return res;
  });
  res.json = jest.fn((body: unknown) => {
    state.body = body;
    return res;
  });
  return res;
}

function makeRequest(token?: string) {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as unknown as AuthRequest;
}

function makeToken(
  payload: Record<string, unknown>,
  audience = config.identityAudience,
): string {
  return jwt.sign(payload, config.jwtSecret, {
    issuer: config.identityIssuer,
    audience,
    expiresIn: '15m',
  });
}

describe('ProCV Identity access middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    upsertMock.mockResolvedValue({ id: 'identity-user-1' } as never);
  });

  it('rejects requests without a bearer token', async () => {
    const req = makeRequest();
    const res = makeResponse();
    const next = jest.fn();

    await authMiddleware(req, res as unknown as Response, next as NextFunction);

    expect(res.state.statusCode).toBe(401);
    expect(res.state.body).toEqual({ message: 'Authorization header missing' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a token issued for another API audience', async () => {
    const req = makeRequest(makeToken({ sub: 'identity-user-1', modules: ['PROCV'] }, 'other-api'));
    const res = makeResponse();
    const next = jest.fn();

    await authMiddleware(req, res as unknown as Response, next as NextFunction);

    expect(res.state.statusCode).toBe(401);
    expect(res.state.body).toEqual({ message: 'Invalid or expired ProIdentity token' });
    expect(next).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('requires an explicit PROCV entitlement even when the token is valid', async () => {
    const req = makeRequest(makeToken({ sub: 'identity-user-1', modules: ['PROJOBS'] }));
    const res = makeResponse();
    const next = jest.fn();

    await authMiddleware(req, res as unknown as Response, next as NextFunction);

    expect(res.state.statusCode).toBe(403);
    expect(res.state.body).toEqual({
      message: 'ProCV module access required',
      requiredModule: 'PROCV',
    });
    expect(next).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('accepts a valid ProIdentity token with the PROCV entitlement', async () => {
    const req = makeRequest(
      makeToken({
        sub: 'identity-user-1',
        email: 'user@example.test',
        role: 'user',
        modules: ['PROCV', 'PROJOBS'],
      }),
    );
    const res = makeResponse();
    const next = jest.fn();

    await authMiddleware(req, res as unknown as Response, next as NextFunction);

    expect(res.state.statusCode).toBe(200);
    expect(req.userId).toBe('identity-user-1');
    expect(req.email).toBe('user@example.test');
    expect(req.role).toBe('user');
    expect(req.modules).toEqual(['PROCV', 'PROJOBS']);
    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: 'identity-user-1' },
      update: {},
      create: { id: 'identity-user-1' },
    });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
