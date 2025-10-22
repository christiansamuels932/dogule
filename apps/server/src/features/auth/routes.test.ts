import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';

import { ErrorCode } from '@dogule/domain';

let createApp: typeof import('../../index')['createApp'];
let getDatabaseClient: typeof import('../../infrastructure')['getDatabaseClient'];

const TEST_EMAIL = 'jane.doe@example.com';
const TEST_PASSWORD = 'password123';
const DEFAULT_REFRESH_TTL_MS = '3600000';

const getRefreshCookie = (response: request.Response): string | undefined => {
  const cookies = response.headers['set-cookie'];
  if (!cookies || cookies.length === 0) {
    return undefined;
  }

  return cookies.find((cookie) => cookie.startsWith('refreshToken='));
};

const expectRefreshCookie = (cookie: string | undefined) => {
  expect(cookie, 'expected refresh cookie to be defined').toBeDefined();
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('Secure');
  expect(cookie).toContain('Path=/auth/refresh');
};

describe('auth routes', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://auth-tests';
    process.env.JWT_SECRET = 'super-secret';
    process.env.REFRESH_TOKEN_TTL_MS = DEFAULT_REFRESH_TTL_MS;

    ({ createApp } = await import('../../index'));
    ({ getDatabaseClient } = await import('../../infrastructure'));
  });

  afterEach(async () => {
    process.env.REFRESH_TOKEN_TTL_MS = DEFAULT_REFRESH_TTL_MS;
    const database = getDatabaseClient();
    await database.query({ text: 'DELETE FROM auth_refresh_tokens' });
    await database.query({ text: 'DELETE FROM users' });
  });

  it('registers and logs in a user', async () => {
    const { app } = await createApp();
    const agent = request.agent(app);

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
    const registerCookie = getRefreshCookie(registerResponse);
    expectRefreshCookie(registerCookie);

    const loginResponse = await agent.post('/auth/login').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();
    expect(loginResponse.body.user).toMatchObject({
      email: TEST_EMAIL,
    });
    const loginCookie = getRefreshCookie(loginResponse);
    expectRefreshCookie(loginCookie);

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

    expect(registerCookie).not.toEqual(loginCookie);
  });

  it('rotates refresh tokens on refresh request', async () => {
    const { app } = await createApp();
    const agent = request.agent(app);

    const registerResponse = await agent.post('/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(registerResponse.status).toBe(201);
    const initialCookie = getRefreshCookie(registerResponse);
    expectRefreshCookie(initialCookie);

    const refreshResponse = await request(app)
      .post('/auth/refresh')
      .set('Cookie', initialCookie ?? '');

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.token).toBeDefined();
    expect(refreshResponse.body.user).toMatchObject({ email: TEST_EMAIL });
    const rotatedCookie = getRefreshCookie(refreshResponse);
    expectRefreshCookie(rotatedCookie);
    expect(rotatedCookie).not.toEqual(initialCookie);

    const reuseResponse = await request(app)
      .post('/auth/refresh')
      .set('Cookie', initialCookie ?? '');

    expect(reuseResponse.status).toBe(401);
    expect(reuseResponse.body).toEqual({ message: ErrorCode.ERR_AUTH_REFRESH_REVOKED });
  });

  it('rejects refresh requests without a cookie', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const response = await agent.post('/auth/refresh');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: ErrorCode.ERR_AUTH_REFRESH_MISSING });
  });

  it('rejects expired refresh tokens', async () => {
    process.env.REFRESH_TOKEN_TTL_MS = '10';
    const { app } = await createApp();
    const agent = request.agent(app);

    const registerResponse = await agent.post('/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(registerResponse.status).toBe(201);
    const refreshCookie = getRefreshCookie(registerResponse);
    expectRefreshCookie(refreshCookie);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const refreshResponse = await request(app)
      .post('/auth/refresh')
      .set('Cookie', refreshCookie ?? '');

    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body).toEqual({ message: ErrorCode.ERR_AUTH_REFRESH_EXPIRED });
  });

  it('rejects unauthenticated requests with ERR_AUTH_401', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const response = await agent.get('/api/hunde');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: ErrorCode.ERR_AUTH_401 });
  });

  it('requires authentication for /auth/me', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const response = await agent.get('/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: ErrorCode.ERR_AUTH_401 });
  });

  it('rejects invalid JWTs with ERR_AUTH_INVALID_001', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const registerResponse = await agent.post('/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(registerResponse.status).toBe(201);

    const loginResponse = await agent.post('/auth/login').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(loginResponse.status).toBe(200);

    const invalidToken = `${loginResponse.body.token}invalid`;

    const response = await agent
      .get('/api/kunden')
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: ErrorCode.ERR_AUTH_INVALID_001 });
  });

  it('rejects expired JWTs with ERR_AUTH_EXPIRED_001', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const registerResponse = await agent.post('/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(registerResponse.status).toBe(201);

    const expiredToken = jwt.sign(
      {
        sub: registerResponse.body.user.id,
        email: TEST_EMAIL,
        role: 'user',
      },
      process.env.JWT_SECRET ?? 'super-secret',
      { expiresIn: '1s' },
    );

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const response = await agent
      .get('/api/kunden')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: ErrorCode.ERR_AUTH_EXPIRED_001 });
  });

  it('rejects wrong passwords with ERR_AUTH_LOGIN_001', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const registerResponse = await agent.post('/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(registerResponse.status).toBe(201);

    const response = await agent.post('/auth/login').send({
      email: TEST_EMAIL,
      password: 'incorrect-password',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: ErrorCode.ERR_AUTH_LOGIN_001 });
  });
});
