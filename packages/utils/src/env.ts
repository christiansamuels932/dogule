import { config as loadEnv } from 'dotenv';

let envBootstrapped = false;

export const bootstrapEnv = () => {
  if (envBootstrapped) {
    return;
  }

  loadEnv();
  envBootstrapped = true;
};

const toFiniteNumber = (value: string | undefined): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const resolvePositiveNumber = (value: string | undefined, fallback: number): number => {
  const candidate = toFiniteNumber(value);
  return candidate !== undefined && candidate > 0 ? candidate : fallback;
};

export const DEFAULT_PORT = 4000;
export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_MAX = 100;
export const DEFAULT_REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export interface ServerEnvConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwtSecret: string;
  refreshTokenTtlMs: number;
  rateLimit: RateLimitConfig;
}

export const createServerEnvConfig = (options: {
  port?: string;
  nodeEnv?: string;
  databaseUrl?: string;
  jwtSecret?: string;
  refreshTokenTtlMs?: string;
  rateLimitWindowMs?: string;
  rateLimitMax?: string;
}): ServerEnvConfig => {
  const port = Number(options.port ?? DEFAULT_PORT);
  const nodeEnv = options.nodeEnv ?? 'development';
  const databaseUrl = options.databaseUrl ?? '';
  const jwtSecret = options.jwtSecret ?? '';
  const refreshTokenTtlMs = resolvePositiveNumber(options.refreshTokenTtlMs, DEFAULT_REFRESH_TOKEN_TTL_MS);
  const windowMs = resolvePositiveNumber(options.rateLimitWindowMs, DEFAULT_RATE_LIMIT_WINDOW_MS);
  const max = resolvePositiveNumber(options.rateLimitMax, DEFAULT_RATE_LIMIT_MAX);

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

export const loadServerEnvConfig = (): ServerEnvConfig => {
  bootstrapEnv();

  return createServerEnvConfig({
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    refreshTokenTtlMs: process.env.REFRESH_TOKEN_TTL_MS,
    rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: process.env.RATE_LIMIT_MAX,
  });
};

