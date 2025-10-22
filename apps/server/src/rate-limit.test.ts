import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ErrorCode } from '@dogule/domain';

let createApp: typeof import('./index')['createApp'];
let getDatabaseClient: typeof import('./infrastructure')['getDatabaseClient'];

const TEST_EMAIL = 'rate-limit@example.com';
const TEST_PASSWORD = 'super-secure';

describe('rate limiting', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://rate-limit-tests';
    process.env.JWT_SECRET = 'rate-limit-secret';

    ({ createApp } = await import('./index'));
    ({ getDatabaseClient } = await import('./infrastructure'));
  });

  beforeEach(() => {
    process.env.RATE_LIMIT_WINDOW_MS = '1000';
    process.env.RATE_LIMIT_MAX = '2';
  });

  afterEach(async () => {
    const database = getDatabaseClient();
    await database.query({ text: 'DELETE FROM users' });
  });

  it('limits repeated /auth requests', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const first = await agent.get('/auth/me');
    expect(first.status).toBe(401);

    const second = await agent.get('/auth/me');
    expect(second.status).toBe(401);

    const third = await agent.get('/auth/me');
    expect(third.status).toBe(429);
    expect(third.body).toEqual({ message: ErrorCode.ERR_RATE_LIMIT_001 });
  });

  it('limits repeated /graphql requests', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const registerResponse = await agent.post('/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(registerResponse.status).toBe(201);

    const token = registerResponse.body.token as string;

    const authHeader = { Authorization: `Bearer ${token}` };

    const first = await agent
      .post('/graphql')
      .set(authHeader)
      .send({ query: '{ kunden { id } }' });
    expect(first.status).not.toBe(429);

    const second = await agent
      .post('/graphql')
      .set(authHeader)
      .send({ query: '{ kunden { id } }' });
    expect(second.status).not.toBe(429);

    const third = await agent
      .post('/graphql')
      .set(authHeader)
      .send({ query: '{ kunden { id } }' });

    expect(third.status).toBe(429);
    expect(third.body).toEqual({ message: ErrorCode.ERR_RATE_LIMIT_001 });
  });
});
