import { RequestHandler } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import { ErrorCode } from '@dogule/domain';
import { logWarn } from '@dogule/utils';

import { loadConfig } from '../config';

export interface AuthenticatedRequest {
  user?: {
    sub: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

const isPublicRoute = (path: string): boolean => {
  return path.startsWith('/auth') || path === '/healthz';
};

export const authMiddleware: RequestHandler = (req, res, next) => {
  if (isPublicRoute(req.path) || req.method === 'OPTIONS') {
    return next();
  }

  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: ErrorCode.ERR_AUTH_401 });
  }

  const token = authorization.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, loadConfig().jwtSecret);

    if (typeof payload === 'string') {
      return res.status(401).json({ message: ErrorCode.ERR_AUTH_INVALID_001 });
    }

    const request = req as typeof req & AuthenticatedRequest;
    request.user = {
      sub: String(payload.sub),
      email: String(payload.email ?? ''),
      role: String(payload.role ?? ''),
      ...payload,
    };

    return next();
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      logWarn('[auth] invalid token', error);
    }

    if (error instanceof TokenExpiredError) {
      return res.status(401).json({ message: ErrorCode.ERR_AUTH_EXPIRED_001 });
    }

    if (error instanceof JsonWebTokenError) {
      return res.status(401).json({ message: ErrorCode.ERR_AUTH_INVALID_001 });
    }

    return res.status(401).json({ message: ErrorCode.ERR_AUTH_INVALID_001 });
  }
};
