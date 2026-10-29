import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { requireAdmin } from '../src/middleware/admin';

const signToken = (claims: Record<string, unknown> = {}, options: jwt.SignOptions = {}) =>
  jwt.sign({ sub: 'test-user', ...claims }, config.jwtSecret, {
    issuer: config.identityUrl,
    audience: 'prosolutions-api',
    expiresIn: '5m',
    ...options,
  });

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
  it('returns 401 when the bearer token is missing', () => {
    const { status, json, next } = invoke();

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Authorization header missing' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid token', () => {
    const { status, json, next } = invoke('Bearer not-a-valid-token');

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a token with the wrong issuer or audience', () => {
    const token = signToken({}, { issuer: 'https://untrusted.example', audience: 'other-api' });
    const { status, json, next } = invoke(`Bearer ${token}`);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for an expired token', () => {
    const token = signToken({}, { expiresIn: -1 });
    const { status, json, next } = invoke(`Bearer ${token}`);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when a verified token has no subject', () => {
    const token = jwt.sign({ role: 'admin', modules: ['PROCV'] }, config.jwtSecret, {
      issuer: config.identityUrl,
      audience: 'prosolutions-api',
      expiresIn: '5m',
    });
    const { status, json, next } = invoke(`Bearer ${token}`);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid identity subject' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the token does not grant ProCV module access', () => {
    const token = signToken({ role: 'admin', modules: ['PROJOBS'] });
    const { status, json, next } = invoke(`Bearer ${token}`);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'ProCV module access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when the token has ProCV access but is not an admin', () => {
    const token = signToken({ role: 'user', modules: ['PROCV'] });
    const { status, json, next } = invoke(`Bearer ${token}`);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('continues only when the signed token has a subject, admin role, and ProCV grant', () => {
    const token = signToken({
      sub: 'platform-admin-test',
      email: 'admin@example.test',
      role: 'admin',
      modules: ['PROCV'],
    });
    const { req, next, status } = invoke(`Bearer ${token}`);

    expect(next).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect((req as any).user).toEqual({
      id: 'platform-admin-test',
      email: 'admin@example.test',
      role: 'admin',
    });
  });

  it('does not treat client-supplied role headers as authorization', () => {
    const req = {
      headers: { 'x-role': 'admin', 'x-is-admin': 'true' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    const next = jest.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
