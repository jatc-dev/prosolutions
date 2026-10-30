import type { NextFunction, Request, Response } from 'express';
import { authMiddleware } from '../src/middleware/auth';
import { requireAdmin } from '../src/middleware/admin';

jest.mock('../src/middleware/auth', () => ({
  authMiddleware: jest.fn(),
}));

const mockedAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>;

function invoke(role: string | null) {
  const req = { headers: { authorization: 'Bearer test-token' } } as unknown as Request;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  const next = jest.fn() as NextFunction;

  mockedAuthMiddleware.mockImplementation((_request, _response, authNext) => {
    if (role !== null) {
      const authenticated = _request as any;
      authenticated.userId = 'identity-admin-1';
      authenticated.email = 'admin@example.test';
      authenticated.role = role;
      authNext();
    }
    return Promise.resolve();
  });

  requireAdmin(req, res, next);
  return { req, status, json, next };
}

describe('requireAdmin authorization boundary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('delegates JWT and session validation to the shared Identity middleware', () => {
    const { req, status, next } = invoke('admin');

    expect(mockedAuthMiddleware).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect((req as any).user).toEqual({
      id: 'identity-admin-1',
      email: 'admin@example.test',
      role: 'admin',
    });
  });

  it('rejects a valid ProCV session without the admin role', () => {
    const { status, json, next } = invoke('user');

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('does not continue when shared authentication rejects the request', () => {
    const { status, next } = invoke(null);

    expect(status).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
