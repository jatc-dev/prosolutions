import { Request, Response } from 'express';
import multer from 'multer';
import { errorHandler } from '../../src/middleware/errorHandler';

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

function asResponse(res: MockResponse): Response {
  return res as unknown as Response;
}

function mockRequest(): Request {
  return { method: 'POST', path: '/api/test' } as unknown as Request;
}

function run(err: unknown, req: Request = mockRequest()): { statusCode: number; body: unknown } {
  const res = mockResponse();
  errorHandler(err as Error, req, asResponse(res), () => undefined);
  return { statusCode: res.statusCode, body: res.body };
}

describe('errorHandler', () => {
  it('maps multer file-size errors to 413 without extra detail', () => {
    const err = new multer.MulterError('LIMIT_FILE_SIZE');
    const result = run(err);

    expect(result.statusCode).toBe(413);
    expect(result.body).toEqual({ message: 'File too large. Maximum allowed size is 5MB.' });
  });

  it('maps other multer errors to a generic 400', () => {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
    const result = run(err);

    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({ message: 'Invalid file upload.' });
  });

  it('maps invalid JSON bodies to 400', () => {
    const err = Object.assign(new Error('Unexpected token'), { type: 'entity.parse.failed' });
    const result = run(err);

    expect(result.statusCode).toBe(400);
    expect(result.body).toEqual({ message: 'Invalid request body' });
  });

  it('maps oversized bodies to 413', () => {
    const err = Object.assign(new Error('too large'), { type: 'entity.too.large' });
    const result = run(err);

    expect(result.statusCode).toBe(413);
    expect(result.body).toEqual({ message: 'Request body too large' });
  });

  it('does not leak internal error details for 5xx', () => {
    const err = Object.assign(new Error('connect ECONNREFUSED 10.0.0.1:5432'), { status: 500 });
    const result = run(err);

    expect(result.statusCode).toBe(500);
    expect(result.body).toEqual({ message: 'Internal Server Error' });
    expect(JSON.stringify(result.body)).not.toContain('ECONNREFUSED');
  });

  it('defaults unmarked errors to 500', () => {
    const err = new Error('boom');
    const result = run(err);

    expect(result.statusCode).toBe(500);
    expect(result.body).toEqual({ message: 'Internal Server Error' });
  });

  it('keeps intentional 4xx messages', () => {
    const err = Object.assign(new Error('Too many requests'), { status: 429 });
    const result = run(err);

    expect(result.statusCode).toBe(429);
    expect(result.body).toEqual({ message: 'Too many requests' });
  });
});
