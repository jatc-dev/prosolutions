import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { config } from '../config';
import { logger } from '../utils/logger';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

/**
 * Global error handler. Client-facing 4xx responses keep their intentional
 * message; server failures (5xx) never leak internal details to the client and
 * are logged with full context for correlation.
 */
export function errorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Upload errors (multer).
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'File too large. Maximum allowed size is 5MB.' });
      return;
    }
    res.status(400).json({ message: 'Invalid file upload.' });
    return;
  }

  // Body parser errors (express.json).
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'Invalid request body' });
    return;
  }
  if (err.type === 'entity.too.large') {
    res.status(413).json({ message: 'Request body too large' });
    return;
  }

  const status = err.status ?? err.statusCode ?? 500;

  if (status >= 500) {
    logger.error('Unhandled server error', {
      method: req.method,
      path: req.path,
      error: err.message,
      stack: config.isProduction ? undefined : err.stack,
    });
    res.status(500).json({ message: 'Internal Server Error' });
    return;
  }

  logger.warn('Request rejected', {
    method: req.method,
    path: req.path,
    status,
    error: err.message,
  });
  res.status(status).json({ message: err.message || 'Bad Request' });
}
