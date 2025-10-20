import { ErrorRequestHandler } from 'express';

interface HttpError extends Error {
  status?: number;
  details?: unknown;
}

export const errorHandler: ErrorRequestHandler = (err: HttpError, _req, res, _next) => {
  const status = err.status ?? 500;
  const payload = {
    message: err.message,
    details: err.details,
  };

  if (status >= 500) {
    console.error('[server] unexpected error', err);
  }

  res.status(status).json(payload);
};
