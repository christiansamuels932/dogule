import { RequestHandler } from 'express';

type RequestWithContext = {
  context?: Record<string, unknown>;
};

export const authMiddleware: RequestHandler = (req, _res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return next();
  }

  const request = req as typeof req & RequestWithContext;
  request.context = {
    ...request.context,
    apiKey,
  };

  return next();
};
