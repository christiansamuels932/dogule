import request, { SuperTest, Test } from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let createApp: typeof import('../../../index').createApp;
let getDatabaseClient: typeof import('../../../infrastructure').getDatabaseClient;
let DashboardService: typeof import('../../dashboard/service').DashboardService;
let KundenRepository: typeof import('../repository').KundenRepository;

describe('kunden integration', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://kunden-int-tests';
    process.env.JWT_SECRET = 'super-secret';
  });

  beforeAll(async () => {
    ({ createApp } = await import('../../../index'));
    ({ getDatabaseClient } = await import('../../../infrastructure'));
    ({ DashboardService } = await import('../../dashboard/service'));
    ({ KundenRepository } = await import('../repository'));
  });

  beforeEach(async () => {
    const database = getDatabaseClient();
    await database.query({ text: 'DELETE FROM kunden' });
    await database.query({ text: 'DELETE FROM users' });
  });

  const registerAndLogin = async (agent: SuperTest<Test>) => {
    const email = `user+${Date.now()}@example.com`;
    const password = 'password123';

    await agent.post('/auth/register').send({ email, password });
    const loginResponse = await agent.post('/auth/login').send({ email, password });

    expect(loginResponse.status).toBe(200);
    const token = loginResponse.body.token as string;
    expect(token).toBeDefined();

    return { token, email };
  };

  it('performs CRUD operations via REST and aligns dashboard count', async () => {
    const { app } = await createApp();
    const agent = request(app);
    const { token } = await registerAndLogin(agent);

    const repository = new KundenRepository();
    const dashboard = new DashboardService();

    const seedOne = await repository.create({
      firstName: 'Alice',
      lastName: 'Alpha',
      email: 'alice.alpha@example.com',
      phone: '1234567890',
    });
    await repository.create({
      firstName: 'Bob',
      lastName: 'Beta',
      email: 'bob.beta@example.com',
    });

    const listResponse = await agent
      .get('/api/kunden')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.total).toBe(2);

    const createResponse = await agent
      .post('/api/kunden')
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Charlie',
        lastName: 'Charlie',
        email: 'charlie@example.com',
        phone: '555-1234',
      });

    expect(createResponse.status).toBe(201);
    const createdId = createResponse.body.id as string;
    expect(createdId).toBeDefined();

    const getResponse = await agent
      .get(`/api/kunden/${createdId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      id: createdId,
      firstName: 'Charlie',
      lastName: 'Charlie',
      email: 'charlie@example.com',
    });

    const updateResponse = await agent
      .put(`/api/kunden/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '555-6789' });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.phone).toBe('555-6789');

    const deleteResponse = await agent
      .delete(`/api/kunden/${seedOne.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteResponse.status).toBe(204);

    const summary = await dashboard.getSummary();
    expect(summary.kundenCount).toBe(2);

    const listAfter = await agent
      .get('/api/kunden')
      .set('Authorization', `Bearer ${token}`);
    expect(listAfter.status).toBe(200);
    expect(listAfter.body.total).toBe(2);
    expect(Array.isArray(listAfter.body.data)).toBe(true);
    expect(listAfter.body.data).toHaveLength(2);
  });

  it('persists kunden created via GraphQL across app instances', async () => {
    const { app } = await createApp();
    const agent = request(app);
    const { token } = await registerAndLogin(agent);

    const mutation = `
      mutation CreateKunde($input: KundeInput!) {
        createKunde(input: $input) {
          id
          firstName
          lastName
          email
        }
      }
    `;

    const mutationResponse = await agent
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: mutation,
        variables: {
          input: {
            firstName: 'Dora',
            lastName: 'Delta',
            email: 'dora.delta@example.com',
          },
        },
      });

    expect(mutationResponse.status).toBe(200);
    const createdId = mutationResponse.body.data.createKunde.id as string;
    expect(createdId).toBeDefined();

    const { app: appReloaded } = await createApp();
    const reloadedAgent = request(appReloaded);

    const listResponse = await reloadedAgent
      .get('/api/kunden')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    const ids = (listResponse.body.data as Array<{ id: string }>).map((item) => item.id);
    expect(ids).toContain(createdId);
  });

  it('emits ERR_KUNDEN_CREATE_001 when insertion fails', async () => {
    const database = {
      query: vi.fn().mockRejectedValue(new Error('boom')),
    } as unknown as Pick<ReturnType<typeof getDatabaseClient>, 'query'>;
    const repository = new KundenRepository(database);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      repository.create({
        firstName: 'Erin',
        lastName: 'Error',
        email: 'erin.error@example.com',
      }),
    ).rejects.toThrowError('ERR_KUNDEN_CREATE_001');

    expect(errorSpy).toHaveBeenCalledWith('ERR_KUNDEN_CREATE_001', expect.any(Error));
    errorSpy.mockRestore();
  });
});
