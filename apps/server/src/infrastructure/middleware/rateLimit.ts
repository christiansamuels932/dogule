import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { ErrorCode, LogCode } from '@dogule/domain';
import { logWarn } from '@dogule/utils';

export interface RateLimiterConfig {
  windowMs: number;
  max: number;
}

export const createRateLimiter = ({ windowMs, max }: RateLimiterConfig) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (request: Request) => request.ip ?? 'global',
    handler: (request: Request, response: Response) => {
      logWarn(LogCode.LOG_RATE_LIMIT_HIT_001, { path: request.path, ip: request.ip });
      response.status(429).json({ message: ErrorCode.ERR_RATE_LIMIT_001 });
    },
  });
