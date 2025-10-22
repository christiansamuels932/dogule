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

    await database.query({ text: "INSERT INTO kunden (id) VALUES ('cust-1'), ('cust-2')" });
    await database.query({ text: "INSERT INTO hunde (id) VALUES ('dog-1')" });
    await database.query({ text: "INSERT INTO kurse (id) VALUES ('course-1'), ('course-2'), ('course-3')" });
    await database.query({
      text: `
        INSERT INTO finanzen (datum, typ, betrag_cents)
        VALUES (current_date, 'einnahme', 1000)
      `,
    });
    const now = new Date().toISOString();
    await database.query({
      text: `
        INSERT INTO kalender_events (titel, start_at, end_at, status)
        VALUES
          ('Event 1', $1, $1, 'geplant'),
          ('Event 2', $2, $2, 'bestaetigt')
      `,
      params: [now, now],
    });
    await database.query({ text: "INSERT INTO kommunikation (id) VALUES ('msg-1'), ('msg-2'), ('msg-3'), ('msg-4')" });

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
