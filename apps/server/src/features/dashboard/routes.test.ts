import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../index';
import { getDatabaseClient } from '../../infrastructure';

const TABLES = ['kommunikation', 'kalender', 'finanzen', 'kurse', 'hunde', 'kunden', 'users'] as const;

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
      text: "INSERT INTO kunden (id, first_name, last_name, email) VALUES ('cust-1', 'Jane', 'Doe', 'jane@example.com'), ('cust-2', 'John', 'Doe', 'john@example.com')",
    });
    await database.query({
      text: "INSERT INTO hunde (id, kunde_id, name) VALUES ('dog-1', 'cust-1', 'Rex')",
    });
    await database.query({
      text: `
        INSERT INTO kurse (id, titel, start_datum)
        VALUES
          ('course-1', 'Course 1', current_date),
          ('course-2', 'Course 2', current_date),
          ('course-3', 'Course 3', current_date)
      `,
    });
    await database.query({
      text: `
        INSERT INTO finanzen (datum, typ, betrag_cents)
        VALUES (current_date, 'einnahme', 1000)
      `,
    });
    await database.query({ text: "INSERT INTO kalender (id) VALUES ('event-1'), ('event-2')" });
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
    });
  });
});
