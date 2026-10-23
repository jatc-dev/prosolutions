import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

jest.mock('../../src/middleware/auth', () => ({
  verifyIdentityAccessToken: jest.fn(),
}));

import { verifyIdentityAccessToken } from '../../src/middleware/auth';
import { requireAdmin } from '../../src/middleware/admin';

const verifyMock = verifyIdentityAccessToken as jest.MockedFunction<typeof verifyIdentityAccessToken>;

function makeResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

function makeRequest(authorization?: string) {
  return {
    headers: authorization ? { authorization } : {},
  } as unknown as Request;
}

describe('requireAdmin with ProIdentity claims', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects requests without a Bearer token', async () => {
    const res = makeResponse();
    const next = jest.fn();

    await requireAdmin(makeRequest() as Request, res as unknown as Response, next as unknown as NextFunction);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it('accepts a signed ProIdentity admin token that grants ProCV', async () => {
    verifyMock.mockReturnValue({
      sub: 'identity-user-1',
      email: 'admin@example.test',
      role: 'admin',
      modules: ['PROCV', 'PROJOBS'],
    });

    const req = makeRequest('Bearer signed-token') as Request & { user?: { id: string; email: string; role: string } };
    const res = makeResponse();
    const next = jest.fn();

    await requireAdmin(req, res as unknown as Response, next as unknown as NextFunction);

    expect(res.statusCode).toBe(200);
    expect(req.user).toEqual({ id: 'identity-user-1', email: 'admin@example.test', role: 'admin' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects a valid non-admin token', async () => {
    verifyMock.mockReturnValue({
      sub: 'identity-user-2',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
    });

    const res = makeResponse();
    const next = jest.fn();
    await requireAdmin(makeRequest('Bearer signed-token'), res as unknown as Response, next as unknown as NextFunction);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an admin token without PROCV entitlement', async () => {
    verifyMock.mockReturnValue({
      sub: 'identity-admin',
      email: 'admin@example.test',
      role: 'admin',
      modules: ['PROJOBS'],
    });

    const res = makeResponse();
    const next = jest.fn();
    await requireAdmin(makeRequest('Bearer signed-token'), res as unknown as Response, next as unknown as NextFunction);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired tokens', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const res = makeResponse();
    const next = jest.fn();

    await requireAdmin(makeRequest('Bearer expired-token'), res as unknown as Response, next as unknown as NextFunction);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
