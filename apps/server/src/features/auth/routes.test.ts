import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../index';
import { getDatabaseClient } from '../../infrastructure';

const TEST_EMAIL = 'jane.doe@example.com';
const TEST_PASSWORD = 'password123';

describe('auth routes', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://auth-tests';
    process.env.JWT_SECRET = 'super-secret';
  });

  afterEach(async () => {
    const database = getDatabaseClient();
    await database.query({ text: 'DELETE FROM users' });
  });

  it('registers and logs in a user', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const registerResponse = await agent.post('/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.token).toBeDefined();
    expect(registerResponse.body.user).toMatchObject({
      email: TEST_EMAIL,
      role: 'user',
    });

    const loginResponse = await agent.post('/auth/login').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.user).toMatchObject({
      email: TEST_EMAIL,
    });

    const protectedResponse = await agent
      .get('/api/kunden')
      .set('Authorization', `Bearer ${loginResponse.body.token}`);

    expect(protectedResponse.status).toBe(200);

    const meResponse = await agent
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user).toMatchObject({
      email: TEST_EMAIL,
      role: 'user',
    });
  });

  it('rejects unauthenticated requests with ERR_AUTH_401', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const response = await agent.get('/api/hunde');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'ERR_AUTH_401' });
  });

  it('requires authentication for /auth/me', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const response = await agent.get('/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'ERR_AUTH_401' });
  });
});
