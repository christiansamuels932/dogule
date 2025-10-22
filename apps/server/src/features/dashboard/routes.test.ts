import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../index';
import { getDatabaseClient } from '../../infrastructure';

const TABLES = ['kommunikation', 'kalender_events', 'finanzen', 'kurse', 'hunde', 'kunden', 'users'] as const;

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

    const kundenRows = await database.query<{ id: string }>({
      text: `
        INSERT INTO kunden (first_name, last_name, email)
        VALUES
          ('Jane', 'Doe', 'jane@example.com'),
          ('John', 'Doe', 'john@example.com')
        RETURNING id
      `,
    });
    const [firstKunde] = kundenRows;

    await database.query({
      text: 'INSERT INTO hunde (kunde_id, name) VALUES ($1, $2)',
      params: [firstKunde.id, 'Rex'],
    });
    await database.query({
      text: `
        INSERT INTO kurse (titel, start_datum)
        VALUES
          ('Course 1', current_date),
          ('Course 2', current_date),
          ('Course 3', current_date)
      `,
    });
    await database.query({
      text: `
        INSERT INTO finanzen (datum, typ, betrag_cents)
        VALUES (current_date, 'einnahme', 1000)
      `,
    });
    const now = Date.now();
    const eventStart = new Date(now + 60 * 60 * 1000).toISOString();
    const eventEnd = new Date(now + 2 * 60 * 60 * 1000).toISOString();
    const secondStart = new Date(now + 3 * 60 * 60 * 1000).toISOString();
    const secondEnd = new Date(now + 4 * 60 * 60 * 1000).toISOString();
    await database.query({
      text: `
        INSERT INTO kalender_events (titel, start_at, end_at, status)
        VALUES
          ('Event 1', $1, $2, 'geplant'),
          ('Event 2', $3, $4, 'bestaetigt')
      `,
      params: [eventStart, eventEnd, secondStart, secondEnd],
    });
    await database.query({
      text: `
        INSERT INTO kommunikation (kanal, richtung, betreff, inhalt)
        VALUES
          ('email', 'eingehend', 'Hallo', 'Nachricht 1'),
          ('email', 'eingehend', 'Hallo', 'Nachricht 2'),
          ('email', 'ausgehend', 'Hallo', 'Nachricht 3'),
          ('email', 'ausgehend', 'Hallo', 'Nachricht 4')
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
      eventsUpcoming7d: 2,
    });
  });
});
