import { RequestHandler } from 'express';

import { logInfo } from '@dogule/utils';

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  res.once('finish', () => {
    const duration = Date.now() - startedAt;
    logInfo(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });

  next();
};
