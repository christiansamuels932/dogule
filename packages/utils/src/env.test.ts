import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfig = vi.fn();

vi.mock('dotenv', () => ({
  config: mockConfig,
}));

const loadEnvModule = async () => import('./env');

describe('env utilities', () => {
  beforeEach(async () => {
    await vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    delete process.env.REFRESH_TOKEN_TTL_MS;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
  });

  it('loads dotenv only once', async () => {
    const { bootstrapEnv } = await loadEnvModule();

    bootstrapEnv();
    bootstrapEnv();

    expect(mockConfig).toHaveBeenCalledTimes(1);
  });

  it('creates server env config with defaults', async () => {
    const { DEFAULT_PORT, createServerEnvConfig } = await loadEnvModule();

    expect(createServerEnvConfig({}).port).toBe(DEFAULT_PORT);
  });

  it('loads server env config from process env', async () => {
    const { loadServerEnvConfig } = await loadEnvModule();

    process.env.PORT = '4500';
    process.env.DATABASE_URL = 'postgres://example';
    process.env.JWT_SECRET = 'secret';

    const config = loadServerEnvConfig();

    expect(config.port).toBe(4500);
    expect(config.databaseUrl).toBe('postgres://example');
    expect(config.jwtSecret).toBe('secret');
  });

  it('resolves positive numbers with fallback', async () => {
    const { resolvePositiveNumber } = await loadEnvModule();

    expect(resolvePositiveNumber('5', 10)).toBe(5);
    expect(resolvePositiveNumber('-1', 10)).toBe(10);
    expect(resolvePositiveNumber(undefined, 10)).toBe(10);
  });
});
