import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../../src/middleware/auth';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { verify: jest.fn() },
}));

interface MockResponse {
  statusCode: number;
  body: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function mockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: unknown) { res.body = payload; return res; },
  };
  return res;
}

function mockRequest(token = 'signed-token'): AuthRequest {
  return { headers: { authorization: `Bearer ${token}` } } as unknown as AuthRequest;
}

describe('ProCV Identity authorization middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a valid Identity token without PROCV entitlement', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROJOBS'],
    });
    const res = mockResponse();
    const next = jest.fn();

    authMiddleware(mockRequest(), res as unknown as Response, next);

    expect(jwt.verify).toHaveBeenCalledWith('signed-token', expect.any(String), {
      issuer: expect.any(String),
      audience: 'prosolutions-api',
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      message: 'ProCV module access required',
      requiredModule: 'PROCV',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts an Identity token with PROCV entitlement and exposes the subject', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-2',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV', 'PROJOBS'],
    });
    const req = mockRequest();
    const next = jest.fn();

    authMiddleware(req, mockResponse() as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe('identity-user-2');
    expect(req.modules).toEqual(['PROCV', 'PROJOBS']);
  });

  it('rejects missing bearer tokens', () => {
    const req = { headers: {} } as unknown as AuthRequest;
    const res = mockResponse();
    const next = jest.fn();

    authMiddleware(req, res as unknown as Response, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(jwt.verify).not.toHaveBeenCalled();
  });
});
