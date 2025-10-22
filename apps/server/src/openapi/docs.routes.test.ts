import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

let createApp: typeof import('../index')['createApp'];

describe('OpenAPI documentation', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://openapi-tests';
    process.env.JWT_SECRET = 'openapi-secret';

    ({ createApp } = await import('../index'));
  });

  it('serves the OpenAPI document', async () => {
    const { app } = await createApp();
    const response = await request(app).get('/docs.json');

    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.1.0');
    expect(response.body.paths).toBeDefined();
  });
});
