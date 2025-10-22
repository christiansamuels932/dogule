import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../index';
import { getDatabaseClient } from '../../infrastructure';

const TABLES = ['kommunikation', 'kalender', 'finanzen', 'kurse', 'hunde', 'kunden', 'users'] as const;
const CUSTOMER_ONE_ID = '11111111-1111-1111-1111-111111111111';
const CUSTOMER_TWO_ID = '22222222-2222-2222-2222-222222222222';
const DOG_ID = '33333333-3333-3333-3333-333333333333';

describe('dashboard routes', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'pg-mem://dashboard-tests';
    process.env.JWT_SECRET = 'dashboard-secret';
  });

  afterEach(async () => {
    const database = getDatabaseClient();
    for (const table of TABLES) {
      await database.query({ text: `DELETE FROM ${table}` });
    }
  });

  it('returns aggregated module counts', async () => {
    const { app } = await createApp();
    const agent = request(app);

    const registerResponse = await agent.post('/auth/register').send({
      email: 'dashboard@example.com',
      password: 'password123',
    });

    const token = registerResponse.body.token as string;
    const database = getDatabaseClient();

    await database.query({
      text: `
        INSERT INTO kunden (id, first_name, last_name, email)
        VALUES
          ('${CUSTOMER_ONE_ID}', 'Test', 'Eins', 'kunde1@example.com'),
          ('${CUSTOMER_TWO_ID}', 'Test', 'Zwei', 'kunde2@example.com')
      `,
    });
    await database.query({
      text: `
        INSERT INTO hunde (id, kunde_id, name)
        VALUES ('${DOG_ID}', '${CUSTOMER_ONE_ID}', 'Buddy')
      `,
    });
    await database.query({
      text: `
        INSERT INTO kurse (titel, start_datum, end_datum, ort, preis_cents, max_teilnehmer, status)
        VALUES
          ('Kurs A', current_date, current_date + INTERVAL '30 days', 'Ort A', 10000, 10, 'aktiv'),
          ('Kurs B', current_date + INTERVAL '1 day', current_date + INTERVAL '31 days', 'Ort B', 12000, 12, 'geplant'),
          ('Kurs C', current_date + INTERVAL '2 days', current_date + INTERVAL '32 days', 'Ort C', 15000, 8, 'geplant')
      `,
    });
    await database.query({
      text: `
        INSERT INTO finanzen (datum, typ, betrag_cents)
        VALUES (current_date, 'einnahme', 1000)
      `,
    });
    await database.query({
      text: `
        INSERT INTO kalender (titel, start_datum, end_datum, ort)
        VALUES
          ('Event 1', now(), now() + INTERVAL '1 hour', 'Ort A'),
          ('Event 2', now() + INTERVAL '1 day', now() + INTERVAL '1 day 1 hour', 'Ort B')
      `,
    });
    await database.query({
      text: `
        INSERT INTO kommunikation (sender_kunde_id, recipient_kunde_id, hund_id, subject, body, sent_at)
        VALUES
          ('${CUSTOMER_ONE_ID}', '${CUSTOMER_TWO_ID}', '${DOG_ID}', 'Betreff 1', 'Nachricht 1', now()),
          ('${CUSTOMER_TWO_ID}', '${CUSTOMER_ONE_ID}', '${DOG_ID}', 'Betreff 2', 'Nachricht 2', now()),
          ('${CUSTOMER_ONE_ID}', '${CUSTOMER_TWO_ID}', NULL, 'Betreff 3', 'Nachricht 3', now()),
          ('${CUSTOMER_TWO_ID}', '${CUSTOMER_ONE_ID}', NULL, 'Betreff 4', 'Nachricht 4', now())
      `,
    });

    const response = await agent.get('/dashboard').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      kundenCount: 2,
      hundeCount: 1,
      kurseCount: 3,
      finanzenCount: 1,
      finanzenEinnahmen: 1000,
      finanzenAusgaben: 0,
      kalenderCount: 2,
      kommunikationCount: 4,
    });
  });
});
