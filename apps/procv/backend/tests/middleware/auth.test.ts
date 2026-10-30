import { Response as ExpressResponse } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../../src/middleware/auth';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: { verify: jest.fn() },
}));

const originalFetch = globalThis.fetch;

type IntrospectionResponse = {
  valid: boolean;
  userId?: string;
  email?: string;
  role?: string;
  modules?: string[];
  reason?: string;
};

let introspectionResponse: IntrospectionResponse | null = null;
let introspectionShouldThrow = false;
let introspectionShouldTimeout = false;

function setIntrospectionResponse(
  response: IntrospectionResponse | null,
  shouldThrow = false,
  shouldTimeout = false,
) {
  introspectionResponse = response;
  introspectionShouldThrow = shouldThrow;
  introspectionShouldTimeout = shouldTimeout;
}

async function mockFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<globalThis.Response> {
  const url = String(input);
  if (url.includes('/api/auth/introspect')) {
    if (introspectionShouldThrow) {
      throw new Error('introspection service unavailable');
    }
    if (introspectionShouldTimeout) {
      const abortError = new Error('The operation was aborted.') as Error & { name: string };
      abortError.name = 'AbortError';
      throw abortError;
    }
    if (introspectionResponse === null) {
      return new Response('not-json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Always return HTTP 200 so the body (including valid: false) is parsed by the contract validator.
    return new Response(JSON.stringify(introspectionResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return originalFetch(input, init);
}

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

function mockRequest(token = 'signed-token'): AuthRequest {
  return { headers: { authorization: `Bearer ${token}` } } as unknown as AuthRequest;
}

describe('ProCV Identity authorization middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setIntrospectionResponse({
      valid: true,
      userId: 'identity-user-2',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV', 'PROJOBS'],
    });
    introspectionShouldThrow = false;
    introspectionShouldTimeout = false;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeAll(() => {
    globalThis.fetch = mockFetch;
  });

  it('accepts an Identity token with PROCV entitlement and exposes the subject', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-2',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV', 'PROJOBS'],
      jti: 'test-jti-2',
    });
    const req = mockRequest();
    const next = jest.fn();

    await authMiddleware(req, mockResponse() as unknown as ExpressResponse, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe('identity-user-2');
    expect(req.modules).toEqual(['PROCV', 'PROJOBS']);
  });

  it('rejects a valid Identity token without PROCV entitlement', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROJOBS'],
      jti: 'test-jti-1',
    });
    setIntrospectionResponse({
      valid: true,
      userId: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROJOBS'],
    });
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(mockRequest(), res as unknown as ExpressResponse, next);

    expect(jwt.verify).toHaveBeenCalledWith('signed-token', expect.any(String), {
      issuer: expect.any(String),
      audience: 'prosolutions-api',
      algorithms: ['HS256'],
    });
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      message: 'ProCV module access required',
      requiredModule: 'PROCV',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a valid Identity token missing jti', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
    });
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(mockRequest(), res as unknown as ExpressResponse, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ message: 'Session token missing jti' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects introspection valid=false', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
      jti: 'test-jti-1',
    });
    setIntrospectionResponse({ valid: false, reason: 'session_revoked' });
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(mockRequest(), res as unknown as ExpressResponse, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      message: 'Session revoked or expired',
      reason: 'session_revoked',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects introspection with missing userId', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
      jti: 'test-jti-1',
    });
    setIntrospectionResponse({
      valid: true,
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
    });
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(mockRequest(), res as unknown as ExpressResponse, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      message: 'Session revoked or expired',
      reason: 'introspection_missing_userid',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects introspection with userId different from JWT sub', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
      jti: 'test-jti-1',
    });
    setIntrospectionResponse({
      valid: true,
      userId: 'different-user',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
    });
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(mockRequest(), res as unknown as ExpressResponse, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      message: 'Session revoked or expired',
      reason: 'introspection_userid_mismatch',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects introspection with missing modules array', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
      jti: 'test-jti-1',
    });
    setIntrospectionResponse({
      valid: true,
      userId: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
    });
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(mockRequest(), res as unknown as ExpressResponse, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      message: 'Session revoked or expired',
      reason: 'introspection_invalid_modules',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects introspection with malformed modules (not an array)', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
      jti: 'test-jti-1',
    });
    setIntrospectionResponse({
      valid: true,
      userId: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: 'PROCV' as unknown as string[],
    });
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(mockRequest(), res as unknown as ExpressResponse, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      message: 'Session revoked or expired',
      reason: 'introspection_invalid_modules',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects introspection with unparseable JSON', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
      jti: 'test-jti-1',
    });
    setIntrospectionResponse(null);
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(mockRequest(), res as unknown as ExpressResponse, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      message: 'Session revoked or expired',
      reason: 'introspection_invalid_json',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects introspection with valid=false in body', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
      jti: 'test-jti-1',
    });
    setIntrospectionResponse({ valid: false, reason: 'internal_error' });
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(mockRequest(), res as unknown as ExpressResponse, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      message: 'Session revoked or expired',
      reason: 'internal_error',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when introspection times out (fail closed)', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
      jti: 'test-jti-1',
    });
    setIntrospectionResponse(null, false, true);
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(mockRequest(), res as unknown as ExpressResponse, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      message: 'Session revoked or expired',
      reason: 'introspection_timeout',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects when introspection service throws network error', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'identity-user-1',
      email: 'user@example.test',
      role: 'user',
      modules: ['PROCV'],
      jti: 'test-jti-1',
    });
    setIntrospectionResponse(null, true);
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(mockRequest(), res as unknown as ExpressResponse, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      message: 'Session revoked or expired',
      reason: expect.stringContaining('introspection_error'),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects missing bearer tokens', async () => {
    const req = { headers: {} } as unknown as AuthRequest;
    const res = mockResponse();
    const next = jest.fn();

    await authMiddleware(req, res as unknown as ExpressResponse, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    expect(jwt.verify).not.toHaveBeenCalled();
  });
});
