import { Request, Response } from 'express';
import { createHmac } from 'crypto';
import {
  generateCSRFMid,
  validateCSRF,
  getCSRFToken,
  verifyCSRFTokenSignature,
} from '../../src/middleware/csrf';

interface MockResponse {
  statusCode: number;
  body: unknown;
  cookies: Array<{ name: string; value: string }>;
  locals: Record<string, unknown>;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
  cookie(name: string, value: string): MockResponse;
}

function mockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    cookies: [],
    locals: {},
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
    cookie(name: string, value: string) {
      res.cookies.push({ name, value });
      return res;
    },
  };
  return res;
}

function asResponse(res: MockResponse): Response {
  return res as unknown as Response;
}

function mockRequest(
  cookies: Record<string, string> = {},
  method = 'POST',
  headers: Record<string, string> = {},
): Request {
  return { method, cookies, headers } as unknown as Request;
}

function issueToken(): string {
  const res = mockResponse();
  getCSRFToken(mockRequest({}, 'GET'), asResponse(res));
  return (res.body as { csrfToken: string }).csrfToken;
}

describe('CSRF middleware', () => {
  describe('getCSRFToken', () => {
    it('issues a signed token when no cookie exists', () => {
      const res = mockResponse();

      getCSRFToken(mockRequest({}, 'GET'), asResponse(res));

      const token = (res.body as { csrfToken: string }).csrfToken;
      expect(token.split('.')).toHaveLength(3);
      expect(verifyCSRFTokenSignature(token)).toBe(true);
      expect(res.cookies[0]?.name).toBe('csrfToken');
      expect(res.cookies[0]?.value).toBe(token);
    });

    it('returns the existing cookie token when present', () => {
      const res = mockResponse();

      getCSRFToken(mockRequest({ csrfToken: 'existing-token-value' }, 'GET'), asResponse(res));

      expect((res.body as { csrfToken: string }).csrfToken).toBe('existing-token-value');
      expect(res.cookies).toHaveLength(0);
    });
  });

  describe('generateCSRFMid', () => {
    it('sets a signed cookie when absent and reuses it afterwards', () => {
      const firstRes = mockResponse();
      generateCSRFMid(mockRequest(), asResponse(firstRes), () => undefined);
      const issued = firstRes.cookies[0]?.value as string;

      expect(verifyCSRFTokenSignature(issued)).toBe(true);

      const secondRes = mockResponse();
      const req = mockRequest({ csrfToken: issued });
      generateCSRFMid(req, asResponse(secondRes), () => undefined);

      expect(secondRes.cookies).toHaveLength(0);
      expect(req.csrfToken).toBe(issued);
    });
  });

  describe('validateCSRF', () => {
    it('skips safe methods', () => {
      const next = jest.fn();
      validateCSRF(mockRequest({}, 'GET'), asResponse(mockResponse()), next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects requests without the header token', () => {
      const res = mockResponse();
      const next = jest.fn();

      validateCSRF(mockRequest({ csrfToken: 'cookie' }, 'POST'), asResponse(res), next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: 'CSRF token missing' });
    });

    it('accepts when cookie and header match', () => {
      const res = mockResponse();
      const next = jest.fn();

      validateCSRF(
        mockRequest({ csrfToken: 'same-token' }, 'POST', { 'x-csrf-token': 'same-token' }),
        asResponse(res),
        next,
      );

      expect(next).toHaveBeenCalled();
    });

    it('rejects mismatching cookie and header', () => {
      const res = mockResponse();
      const next = jest.fn();

      validateCSRF(
        mockRequest({ csrfToken: 'cookie-token' }, 'POST', { 'x-csrf-token': 'other-token' }),
        asResponse(res),
        next,
      );

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: 'CSRF token mismatch' });
    });

    it('rejects cookie and header tokens with different byte lengths', () => {
      const res = mockResponse();
      const next = jest.fn();

      validateCSRF(
        mockRequest({ csrfToken: 'short' }, 'POST', { 'x-csrf-token': 'a-much-longer-token' }),
        asResponse(res),
        next,
      );

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: 'CSRF token mismatch' });
    });

    it('accepts a validly signed header token when the cookie differs (blocked or rotated cookie)', () => {
      const signedToken = issueToken();
      const res = mockResponse();
      const next = jest.fn();

      validateCSRF(
        mockRequest({ csrfToken: 'stale-cookie' }, 'POST', { 'x-csrf-token': signedToken }),
        asResponse(res),
        next,
      );

      expect(next).toHaveBeenCalled();
    });

    it('accepts a validly signed header token when no cookie is sent at all', () => {
      const signedToken = issueToken();
      const res = mockResponse();
      const next = jest.fn();

      validateCSRF(mockRequest({}, 'POST', { 'x-csrf-token': signedToken }), asResponse(res), next);

      expect(next).toHaveBeenCalled();
    });

    it('rejects tampered signed tokens', () => {
      const signedToken = issueToken();
      const [random, issuedAt] = signedToken.split('.');
      const tampered = `${random}.${issuedAt}.${'0'.repeat(64)}`;

      const res = mockResponse();
      const next = jest.fn();

      validateCSRF(mockRequest({}, 'POST', { 'x-csrf-token': tampered }), asResponse(res), next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: 'CSRF token mismatch' });
    });

    it('rejects expired signed tokens', () => {
      const random = 'a'.repeat(64);
      const issuedAt = Date.now() - 1000 * 60 * 60 * 24 * 8; // 8 days ago
      // Same secret tests/setup.ts injects via JWT_SECRET.
      const signature = createHmac('sha256', 'test-jwt-secret-for-testing-only-32chars')
        .update(`${random}.${issuedAt}`)
        .digest('hex');

      const res = mockResponse();
      const next = jest.fn();

      validateCSRF(
        mockRequest({}, 'POST', { 'x-csrf-token': `${random}.${issuedAt}.${signature}` }),
        asResponse(res),
        next,
      );

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ message: 'CSRF token mismatch' });
    });
  });
});
