import { config as loadEnv } from 'dotenv';

import { ErrorCode } from '@dogule/domain';
import { logError } from '@dogule/utils';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  refreshTokenTtlMs: number;
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

let envLoaded = false;

const ensureEnv = () => {
  if (!envLoaded) {
    loadEnv();
    envLoaded = true;
  }
};

const DEFAULT_REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export const loadConfig = (): AppConfig => {
  ensureEnv();

  const port = Number(process.env.PORT ?? 4000);
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;
  const refreshTokenTtlCandidate = Number(process.env.REFRESH_TOKEN_TTL_MS);
  const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000);
  const rateLimitMax = Number(process.env.RATE_LIMIT_MAX ?? 100);

  const windowMs = Number.isFinite(rateLimitWindowMs) && rateLimitWindowMs > 0 ? rateLimitWindowMs : 60000;
  const max = Number.isFinite(rateLimitMax) && rateLimitMax > 0 ? rateLimitMax : 100;
  const refreshTokenTtlMs =
    Number.isFinite(refreshTokenTtlCandidate) && refreshTokenTtlCandidate > 0
      ? refreshTokenTtlCandidate
      : DEFAULT_REFRESH_TOKEN_TTL_MS;

  if (!databaseUrl) {
    logError(ErrorCode.ERR_DB_ENV_001, 'Missing DATABASE_URL environment variable');
    process.exit(1);
  }

  if (!jwtSecret) {
    logError(ErrorCode.ERR_AUTH_ENV_001, 'Missing JWT_SECRET environment variable');
    process.exit(1);
  }

  return {
    port,
    nodeEnv,
    databaseUrl,
    jwtSecret,
    refreshTokenTtlMs,
    rateLimit: {
      windowMs,
      max,
    },
  };
};
