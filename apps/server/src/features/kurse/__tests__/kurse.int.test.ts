import request, { SuperTest, Test } from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '@dogule/domain';

let createApp: typeof import('../../../index').createApp;
let getDatabaseClient: typeof import('../../../infrastructure').getDatabaseClient;
let DashboardService: typeof import('../../dashboard/service').DashboardService;
let KurseRepository: typeof import('../repository').KurseRepository;

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

describe('kurse integration', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://kurse-int-tests';
    process.env.JWT_SECRET = 'super-secret';
  });

  beforeAll(async () => {
    ({ createApp } = await import('../../../index'));
    ({ getDatabaseClient } = await import('../../../infrastructure'));
    ({ DashboardService } = await import('../../dashboard/service'));
    ({ KurseRepository } = await import('../repository'));
  });

  beforeEach(async () => {
    const database = getDatabaseClient();
    await database.query({ text: 'DELETE FROM kurse' });
    await database.query({ text: 'DELETE FROM users' });
  });

  it('performs CRUD operations with filters, pagination, and dashboard aggregation', async () => {
    const { app } = await createApp();
    const agent = request(app);
    const { token } = await registerAndLogin(agent);

    const repository = new KurseRepository();
    const dashboard = new DashboardService();

    const kursA = await repository.create({
      titel: 'Welpenkurs',
      beschreibung: 'Grundlagen für Welpen',
      start_datum: '2024-01-10',
      end_datum: '2024-01-20',
      ort: 'Berlin',
      preis_cents: 15000,
      max_teilnehmer: 10,
      status: 'geplant',
    });

    await repository.create({
      titel: 'Begleithunde',
      beschreibung: 'Fortgeschrittene Übungen',
      start_datum: '2024-02-05',
      end_datum: '2024-02-25',
      ort: 'Hamburg',
      preis_cents: 18000,
      max_teilnehmer: 8,
      status: 'laufend',
    });

    await repository.create({
      titel: 'Agility Basics',
      beschreibung: 'Einführung in Agility',
      start_datum: '2024-03-15',
      end_datum: '2024-03-30',
      ort: 'München',
      preis_cents: 20000,
      max_teilnehmer: 12,
      status: 'abgeschlossen',
    });

    const paginatedResponse = await agent
      .get('/api/kurse?limit=2&offset=0')
      .set('Authorization', `Bearer ${token}`);

    expect(paginatedResponse.status).toBe(200);
    expect(paginatedResponse.body.total).toBe(3);
    expect(paginatedResponse.body.limit).toBe(2);
    expect(paginatedResponse.body.offset).toBe(0);
    expect(Array.isArray(paginatedResponse.body.data)).toBe(true);
    expect(paginatedResponse.body.data).toHaveLength(2);

    const statusFiltered = await agent
      .get('/api/kurse?status=laufend')
      .set('Authorization', `Bearer ${token}`);

    expect(statusFiltered.status).toBe(200);
    expect(statusFiltered.body.total).toBe(1);
    expect(statusFiltered.body.data[0].status).toBe('laufend');

    const dateFiltered = await agent
      .get('/api/kurse?from=2024-02-01&to=2024-03-01')
      .set('Authorization', `Bearer ${token}`);

    expect(dateFiltered.status).toBe(200);
    expect(dateFiltered.body.total).toBe(1);
    expect(dateFiltered.body.data[0].titel).toBe('Begleithunde');

    const createResponse = await agent
      .post('/api/kurse')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titel: 'Sommerkurs',
        beschreibung: 'Outdoor Training',
        start_datum: '2024-04-10',
        end_datum: '2024-04-20',
        ort: 'Köln',
        preis_cents: 22000,
        max_teilnehmer: 9,
        status: 'geplant',
      });

    expect(createResponse.status).toBe(201);
    const createdId = createResponse.body.id as string;
    expect(createdId).toBeDefined();
    expect(createResponse.body.preis_cents).toBe(22000);
    expect(createResponse.body.max_teilnehmer).toBe(9);

    const getResponse = await agent
      .get(`/api/kurse/${createdId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      id: createdId,
      titel: 'Sommerkurs',
      status: 'geplant',
    });

    const updateResponse = await agent
      .put(`/api/kurse/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'laufend', preis_cents: 25000 });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.status).toBe('laufend');
    expect(updateResponse.body.preis_cents).toBe(25000);

    const deleteResponse = await agent
      .delete(`/api/kurse/${kursA.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);

    const summary = await dashboard.getSummary();
    expect(summary.kurseCount).toBe(3);

    const listAfter = await agent
      .get('/api/kurse?limit=10&offset=0')
      .set('Authorization', `Bearer ${token}`);

    expect(listAfter.status).toBe(200);
    expect(listAfter.body.total).toBe(3);
    expect(listAfter.body.data).toHaveLength(3);
  });

  it('persists kurse created via GraphQL across app instances', async () => {
    const { app } = await createApp();
    const agent = request(app);
    const { token } = await registerAndLogin(agent);

    const mutation = `
      mutation CreateKurs($input: KursInput!) {
        createKurs(input: $input) {
          id
          titel
          start_datum
          status
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
            titel: 'Herbstkurs',
            beschreibung: 'Übungen im Park',
            start_datum: '2024-09-01',
            end_datum: '2024-09-15',
            ort: 'Leipzig',
            status: 'geplant',
          },
        },
      });

    expect(mutationResponse.status).toBe(200);
    const createdId = mutationResponse.body.data.createKurs.id as string;
    expect(createdId).toBeDefined();

    const { app: reloadedApp } = await createApp();
    const reloadedAgent = request(reloadedApp);

    const listResponse = await reloadedAgent
      .get('/api/kurse')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    const ids = (listResponse.body.data as Array<{ id: string }>).map((item) => item.id);
    expect(ids).toContain(createdId);
  });

  it('emits ERR_KURSE_CREATE_001 when insertion fails', async () => {
    const database = {
      query: vi.fn().mockRejectedValue(new Error('boom')),
    } as unknown as Pick<ReturnType<typeof getDatabaseClient>, 'query'>;

    const repository = new KurseRepository(database);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      repository.create({
        titel: 'Fehlerkurs',
        start_datum: '2024-06-01',
        preis_cents: 0,
        max_teilnehmer: 0,
      }),
    ).rejects.toThrowError(ErrorCode.ERR_KURSE_CREATE_001);

    expect(errorSpy).toHaveBeenCalledWith(ErrorCode.ERR_KURSE_CREATE_001, expect.any(Error));
    errorSpy.mockRestore();
  });
});
