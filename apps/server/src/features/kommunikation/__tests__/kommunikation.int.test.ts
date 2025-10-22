import express from 'express';
import request from 'supertest';
import { ApolloServer } from 'apollo-server-express';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDatabaseClient } from '../../../infrastructure';
import { DashboardService } from '../../dashboard/service';
import { KundenRepository } from '../../kunden/repository';
import { HundeRepository } from '../../hunde/repository';
import { KommunikationRepository } from '../repository';
import kommunikationRouter from '../routes';

const createRestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/kommunikation', kommunikationRouter);
  return app;
};

describe('kommunikation integration', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://kommunikation-int-tests';
    process.env.JWT_SECRET = 'super-secret';
  });

  beforeEach(async () => {
    const database = getDatabaseClient();
    await database.query({ text: 'DELETE FROM kommunikation' });
    await database.query({ text: 'DELETE FROM hunde' });
    await database.query({ text: 'DELETE FROM kunden' });
    await database.query({ text: 'DELETE FROM users' });
  });

  it('performs REST CRUD with filters and updates the dashboard count', async () => {
    const app = createRestApp();
    const agent = request(app);

    const kundenRepository = new KundenRepository();
    const hundeRepository = new HundeRepository();
    const kommunikationRepository = new KommunikationRepository();
    const dashboard = new DashboardService();
    const database = getDatabaseClient();

    const kundeA = await kundenRepository.create({
      firstName: 'Anna',
      lastName: 'Alpen',
      email: 'anna@example.com',
      phone: '1234567890',
    });

    const kundeB = await kundenRepository.create({
      firstName: 'Bernd',
      lastName: 'Berg',
      email: 'bernd@example.com',
    });

    const hundA = await hundeRepository.create({
      kundeId: kundeA.id,
      name: 'Rex',
    });

    const entryOld = await kommunikationRepository.create({
      kanal: 'email',
      richtung: 'eingehend',
      betreff: 'Willkommen',
      inhalt: 'Hallo Anna',
      kundeId: kundeA.id,
      hundId: hundA.id,
    });

    await database.query({
      text: 'UPDATE kommunikation SET created_at = $1 WHERE id = $2',
      params: ['2023-01-01T10:00:00.000Z', entryOld.id],
    });

    const entryRecent = await kommunikationRepository.create({
      kanal: 'sms',
      richtung: 'ausgehend',
      betreff: 'Termin',
      inhalt: 'Bitte Termin bestätigen',
      kundeId: kundeA.id,
    });

    const entryOtherKunde = await kommunikationRepository.create({
      kanal: 'telefon',
      richtung: 'eingehend',
      betreff: 'Frage',
      inhalt: 'Wann ist der Kurs?',
      kundeId: kundeB.id,
    });

    await database.query({
      text: 'UPDATE kommunikation SET created_at = $1 WHERE id = $2',
      params: ['2023-01-02T10:00:00.000Z', entryOtherKunde.id],
    });

    const listResponse = await agent.get('/api/kommunikation');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.total).toBe(3);
    expect(listResponse.body.limit).toBe(50);
    expect(listResponse.body.offset).toBe(0);
    expect(Array.isArray(listResponse.body.data)).toBe(true);
    expect(listResponse.body.data).toHaveLength(3);

    const kundeFilterResponse = await agent.get(`/api/kommunikation?kunde_id=${kundeA.id}`);
    expect(kundeFilterResponse.status).toBe(200);
    expect(kundeFilterResponse.body.total).toBe(2);

    const hundFilterResponse = await agent.get(`/api/kommunikation?hund_id=${hundA.id}`);
    expect(hundFilterResponse.status).toBe(200);
    expect(hundFilterResponse.body.total).toBe(1);
    expect(hundFilterResponse.body.data[0].id).toBe(entryOld.id);

    const kanalFilterResponse = await agent.get('/api/kommunikation?kanal=sms');
    expect(kanalFilterResponse.status).toBe(200);
    expect(kanalFilterResponse.body.total).toBe(1);
    expect(kanalFilterResponse.body.data[0].id).toBe(entryRecent.id);

    const fromDate = new Date(new Date(entryRecent.createdAt).getTime() - 1000).toISOString();
    const toDate = new Date(new Date(entryRecent.createdAt).getTime() + 1000).toISOString();

    const rangeResponse = await agent.get(
      `/api/kommunikation?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`,
    );

    expect(rangeResponse.status).toBe(200);
    expect(rangeResponse.body.total).toBe(1);
    expect(rangeResponse.body.data[0].id).toBe(entryRecent.id);

    const createResponse = await agent.post('/api/kommunikation').send({
      kanal: 'email',
      richtung: 'ausgehend',
      betreff: 'Danke',
      inhalt: 'Vielen Dank für Ihre Anfrage',
      kunde_id: kundeB.id,
    });

    expect(createResponse.status).toBe(201);
    const createdId = createResponse.body.id as string;
    expect(createdId).toBeDefined();

    const getResponse = await agent.get(`/api/kommunikation/${createdId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({
      id: createdId,
      kanal: 'email',
      richtung: 'ausgehend',
      betreff: 'Danke',
      inhalt: 'Vielen Dank für Ihre Anfrage',
      kundeId: kundeB.id,
    });

    const updateResponse = await agent.put(`/api/kommunikation/${createdId}`).send({
      betreff: 'Vielen Dank',
      inhalt: 'Wir melden uns bald',
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.betreff).toBe('Vielen Dank');
    expect(updateResponse.body.inhalt).toBe('Wir melden uns bald');

    const kanalAfterUpdate = await agent.get('/api/kommunikation?kanal=email');
    expect(kanalAfterUpdate.status).toBe(200);
    expect(kanalAfterUpdate.body.total).toBe(2);

    const deleteResponse = await agent.delete(`/api/kommunikation/${entryOtherKunde.id}`);
    expect(deleteResponse.status).toBe(204);

    const summary = await dashboard.getSummary();
    expect(summary.kommunikationCount).toBe(3);
  });

  it('supports GraphQL CRUD operations with filters', async () => {
    vi.mock('../../kurse/service', () => ({
      KurseService: class {
        list = vi.fn().mockResolvedValue({ data: [] });
        create = vi.fn();
      },
    }));

    const { typeDefs, resolvers } = await import('../../../graphql/schema');
    const apollo = new ApolloServer({ typeDefs, resolvers });
    await apollo.start();

    const kundenRepository = new KundenRepository();
    const kommunikationRepository = new KommunikationRepository();

    const kunde = await kundenRepository.create({
      firstName: 'Gina',
      lastName: 'GraphQL',
      email: 'gina@example.com',
    });

    const createResult = await apollo.executeOperation({
      query: `
        mutation CreateNachricht($input: NachrichtInput!) {
          createNachricht(input: $input) {
            id
            kanal
            betreff
          }
        }
      `,
      variables: {
        input: {
          kanal: 'graphql',
          richtung: 'eingehend',
          betreff: 'Erste Anfrage',
          inhalt: 'Hallo GraphQL',
          kundeId: kunde.id,
        },
      },
    });

    expect(createResult.errors).toBeUndefined();
    const createdId = createResult.data?.createNachricht.id as string;
    expect(createdId).toBeDefined();

    const listResult = await apollo.executeOperation({
      query: `
        query Nachrichten($filters: NachrichtFilterInput) {
          nachrichten(filters: $filters) {
            total
            data {
              id
              kanal
              richtung
              betreff
              inhalt
              kundeId
            }
          }
        }
      `,
      variables: {
        filters: {
          kanal: 'graphql',
          kundeId: kunde.id,
        },
      },
    });

    expect(listResult.errors).toBeUndefined();
    expect(listResult.data?.nachrichten.total).toBe(1);
    expect(listResult.data?.nachrichten.data[0].id).toBe(createdId);

    const updateResult = await apollo.executeOperation({
      query: `
        mutation UpdateNachricht($id: ID!, $input: NachrichtUpdateInput!) {
          updateNachricht(id: $id, input: $input) {
            id
            betreff
            inhalt
          }
        }
      `,
      variables: {
        id: createdId,
        input: {
          betreff: 'Antwort',
          inhalt: 'Danke für Ihre Nachricht',
        },
      },
    });

    expect(updateResult.errors).toBeUndefined();
    expect(updateResult.data?.updateNachricht.betreff).toBe('Antwort');

    const deleteResult = await apollo.executeOperation({
      query: `
        mutation DeleteNachricht($id: ID!) {
          deleteNachricht(id: $id)
        }
      `,
      variables: { id: createdId },
    });

    expect(deleteResult.errors).toBeUndefined();
    expect(deleteResult.data?.deleteNachricht).toBe(true);

    const finalList = await apollo.executeOperation({
      query: `
        query Nachrichten($filters: NachrichtFilterInput) {
          nachrichten(filters: $filters) {
            total
            data {
              id
            }
          }
        }
      `,
      variables: {
        filters: {
          kanal: 'graphql',
          kundeId: kunde.id,
        },
      },
    });

    expect(finalList.errors).toBeUndefined();
    expect(finalList.data?.nachrichten.total).toBe(0);

    await apollo.stop();
    vi.resetModules();
    vi.clearAllMocks();
  });
});
