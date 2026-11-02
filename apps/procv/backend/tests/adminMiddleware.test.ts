import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { requireAdmin } from '../src/middleware/admin';

type LiveIdentity = {
  valid: boolean;
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
  dbContextToken?: string;
};

const signToken = (claims: Record<string, unknown> = {}, options: jwt.SignOptions = {}) =>
  jwt.sign({ sub: 'test-user', ...claims }, config.jwtSecret, {
    issuer: config.issuer,
    audience: config.audience,
    expiresIn: '5m',
    ...options,
  });

const originalFetch = globalThis.fetch;
let liveIdentity: LiveIdentity;

function invoke(authorization?: string) {
  const req = {
    headers: authorization ? { authorization } : {},
  } as Request;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  const next = jest.fn() as NextFunction;

  const result = requireAdmin(req, res, next);
  return { req, status, json, next, result };
}

describe('requireAdmin authorization boundary', () => {
  beforeAll(() => {
    globalThis.fetch = jest.fn(async () => new Response(JSON.stringify(liveIdentity), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    liveIdentity = {
      valid: true,
      userId: 'test-user',
      email: 'admin@example.test',
      role: 'admin',
      modules: ['PROCV'],
      dbContextToken: 'signed-database-context',
    };
  });

  it('returns 401 when the bearer token is missing', async () => {
    const { status, json, next, result } = invoke();
    await result;
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Authorization header missing' });
    expect(next).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid token', async () => {
    const { status, json, next, result } = invoke('Bearer not-a-valid-token');
    await result;
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a token with the wrong issuer or audience', async () => {
    const token = signToken({}, { issuer: 'https://untrusted.example', audience: 'other-api' });
    const { status, json, next, result } = invoke(`Bearer ${token}`);
    await result;
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', async () => {
    const token = signToken({}, { expiresIn: -1 });
    const { status, json, next, result } = invoke(`Bearer ${token}`);
    await result;
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a verified token with no subject', async () => {
    const token = jwt.sign({ role: 'admin', modules: ['PROCV'] }, config.jwtSecret, {
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: '5m',
    });
    const { status, json, next, result } = invoke(`Bearer ${token}`);
    await result;
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid identity subject' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when live ProIdentity state has no ProCV module grant', async () => {
    liveIdentity.modules = ['PROJOBS'];
    const token = signToken({ role: 'admin', modules: ['PROCV'] });
    const { status, json, next, result } = invoke(`Bearer ${token}`);
    await result;
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'ProCV module access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when live ProIdentity state is not admin', async () => {
    liveIdentity.role = 'user';
    const token = signToken({ role: 'admin', modules: ['PROCV'] });
    const { status, json, next, result } = invoke(`Bearer ${token}`);
    await result;
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses live ProIdentity state rather than stale role/module claims in the access JWT', async () => {
    const token = signToken({ role: 'user', modules: ['PROJOBS'] });
    const { req, next, status, result } = invoke(`Bearer ${token}`);
    await result;
    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect((req as any).user).toEqual({
      id: 'test-user',
      email: 'admin@example.test',
      role: 'admin',
    });
  });

  it('fails closed when introspection does not provide a database assertion', async () => {
    liveIdentity.dbContextToken = undefined;
    const token = signToken();
    const { status, json, next, result } = invoke(`Bearer ${token}`);
    await result;
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Session revoked, expired, or unavailable' });
    expect(next).not.toHaveBeenCalled();
  });

  it('does not treat client-supplied role headers as authorization', async () => {
    const req = {
      headers: { 'x-role': 'admin', 'x-is-admin': 'true' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    const next = jest.fn() as NextFunction;

    await requireAdmin(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
