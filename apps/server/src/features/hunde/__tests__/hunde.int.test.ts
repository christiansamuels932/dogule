import request, { SuperTest, Test } from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '@dogule/domain';

let createApp: typeof import('../../../index').createApp;
let getDatabaseClient: typeof import('../../../infrastructure').getDatabaseClient;
let DashboardService: typeof import('../../dashboard/service').DashboardService;
let KundenRepository: typeof import('../../kunden/repository').KundenRepository;
let HundeRepository: typeof import('../repository').HundeRepository;

describe('hunde integration', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://hunde-int-tests';
    process.env.JWT_SECRET = 'super-secret';
  });

  beforeAll(async () => {
    ({ createApp } = await import('../../../index'));
    ({ getDatabaseClient } = await import('../../../infrastructure'));
    ({ DashboardService } = await import('../../dashboard/service'));
    ({ KundenRepository } = await import('../../kunden/repository'));
    ({ HundeRepository } = await import('../repository'));
  });

  beforeEach(async () => {
    const database = getDatabaseClient();
    await database.query({ text: 'DELETE FROM hunde' });
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

  it('performs REST CRUD operations with filtering and updates dashboard count', async () => {
    const { app } = await createApp();
    const agent = request(app);
    const { token } = await registerAndLogin(agent);

    const kundenRepository = new KundenRepository();
    const hundeRepository = new HundeRepository();
    const dashboard = new DashboardService();

    const kunde = await kundenRepository.create({
      firstName: 'Hannah',
      lastName: 'Hundelieb',
      email: 'hannah@example.com',
      phone: '1234567890',
    });

    const seedOne = await hundeRepository.create({
      kundeId: kunde.id,
      name: 'Bello',
      geburtsdatum: '2020-01-01',
      rasse: 'Labrador',
      notizen: 'Very friendly',
    });

    const seedTwo = await hundeRepository.create({
      kundeId: kunde.id,
      name: 'Luna',
      rasse: 'Border Collie',
    });

    const listResponse = await agent
      .get('/api/hunde')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.total).toBe(2);
    expect(listResponse.body.limit).toBe(50);
    expect(listResponse.body.offset).toBe(0);
    expect(Array.isArray(listResponse.body.data)).toBe(true);
    expect(listResponse.body.data).toHaveLength(2);

    const filteredResponse = await agent
      .get(`/api/hunde?kunde_id=${kunde.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(filteredResponse.status).toBe(200);
    expect(filteredResponse.body.total).toBe(2);
    expect(filteredResponse.body.data).toHaveLength(2);

    const createResponse = await agent
      .post('/api/hunde')
      .set('Authorization', `Bearer ${token}`)
      .send({
        kunde_id: kunde.id,
        name: 'Milo',
        geburtsdatum: '2021-05-05',
        rasse: 'Beagle',
        notizen: 'Needs extra training',
      });

    expect(createResponse.status).toBe(201);
    const createdId = createResponse.body.id as string;
    expect(createdId).toBeDefined();

    const getResponse = await agent
      .get(`/api/hunde/${createdId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      id: createdId,
      kundeId: kunde.id,
      name: 'Milo',
      geburtsdatum: '2021-05-05',
      rasse: 'Beagle',
      notizen: 'Needs extra training',
    });

    const updateResponse = await agent
      .put(`/api/hunde/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Milo II',
        geburtsdatum: '2022-06-06',
        rasse: 'Beagle',
        notizen: 'Graduated training',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      id: createdId,
      name: 'Milo II',
      geburtsdatum: '2022-06-06',
      rasse: 'Beagle',
      notizen: 'Graduated training',
    });

    const deleteResponse = await agent
      .delete(`/api/hunde/${seedOne.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);

    const summary = await dashboard.getSummary();
    expect(summary.hundeCount).toBe(2);

    const listAfter = await agent
      .get('/api/hunde')
      .set('Authorization', `Bearer ${token}`);

    expect(listAfter.status).toBe(200);
    expect(listAfter.body.total).toBe(2);
    expect(listAfter.body.data).toHaveLength(2);

    const filteredAfter = await agent
      .get(`/api/hunde?kunde_id=${kunde.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(filteredAfter.status).toBe(200);
    expect(filteredAfter.body.total).toBe(2);
    expect(filteredAfter.body.data).toHaveLength(2);

    const deleteSecondResponse = await agent
      .delete(`/api/hunde/${seedTwo.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteSecondResponse.status).toBe(204);

    const finalSummary = await dashboard.getSummary();
    expect(finalSummary.hundeCount).toBe(1);
  });

  it('persists hunde created via GraphQL and reflects counts on the dashboard', async () => {
    const { app } = await createApp();
    const agent = request(app);
    const { token } = await registerAndLogin(agent);

    const kundenRepository = new KundenRepository();
    const kunde = await kundenRepository.create({
      firstName: 'Greta',
      lastName: 'GraphQL',
      email: 'greta@example.com',
    });

    const mutation = `
      mutation CreateHund($input: HundInput!) {
        createHund(input: $input) {
          id
          kundeId
          name
          geburtsdatum
          rasse
          notizen
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
            kundeId: kunde.id,
            name: 'GraphQL Hund',
            geburtsdatum: '2021-01-01',
            rasse: 'Retriever',
            notizen: 'Created via GraphQL',
          },
        },
      });

    expect(mutationResponse.status).toBe(200);
    const createdId = mutationResponse.body.data.createHund.id as string;
    expect(createdId).toBeDefined();

    const { app: reloadedApp } = await createApp();
    const reloadedAgent = request(reloadedApp);

    const listResponse = await reloadedAgent
      .get('/api/hunde')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    const ids = (listResponse.body.data as Array<{ id: string }>).map((item) => item.id);
    expect(ids).toContain(createdId);

    const dashboardResponse = await reloadedAgent
      .get('/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.hundeCount).toBeGreaterThanOrEqual(1);
  });

  it('emits ERR_HUNDE_CREATE_001 when insertion fails', async () => {
    const database = {
      query: vi.fn().mockRejectedValue(new Error('boom')),
    } as unknown as Pick<ReturnType<typeof getDatabaseClient>, 'query'>;
    const repository = new HundeRepository(database);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      repository.create({
        kundeId: '00000000-0000-0000-0000-000000000000',
        name: 'Error Hund',
      }),
    ).rejects.toThrowError(ErrorCode.ERR_HUNDE_CREATE_001);

    expect(errorSpy).toHaveBeenCalledWith(ErrorCode.ERR_HUNDE_CREATE_001, expect.any(Error));
    errorSpy.mockRestore();
  });
});
