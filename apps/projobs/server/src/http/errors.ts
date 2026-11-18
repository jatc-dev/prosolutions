import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, type ZodType } from 'zod';
import type { ApiError } from '../contracts.js';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Authentication required') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'Insufficient permissions', code = 'forbidden') => new HttpError(403, code, message);
export const notFound = (message = 'Resource not found') => new HttpError(404, 'not_found', message);
export const conflict = (message: string, code = 'conflict') => new HttpError(409, code, message);
export const badGateway = (message: string, code = 'upstream_error') => new HttpError(502, code, message);

/** Parse and validate input; returns typed data or throws a 400 with field issues. */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw badRequest('Invalid request', formatIssues(result.error));
  }
  return result.data;
}

function formatIssues(error: ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

/** Wrap async handlers so rejections reach the error middleware (Express 4). */
export function asyncHandler<T extends RequestHandler>(handler: T): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(notFound('Route not found'));

/** PostgreSQL error codes that map to client errors instead of 500s. */
const PG_CLIENT_ERRORS: Record<string, [number, string]> = {
  '23505': [409, 'conflict'],
  '23503': [409, 'conflict'],
  '23514': [400, 'constraint_violation'],
  '22P02': [400, 'bad_request'],
  '42501': [403, 'forbidden'],
};

export function errorHandler(log: (message: string, meta?: Record<string, unknown>) => void): ErrorRequestHandler {
  return (err, req, res, _next) => {
    let status = 500;
    let body: ApiError = { error: { code: 'internal_error', message: 'Unexpected server error' } };

    if (err instanceof HttpError) {
      status = err.status;
      body = { error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } };
    } else if (err?.type === 'entity.parse.failed') {
      status = 400;
      body = { error: { code: 'bad_request', message: 'Malformed JSON body' } };
    } else if (typeof err?.code === 'string' && PG_CLIENT_ERRORS[err.code]) {
      const [pgStatus, code] = PG_CLIENT_ERRORS[err.code]!;
      status = pgStatus;
      body = { error: { code, message: 'Request conflicts with current data' } };
    }

    if (status >= 500) {
      log('request failed', { method: req.method, path: req.path, error: err instanceof Error ? err.message : String(err) });
    }
    res.status(status).json(body);
  };
}
