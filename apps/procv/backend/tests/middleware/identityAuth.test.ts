import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, type AuthRequest } from '../../src/middleware/auth';
import { requireAdmin } from '../../src/middleware/admin';
import { config } from '../../src/config';

function makeResponse() {
  const state: { statusCode: number; body?: unknown } = { statusCode: 200 };
  const res = {
    status: jest.fn((code: number) => {
      state.statusCode = code;
      return res;
    }),
    json: jest.fn((payload: unknown) => {
      state.body = payload;
      return res;
    }),
    state,
  };
  return res;
}

function makeToken(payload: Record<string, unknown>, audience = config.identityAudience): string {
  return jwt.sign(payload, config.jwtSecret, {
    issuer: config.identityUrl,
    audience,
    expiresIn: '15m',
  });
}

function makeRequest(token?: string) {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as unknown as AuthRequest;
}

describe('ProCV Identity access middleware', () => {
  it('rejects requests without a bearer token', () => {
    const req = makeRequest();
    const res = makeResponse();
    const next = jest.fn();

    authMiddleware(req, res as unknown as Response, next as NextFunction);

    expect(res.state.statusCode).toBe(401);
    expect(res.state.body).toEqual({ message: 'Authorization header missing' });
    expect(next).not.toHaveBeenCalled();
  });

  it('requires an explicit PROCV entitlement even when the JWT is valid', () => {
    const token = makeToken({ sub: 'user-1', role: 'user', modules: ['PROJOBS'] });
    const req = makeRequest(token);
    const res = makeResponse();
    const next = jest.fn();

    authMiddleware(req, res as unknown as Response, next as NextFunction);

    expect(res.state.statusCode).toBe(403);
    expect(res.state.body).toEqual({
      message: 'ProCV module access required',
      requiredModule: 'PROCV',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts an Identity token with the matching audience and PROCV entitlement', () => {
    const token = makeToken({
      sub: 'central-user-1',
      email: 'user@example.com',
      role: 'user',
      modules: ['PROCV', 'PROJOBS'],
    });
    const req = makeRequest(token);
    const res = makeResponse();
    const next = jest.fn();

    authMiddleware(req, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe('central-user-1');
    expect(req.email).toBe('user@example.com');
    expect(req.modules).toEqual(['PROCV', 'PROJOBS']);
  });

  it('rejects a token issued for another API audience', () => {
    const token = makeToken({ sub: 'user-1', modules: ['PROCV'] }, 'another-api');
    const req = makeRequest(token);
    const res = makeResponse();
    const next = jest.fn();

    authMiddleware(req, res as unknown as Response, next as NextFunction);

    expect(res.state.statusCode).toBe(401);
    expect(res.state.body).toEqual({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('ProCV central administrator middleware', () => {
  it('rejects a non-admin even when the user has ProCV access', async () => {
    const req = makeRequest(makeToken({ sub: 'user-1', role: 'user', modules: ['PROCV'] }));
    const res = makeResponse();
    const next = jest.fn();

    await requireAdmin(
      req as unknown as Request,
      res as unknown as Response,
      next as NextFunction,
    );

    expect(res.state.statusCode).toBe(403);
    expect(res.state.body).toEqual({ message: 'Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('requires the ProCV entitlement for administrators as well', async () => {
    const req = makeRequest(makeToken({ sub: 'admin-1', role: 'admin', modules: ['PROJOBS'] }));
    const res = makeResponse();
    const next = jest.fn();

    await requireAdmin(req as unknown as Request, res as unknown as Response, next as NextFunction);

    expect(res.state.statusCode).toBe(403);
    expect(res.state.body).toEqual({ message: 'ProCV module access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('passes the central Identity subject to downstream admin handlers', async () => {
    const req = makeRequest(makeToken({
      sub: 'central-admin-1',
      email: 'admin@example.com',
      role: 'admin',
      modules: ['PROCV'],
    }));
    const res = makeResponse();
    const next = jest.fn();

    await requireAdmin(req as unknown as Request, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(
      (req as unknown as Request & { user: { id: string; email: string; role: string } }).user,
    ).toEqual({
      id: 'central-admin-1',
      email: 'admin@example.com',
      role: 'admin',
    });
  });
});
