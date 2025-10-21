import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig, createDatabaseClient } from './infrastructure';

describe('configuration', () => {
  const originalEnv = { ...process.env } as NodeJS.ProcessEnv;

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    vi.restoreAllMocks();
  });

  it('loads configuration from environment variables', () => {
    process.env.PORT = '5001';
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dogule';
    process.env.JWT_SECRET = 'test-secret';

    const config = loadConfig();

    expect(config).toEqual({
      port: 5001,
      nodeEnv: 'development',
      databaseUrl: 'postgres://postgres:postgres@localhost:5432/dogule',
      jwtSecret: 'test-secret',
    });
  });

  it('exits when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    process.env.JWT_SECRET = 'test-secret';

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as unknown as typeof process.exit);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => loadConfig()).toThrow('process.exit called');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('ERR_DB_ENV_001 Missing DATABASE_URL environment variable'),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits when JWT_SECRET is missing', () => {
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dogule';
    delete process.env.JWT_SECRET;

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as unknown as typeof process.exit);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => loadConfig()).toThrow('process.exit called');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('ERR_AUTH_ENV_001 Missing JWT_SECRET environment variable'),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe('database client', () => {
  const originalEnv = { ...process.env } as NodeJS.ProcessEnv;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  it('allows connecting in test environment without a running database', async () => {
    const client = createDatabaseClient('postgres://postgres:postgres@localhost:5432/dogule');
    await expect(client.connect()).resolves.toBeUndefined();
  });
});
