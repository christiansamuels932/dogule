import { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  res.once('finish', () => {
    const duration = Date.now() - startedAt;
    console.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });

  next();
};
