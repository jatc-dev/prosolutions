import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { requireAdmin } from '../src/middleware/admin';

function setup(
  role: string | null,
  options: { valid?: boolean; userId?: string; tokenRole?: string; permissions?: string[] } = {},
) {
  const subject = 'identity-admin-1';
  const token = jwt.sign(
    { sub: subject, jti: 'test-session-jti', role: options.tokenRole ?? 'admin' },
    config.jwtSecret,
    { issuer: config.issuer, audience: config.identityAudience, expiresIn: '1m' },
  );
  const req = { headers: { authorization: `Bearer ${token}` } } as unknown as Request;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  const next = jest.fn() as NextFunction;
  const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({
      valid: options.valid ?? true,
      userId: options.userId ?? subject,
      email: 'admin@example.test',
      role,
      modules: ['PROCV'],
      permissions: options.permissions ?? (role === 'admin' ? ['procv.admin.access'] : []),
    }),
  } as unknown as globalThis.Response);
  return { req, res, status, json, next, fetchSpy, token };
}

describe('requireAdmin using the real ProIdentity auth middleware', () => {
  afterEach(() => jest.restoreAllMocks());

  it('accepts a signed token only after live ProIdentity introspection grants ProCV admin permission', async () => {
    const { req, res, status, next, fetchSpy, token } = setup('admin');
    await requireAdmin(req, res, next);

    expect(fetchSpy).toHaveBeenCalledWith(
      `${config.identityUrl}/api/auth/introspect`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      }),
    );
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).user).toEqual({
      id: 'identity-admin-1',
      email: 'admin@example.test',
      role: 'admin',
    });
  });

  it('rejects a valid session without the ProCV admin permission', async () => {
    const { req, res, status, json, next } = setup('user');
    await requireAdmin(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'ProCV administrative permission required' });
    expect(next).not.toHaveBeenCalled();
  });


  it('does not trust the legacy admin role claim without an explicit permission', async () => {
    const { req, res, status, json, next } = setup('admin', { permissions: [] });
    await requireAdmin(req, res, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'ProCV administrative permission required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a revoked session', async () => {
    const { req, res, status, json, next } = setup('admin', { valid: false });
    await requireAdmin(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Session revoked or expired' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a subject mismatch between the signed token and introspection', async () => {
    const { req, res, status, next } = setup('admin', { userId: 'different-subject' });
    await requireAdmin(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects tokens signed for the wrong issuer or audience before introspection', async () => {
    const { req, res, status, next, fetchSpy } = setup('admin');
    const token = jwt.sign({ sub: 'identity-admin-1', jti: 'bad-contract' }, config.jwtSecret, {
      issuer: 'https://wrong.example.test',
      audience: 'wrong-api',
      expiresIn: '1m',
    });
    req.headers.authorization = `Bearer ${token}`;
    await requireAdmin(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
