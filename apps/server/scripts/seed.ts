import { ErrorCode, LogCode } from '@dogule/domain';
import { logError, logInfo } from '@dogule/utils';

import { getDatabaseClient, loadConfig } from '../src/infrastructure';

interface CustomerSeed {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  notes?: string;
}

interface DogSeed {
  ownerEmail: string;
  name: string;
  geburtsdatum?: string;
  rasse?: string;
  notizen?: string;
}

const customers: CustomerSeed[] = [
  {
    firstName: 'Anna',
    lastName: 'Muster',
    email: 'anna.muster@example.com',
    phone: '+49 170 1234567',
    notes: 'Aktive Kursteilnehmerin',
  },
  {
    firstName: 'Ben',
    lastName: 'Schmidt',
    email: 'ben.schmidt@example.com',
    phone: '+49 170 7654321',
    notes: 'Interessiert an Einzeltraining',
  },
];

const dogs: DogSeed[] = [
  {
    ownerEmail: 'anna.muster@example.com',
    name: 'Rex',
    geburtsdatum: '2019-03-10',
    rasse: 'Labrador',
    notizen: 'Sehr verspielt',
  },
  {
    ownerEmail: 'ben.schmidt@example.com',
    name: 'Luna',
    geburtsdatum: '2020-07-22',
    rasse: 'Australian Shepherd',
    notizen: 'Mag Agility',
  },
];

const courses = ['kurs_welpenschule', 'kurs_agility_basic', 'kurs_nasenarbeit'];
const financeIds = ['finanzen_rechnung_001', 'finanzen_rechnung_002'];

const seed = async () => {
  loadConfig();

  const database = getDatabaseClient();
  let createdCustomers = 0;
  let createdDogs = 0;
  let createdCourses = 0;
  let createdFinances = 0;

  try {
    await database.connect();

    const customerIds = new Map<string, string>();

    for (const customer of customers) {
      const existing = await database.query<{ id: string }>({
        text: 'SELECT id FROM kunden WHERE email = $1',
        params: [customer.email],
      });

      if (existing[0]) {
        customerIds.set(customer.email, existing[0].id);
        continue;
      }

      const inserted = await database.query<{ id: string }>({
        text: `
          INSERT INTO kunden (first_name, last_name, email, phone, notes)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        params: [
          customer.firstName,
          customer.lastName,
          customer.email,
          customer.phone ?? null,
          customer.notes ?? null,
        ],
      });

      if (inserted[0]) {
        createdCustomers += 1;
        customerIds.set(customer.email, inserted[0].id);
      }
    }

    for (const dog of dogs) {
      const ownerId = customerIds.get(dog.ownerEmail);
      if (!ownerId) {
        continue;
      }

      const existing = await database.query<{ id: string }>({
        text: 'SELECT id FROM hunde WHERE kunde_id = $1 AND name = $2',
        params: [ownerId, dog.name],
      });

      if (existing[0]) {
        continue;
      }

      const inserted = await database.query<{ id: string }>({
        text: `
          INSERT INTO hunde (kunde_id, name, geburtsdatum, rasse, notizen)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        params: [
          ownerId,
          dog.name,
          dog.geburtsdatum ?? null,
          dog.rasse ?? null,
          dog.notizen ?? null,
        ],
      });

      if (inserted[0]) {
        createdDogs += 1;
      }
    }

    for (const courseId of courses) {
      const existing = await database.query<{ id: string }>({
        text: 'SELECT id FROM kurse WHERE id = $1',
        params: [courseId],
      });

      if (existing[0]) {
        continue;
      }

      await database.query({
        text: 'INSERT INTO kurse (id) VALUES ($1)',
        params: [courseId],
      });
      createdCourses += 1;
    }

    for (const financeId of financeIds) {
      const existing = await database.query<{ id: string }>({
        text: 'SELECT id FROM finanzen WHERE id = $1',
        params: [financeId],
      });

      if (existing[0]) {
        continue;
      }

      await database.query({
        text: 'INSERT INTO finanzen (id) VALUES ($1)',
        params: [financeId],
      });
      createdFinances += 1;
    }

    logInfo(LogCode.LOG_SEED_DONE_001, {
      customers: createdCustomers,
      dogs: createdDogs,
      courses: createdCourses,
      finances: createdFinances,
    });
  } catch (error) {
    logError(ErrorCode.ERR_SEED_001, error);
    process.exit(1);
  } finally {
    await database.disconnect().catch(() => undefined);
  }
};

seed().catch((error) => {
  logError(ErrorCode.ERR_SEED_001, error);
  process.exit(1);
});
