import request, { SuperTest, Test } from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

let createApp: typeof import('../../../index').createApp;
let getDatabaseClient: typeof import('../../../infrastructure').getDatabaseClient;
let KalenderRepository: typeof import('../repository').KalenderRepository;
let KundenRepository: typeof import('../../kunden/repository').KundenRepository;
let HundeRepository: typeof import('../../hunde/repository').HundeRepository;
let KalenderService: typeof import('../service').KalenderService;

const iso = (date: Date): string => date.toISOString();

describe('kalender integration', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://kalender-int-tests';
    process.env.JWT_SECRET = 'super-secret';
  });

  beforeAll(async () => {
    ({ createApp } = await import('../../../index'));
    ({ getDatabaseClient } = await import('../../../infrastructure'));
    ({ KalenderRepository } = await import('../repository'));
    ({ KundenRepository } = await import('../../kunden/repository'));
    ({ HundeRepository } = await import('../../hunde/repository'));
    ({ KalenderService } = await import('../service'));
  });

  beforeEach(async () => {
    const database = getDatabaseClient();
    await database.query({ text: 'DELETE FROM kalender_events' });
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

    return { token };
  };

  const seedKundeUndHund = async () => {
    const kundenRepository = new KundenRepository();
    const hundeRepository = new HundeRepository();

    const kunde = await kundenRepository.create({
      firstName: 'Anna',
      lastName: 'Muster',
      email: `anna+${Date.now()}@example.com`,
      phone: '123456789',
    });

    const hund = await hundeRepository.create({
      kundeId: kunde.id,
      name: 'Bello',
    });

    return { kunde, hund };
  };

  it('performs REST operations with filters and counts', async () => {
    const { app } = await createApp();
    const agent = request(app);
    const { token } = await registerAndLogin(agent);

    const { kunde, hund } = await seedKundeUndHund();
    const repository = new KalenderRepository();
    const service = new KalenderService(repository);

    const now = new Date();
    const inOneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const inTenDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const eventInsideRange = await repository.create({
      titel: 'Training',
      beschreibung: 'Agility',
      startAt: iso(inOneDay),
      endAt: iso(new Date(inOneDay.getTime() + 60 * 60 * 1000)),
      ort: 'Park',
      kundeId: kunde.id,
      hundId: hund.id,
      status: 'geplant',
    });
    await repository.create({
      titel: 'Seminar',
      startAt: iso(inTenDays),
      endAt: iso(new Date(inTenDays.getTime() + 2 * 60 * 60 * 1000)),
      status: 'bestaetigt',
      kundeId: kunde.id,
    });
    await repository.create({
      titel: 'Vergangen',
      startAt: iso(threeDaysAgo),
      endAt: iso(new Date(threeDaysAgo.getTime() + 60 * 60 * 1000)),
      status: 'abgesagt',
    });

    const listResponse = await agent
      .get('/api/kalender')
      .set('Authorization', `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.total).toBe(3);
    expect(Array.isArray(listResponse.body.data)).toBe(true);

    const rangeResponse = await agent
      .get('/api/kalender')
      .query({ from: iso(now), to: iso(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)) })
      .set('Authorization', `Bearer ${token}`);
    expect(rangeResponse.status).toBe(200);
    expect(rangeResponse.body.total).toBe(1);
    expect(rangeResponse.body.data[0].id).toBe(eventInsideRange.id);

    const kundeFilterResponse = await agent
      .get('/api/kalender')
      .query({ kunde_id: kunde.id })
      .set('Authorization', `Bearer ${token}`);
    expect(kundeFilterResponse.status).toBe(200);
    expect(kundeFilterResponse.body.total).toBe(2);

    const hundFilterResponse = await agent
      .get('/api/kalender')
      .query({ hund_id: hund.id })
      .set('Authorization', `Bearer ${token}`);
    expect(hundFilterResponse.status).toBe(200);
    expect(hundFilterResponse.body.total).toBe(1);
    expect(hundFilterResponse.body.data[0].hundId).toBe(hund.id);

    const createResponse = await agent
      .post('/api/kalender')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titel: 'REST erstellt',
        start_at: iso(now),
        end_at: iso(new Date(now.getTime() + 30 * 60 * 1000)),
        ort: 'Studio',
        status: 'geplant',
        kunde_id: kunde.id,
        hund_id: hund.id,
      });
    expect(createResponse.status).toBe(201);
    const createdId = createResponse.body.id as string;
    expect(createdId).toBeDefined();
    expect(createResponse.body.titel).toBe('REST erstellt');

    const getResponse = await agent
      .get(`/api/kalender/${createdId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.id).toBe(createdId);
    expect(getResponse.body.status).toBe('geplant');

    const updateResponse = await agent
      .patch(`/api/kalender/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'bestaetigt' });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.status).toBe('bestaetigt');

    const countUpcoming = await service.count({
      from: iso(now),
      to: iso(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
    });
    expect(countUpcoming).toBe(2);

    const deleteResponse = await agent
      .delete(`/api/kalender/${createdId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteResponse.status).toBe(204);

    const invalidResponse = await agent
      .post('/api/kalender')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titel: 'Fehlerhaft',
        start_at: iso(now),
        end_at: iso(new Date(now.getTime() - 60 * 60 * 1000)),
      });
    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.message).toBe('ERR_KALENDER_INVALID_PAYLOAD');
  });

  it('supports GraphQL queries and mutations', async () => {
    const { app } = await createApp();
    const agent = request(app);
    const { token } = await registerAndLogin(agent);

    const { kunde, hund } = await seedKundeUndHund();
    const repository = new KalenderRepository();

    const now = new Date();
    await repository.create({
      titel: 'GraphQL Seed',
      startAt: iso(now),
      endAt: iso(new Date(now.getTime() + 60 * 60 * 1000)),
      status: 'geplant',
      kundeId: kunde.id,
      hundId: hund.id,
    });

    const listQuery = `
      query Events($from: String, $kunde_id: String) {
        events(from: $from, kunde_id: $kunde_id) {
          id
          titel
          status
          kundeId
        }
      }
    `;

    const listResponse = await agent
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: listQuery,
        variables: { from: iso(new Date(now.getTime() - 24 * 60 * 60 * 1000)), kunde_id: kunde.id },
      });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.events).toHaveLength(1);

    const createMutation = `
      mutation CreateEvent($input: KalenderEventCreateInput!) {
        createEvent(input: $input) {
          id
          titel
          status
          hundId
        }
      }
    `;

    const createMutationResponse = await agent
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: createMutation,
        variables: {
          input: {
            titel: 'GraphQL erstellt',
            startAt: iso(now),
            endAt: iso(new Date(now.getTime() + 90 * 60 * 1000)),
            status: 'geplant',
            kundeId: kunde.id,
            hundId: hund.id,
          },
        },
      });
    expect(createMutationResponse.status).toBe(200);
    const createdId = createMutationResponse.body.data.createEvent.id as string;
    expect(createdId).toBeDefined();

    const updateMutation = `
      mutation UpdateEvent($id: ID!, $input: KalenderEventUpdateInput!) {
        updateEvent(id: $id, input: $input) {
          id
          status
        }
      }
    `;

    const updateMutationResponse = await agent
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: updateMutation,
        variables: {
          id: createdId,
          input: { status: 'abgesagt' },
        },
      });
    expect(updateMutationResponse.status).toBe(200);
    expect(updateMutationResponse.body.data.updateEvent.status).toBe('abgesagt');

    const deleteMutation = `
      mutation DeleteEvent($id: ID!) {
        deleteEvent(id: $id)
      }
    `;

    const deleteMutationResponse = await agent
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({
        query: deleteMutation,
        variables: { id: createdId },
      });
    expect(deleteMutationResponse.status).toBe(200);
    expect(deleteMutationResponse.body.data.deleteEvent).toBe(true);
  });
});
