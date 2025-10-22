import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '@dogule/domain';

let createApp: typeof import('./index')['createApp'];
let getDatabaseClient: typeof import('./infrastructure')['getDatabaseClient'];

describe('health and readiness endpoints', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://health-tests';
    process.env.JWT_SECRET = 'health-secret';

    ({ createApp } = await import('./index'));
    ({ getDatabaseClient } = await import('./infrastructure'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ok with timestamp for /health', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const response = await agent.get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true });
    expect(typeof response.body.ts).toBe('string');
  });

  it('returns ok when database is ready', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const response = await agent.get('/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true });
    expect(typeof response.body.ts).toBe('string');
  });

  it('returns error when database liveness check fails', async () => {
    const { app } = await createApp();
    const database = getDatabaseClient();
    vi.spyOn(database, 'query').mockRejectedValueOnce(new Error('db down'));

    const agent = request(app);
    const response = await agent.get('/ready');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ message: ErrorCode.ERR_HEALTH_DB_001 });
  });
});
