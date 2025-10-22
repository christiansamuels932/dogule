import type { NextFunction, Request, RequestHandler, Response } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  handler?: (
    request: Request,
    response: Response,
    next: NextFunction,
    context: { windowMs: number; max: number; currentHits: number; resetTime: Date },
  ) => void;
  keyGenerator?: (request: Request, response: Response) => string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

declare const rateLimit: (options: RateLimitOptions) => RequestHandler;

export default rateLimit;
