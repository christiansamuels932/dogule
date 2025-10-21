import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type QueryRecord = { text: string; params?: ReadonlyArray<unknown> };

interface MockPoolState {
  instances: MockPool[];
  nextResults: Array<{ rows: unknown[] }>;
  nextError?: Error;
  createError?: Error;
}

const mockPoolState: MockPoolState = {
  instances: [],
  nextResults: [],
};

class MockPool {
  public readonly connectionString: string;
  public readonly queries: QueryRecord[] = [];
  public ended = false;

  constructor(config: { connectionString: string }) {
    if (mockPoolState.createError) {
      const error = mockPoolState.createError;
      mockPoolState.createError = undefined;
      throw error;
    }

    this.connectionString = config.connectionString;
    mockPoolState.instances.push(this);
  }

  async query(text: string, params?: ReadonlyArray<unknown>) {
    this.queries.push({ text, params });

    if (mockPoolState.nextError) {
      const error = mockPoolState.nextError;
      mockPoolState.nextError = undefined;
      throw error;
    }

    const next = mockPoolState.nextResults.shift();
    return next ?? { rows: [] };
  }

  async end(): Promise<void> {
    this.ended = true;
  }

  static queueResult(result: { rows: unknown[] }) {
    mockPoolState.nextResults.push(result);
  }

  static queueError(error: Error) {
    mockPoolState.nextError = error;
  }

  static queueCreateError(error: Error) {
    mockPoolState.createError = error;
  }

  static getInstances(): MockPool[] {
    return mockPoolState.instances;
  }

  static reset() {
    mockPoolState.instances = [];
    mockPoolState.nextResults = [];
    mockPoolState.nextError = undefined;
    mockPoolState.createError = undefined;
  }
}

vi.mock('pg', () => ({
  Pool: MockPool,
}));

const ORIGINAL_ENV = { ...process.env };

const restoreEnv = () => {
  process.env = { ...ORIGINAL_ENV };
};

describe('DatabaseClient ensurePool', () => {
  beforeEach(() => {
    vi.resetModules();
    MockPool.reset();
    restoreEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    MockPool.reset();
    restoreEnv();
  });

  it('uses pg-mem in test mode without DATABASE_URL and bootstraps once', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DATABASE_URL;

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const { createDatabaseClient } = await import('./client');

    const client = createDatabaseClient();
    expect(client.mode).toBe('memory');
    expect(client.url).toBeUndefined();

    await client.connect();

    expect(client.pool).toBeDefined();
    expect(client.memoryDb).toBeDefined();
    expect(client.bootstrapped).toBe(true);

    const result = await client.query<{ value: number }>({ text: 'SELECT 1 AS value' });
    expect(result).toEqual([{ value: 1 }]);

    expect(infoSpy).toHaveBeenCalledWith('LOG_DB_READY_002');
    expect(infoSpy).toHaveBeenCalledWith('LOG_DB_BOOTSTRAP_001');
  });

  it('connects to postgres when DATABASE_URL is provided and bootstraps schema once', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dogule';

    MockPool.queueResult({ rows: [] });
    MockPool.queueResult({ rows: [] });

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const { createDatabaseClient } = await import('./client');

    const client = createDatabaseClient();

    expect(client.mode).toBe('postgres');
    expect(client.url).toBe('postgres://postgres:postgres@localhost:5432/dogule');

    await client.connect();

    expect(client.pool).toBeDefined();
    expect(client.bootstrapped).toBe(true);

    const instances = MockPool.getInstances();
    expect(instances).toHaveLength(1);
    const instance = instances[0];
    expect(instance.connectionString).toBe('postgres://postgres:postgres@localhost:5432/dogule');
    expect(instance.queries[0]?.text).toBe('SELECT 1');
    expect(instance.queries.some((query) => query.text.includes('CREATE TABLE IF NOT EXISTS users'))).toBe(true);

    expect(infoSpy).toHaveBeenCalledWith('LOG_DB_READY_001', 'postgres://postgres:postgres@localhost:5432/dogule');
    expect(infoSpy).toHaveBeenCalledWith('LOG_DB_BOOTSTRAP_001');
  });

  it('throws ERR_DB_CONFIG_001 when postgres mode is missing url', async () => {
    const { DatabaseClient } = await import('./client');
    const client = new DatabaseClient({ mode: 'postgres', url: '' });

    await expect(client.connect()).rejects.toThrowError('ERR_DB_CONFIG_001');
  });

  it('surfaces bootstrap failures with ERR_DB_BOOTSTRAP_001', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dogule';

    MockPool.queueResult({ rows: [] });
    MockPool.queueError(new Error('schema failed'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { createDatabaseClient } = await import('./client');

    const client = createDatabaseClient();

    await expect(client.connect()).rejects.toThrowError('ERR_DB_BOOTSTRAP_001');
    expect(client.bootstrapped).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith('ERR_DB_BOOTSTRAP_001', expect.any(Error));
  });

  it('wraps connection failures with ERR_DB_CONNECT_001', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dogule';

    MockPool.queueCreateError(new Error('cannot connect'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { createDatabaseClient } = await import('./client');

    const client = createDatabaseClient();

    await expect(client.connect()).rejects.toThrowError('ERR_DB_CONNECT_001');
    expect(errorSpy).toHaveBeenCalledWith('ERR_DB_CONNECT_001', expect.any(Error));
  });

  it('wraps liveness failures with ERR_DB_LIVENESS_001', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/dogule';

    MockPool.queueError(new Error('ping failed'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { createDatabaseClient } = await import('./client');

    const client = createDatabaseClient();

    await expect(client.connect()).rejects.toThrowError('ERR_DB_LIVENESS_001');
    expect(client.pool).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith('ERR_DB_LIVENESS_001', expect.any(Error));
  });
});
