import request, { SuperTest, Test } from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let createApp: typeof import('../../../index').createApp;
let getDatabaseClient: typeof import('../../../infrastructure').getDatabaseClient;
let DashboardService: typeof import('../../dashboard/service').DashboardService;
let FinanzenRepository: typeof import('../repository').FinanzenRepository;

const formatDate = (value: Date): string => value.toISOString().slice(0, 10);

describe('finanzen integration', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://finanzen-int-tests';
    process.env.JWT_SECRET = 'super-secret';
  });

  beforeAll(async () => {
    ({ createApp } = await import('../../../index'));
    ({ getDatabaseClient } = await import('../../../infrastructure'));
    ({ DashboardService } = await import('../../dashboard/service'));
    ({ FinanzenRepository } = await import('../repository'));
  });

  beforeEach(async () => {
    const database = getDatabaseClient();
    await database.query({ text: 'DELETE FROM finanzen' });
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

    return { token };
  };

  it('performs CRUD operations via REST and aggregates sums', async () => {
    const { app } = await createApp();
    const agent = request(app);
    const { token } = await registerAndLogin(agent);

    const repository = new FinanzenRepository();
    const dashboard = new DashboardService();

    const now = new Date();
    const incomeSeed = await repository.create({
      datum: formatDate(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      typ: 'einnahme',
      betragCents: 2500,
      kategorie: 'Training',
      beschreibung: 'Hundeschule',
      referenz: 'INV-1',
    });
    await repository.create({
      datum: formatDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)),
      typ: 'ausgabe',
      betragCents: 1500,
      beschreibung: 'Futter',
      referenz: 'EXP-1',
    });

    const listResponse = await agent
      .get('/api/finanzen')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.total).toBe(2);
    expect(listResponse.body.data).toHaveLength(2);

    const createResponse = await agent
      .post('/api/finanzen')
      .set('Authorization', `Bearer ${token}`)
      .send({
        datum: formatDate(now),
        typ: 'einnahme',
        betrag_cents: 5000,
        kategorie: 'Seminar',
      });

    expect(createResponse.status).toBe(201);
    const createdId = createResponse.body.id as string;
    expect(createdId).toBeDefined();

    const getResponse = await agent
      .get(`/api/finanzen/${createdId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      id: createdId,
      typ: 'einnahme',
      betragCents: 5000,
      kategorie: 'Seminar',
    });

    const updateResponse = await agent
      .put(`/api/finanzen/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        betrag_cents: 6000,
        beschreibung: 'Aktualisiert',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.betragCents).toBe(6000);
    expect(updateResponse.body.beschreibung).toBe('Aktualisiert');

    const sumIncomeResponse = await agent
      .get('/api/finanzen/sum')
      .query({ from: formatDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)), typ: 'einnahme' })
      .set('Authorization', `Bearer ${token}`);

    expect(sumIncomeResponse.status).toBe(200);
    expect(sumIncomeResponse.body.sum).toBe(8500);

    const sumExpenseResponse = await agent
      .get('/api/finanzen/sum')
      .query({ typ: 'ausgabe' })
      .set('Authorization', `Bearer ${token}`);

    expect(sumExpenseResponse.status).toBe(200);
    expect(sumExpenseResponse.body.sum).toBe(1500);

    const filteredResponse = await agent
      .get('/api/finanzen')
      .query({ typ: 'ausgabe' })
      .set('Authorization', `Bearer ${token}`);

    expect(filteredResponse.status).toBe(200);
    expect(filteredResponse.body.total).toBe(1);
    expect(filteredResponse.body.data).toHaveLength(1);
    expect(filteredResponse.body.data[0].typ).toBe('ausgabe');

    const deleteResponse = await agent
      .delete(`/api/finanzen/${createdId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);

    const summary = await dashboard.getSummary();
    expect(summary.finanzenCount).toBe(2);
    expect(summary.finanzenEinnahmen).toBe(2500);
    expect(summary.finanzenAusgaben).toBe(1500);

    const listAfterDeletion = await agent
      .get('/api/finanzen')
      .set('Authorization', `Bearer ${token}`);

    expect(listAfterDeletion.status).toBe(200);
    expect(listAfterDeletion.body.total).toBe(2);
    expect(listAfterDeletion.body.data).toHaveLength(2);
    const ids = (listAfterDeletion.body.data as Array<{ id: string }>).map((item) => item.id);
    expect(ids).toContain(incomeSeed.id);
  });

  it('supports GraphQL queries and mutations', async () => {
    const { app } = await createApp();
    const agent = request(app);
    const { token } = await registerAndLogin(agent);

    const mutation = `
      mutation CreateFinanz($input: FinanzInput!) {
        createFinanz(input: $input) {
          id
          typ
          betragCents
          datum
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
            datum: formatDate(new Date()),
            typ: 'ausgabe',
            betragCents: 1234,
            beschreibung: 'GraphQL Test',
          },
        },
      });

    expect(mutationResponse.status).toBe(200);
    const createdId = mutationResponse.body.data.createFinanz.id as string;
    expect(createdId).toBeDefined();

    const query = `
      query Finanzen($from: String, $typ: String) {
        finanzen(from: $from, typ: $typ) {
          id
          typ
          datum
          betragCents
        }
      }
    `;

    const queryResponse = await agent
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query,
        variables: {
          from: formatDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
          typ: 'ausgabe',
        },
      });

    expect(queryResponse.status).toBe(200);
    const finanzEntries = queryResponse.body.data.finanzen as Array<{ id: string; typ: string }>;
    expect(Array.isArray(finanzEntries)).toBe(true);
    const ids = finanzEntries.map((entry) => entry.id);
    expect(ids).toContain(createdId);
  });

  it('emits ERR_FINANZ_CREATE_001 when invalid typ insertion fails', async () => {
    const repository = new FinanzenRepository();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      repository.create({
        datum: formatDate(new Date()),
        typ: 'invalid' as unknown as 'einnahme',
        betragCents: 1000,
      }),
    ).rejects.toThrowError('ERR_FINANZ_CREATE_001');

    expect(errorSpy).toHaveBeenCalledWith('[ERROR]', 'ERR_FINANZ_CREATE_001', expect.any(Error));
    errorSpy.mockRestore();
  });
});
