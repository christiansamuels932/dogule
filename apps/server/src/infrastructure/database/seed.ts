import bcrypt from 'bcrypt';

import { ErrorCode, LogCode } from '@dogule/domain';
import { logError, logInfo } from '@dogule/utils';

import type { DatabaseClient } from './client';
import { getDatabaseClient } from './index';

const SALT_ROUNDS = 10;

interface UserSeed {
  email: string;
  password: string;
  role: string;
}

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

interface CourseSeed {
  titel: string;
  beschreibung?: string;
  startDatum: string;
  endDatum?: string;
  ort?: string;
  preisCents?: number;
  maxTeilnehmer?: number;
  status?: 'geplant' | 'aktiv' | 'abgeschlossen';
}

interface FinanceSeed {
  datum: string;
  typ: 'einnahme' | 'ausgabe';
  betragCents: number;
  kategorie?: string;
  beschreibung?: string;
  referenz?: string;
}

interface CalendarEventSeed {
  titel: string;
  beschreibung?: string;
  startAt: string;
  endAt: string;
  ort?: string;
  kundeEmail?: string;
  hundKey?: string;
  status?: 'geplant' | 'bestaetigt' | 'abgesagt';
}

interface CommunicationSeed {
  kanal: string;
  richtung: string;
  betreff: string;
  inhalt: string;
  kundeEmail?: string;
  hundKey?: string;
}

export interface SeedDatabaseOptions {
  database?: DatabaseClient;
  users?: UserSeed[];
}

const DEFAULT_ADMIN: UserSeed = {
  email: 'prealpha.admin@example.com',
  password: 'prealpha-admin',
  role: 'admin',
};

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
  {
    firstName: 'Clara',
    lastName: 'Neumann',
    email: 'clara.neumann@example.com',
    phone: '+49 151 9876543',
    notes: 'Hat zwei Hunde in Ausbildung',
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
  {
    ownerEmail: 'clara.neumann@example.com',
    name: 'Milo',
    geburtsdatum: '2018-11-05',
    rasse: 'Border Collie',
    notizen: 'Arbeitet an Impulskontrolle',
  },
  {
    ownerEmail: 'clara.neumann@example.com',
    name: 'Nala',
    geburtsdatum: '2021-06-12',
    rasse: 'Golden Retriever',
    notizen: 'Lernt Grundkommandos',
  },
];

const courses: CourseSeed[] = [
  {
    titel: 'Welpenschule',
    beschreibung: 'Grundkommandos und Sozialisation für Welpen',
    startDatum: '2024-07-01',
    endDatum: '2024-08-15',
    ort: 'Hundeschule Berlin',
    preisCents: 19900,
    maxTeilnehmer: 10,
    status: 'aktiv',
  },
  {
    titel: 'Agility Fortgeschrittene',
    beschreibung: 'Aufbau und Training für ambitionierte Teams',
    startDatum: '2024-07-15',
    endDatum: '2024-09-01',
    ort: 'Sportplatz Mitte',
    preisCents: 24900,
    maxTeilnehmer: 8,
    status: 'geplant',
  },
  {
    titel: 'Mantrailing Workshop',
    beschreibung: 'Intensivtraining für Sucharbeit',
    startDatum: '2024-06-20',
    endDatum: '2024-06-22',
    ort: 'Waldgebiet Grunewald',
    preisCents: 14900,
    maxTeilnehmer: 6,
    status: 'abgeschlossen',
  },
];

const finances: FinanceSeed[] = [
  {
    datum: '2024-05-01',
    typ: 'einnahme',
    betragCents: 150000,
    kategorie: 'Kurse',
    beschreibung: 'Kursteilnahmen Mai',
    referenz: 'FIN-2024-05-001',
  },
  {
    datum: '2024-05-10',
    typ: 'ausgabe',
    betragCents: 45000,
    kategorie: 'Miete',
    beschreibung: 'Trainingsplatz Miete',
    referenz: 'FIN-2024-05-010',
  },
  {
    datum: '2024-05-15',
    typ: 'einnahme',
    betragCents: 89000,
    kategorie: 'Workshops',
    beschreibung: 'Mantrailing Workshop Einnahmen',
    referenz: 'FIN-2024-05-015',
  },
];

const calendarEvents: CalendarEventSeed[] = [
  {
    titel: 'Einzeltraining Rex',
    beschreibung: 'Leinenführigkeit und Rückruf',
    startAt: '2024-06-18T09:00:00.000Z',
    endAt: '2024-06-18T10:00:00.000Z',
    ort: 'Hundeschule Berlin',
    kundeEmail: 'anna.muster@example.com',
    hundKey: 'anna.muster@example.com::rex',
    status: 'bestaetigt',
  },
  {
    titel: 'Agility Training Luna',
    beschreibung: 'Sprungtechnik und Sequenzen',
    startAt: '2024-06-19T16:00:00.000Z',
    endAt: '2024-06-19T17:30:00.000Z',
    ort: 'Sportplatz Mitte',
    kundeEmail: 'ben.schmidt@example.com',
    hundKey: 'ben.schmidt@example.com::luna',
    status: 'bestaetigt',
  },
  {
    titel: 'Gruppenkurs Welpen',
    beschreibung: 'Sozialisation und Alltagsübungen',
    startAt: '2024-06-20T08:00:00.000Z',
    endAt: '2024-06-20T09:30:00.000Z',
    ort: 'Hundeschule Berlin',
    status: 'bestaetigt',
  },
];

const communications: CommunicationSeed[] = [
  {
    kanal: 'email',
    richtung: 'outbound',
    betreff: 'Willkommen bei Dogule',
    inhalt: 'Vielen Dank für Ihre Anmeldung bei unserer Hundeschule!',
    kundeEmail: 'anna.muster@example.com',
  },
  {
    kanal: 'sms',
    richtung: 'outbound',
    betreff: 'Kurstermin Erinnerung',
    inhalt: 'Bitte denken Sie an das Training am kommenden Mittwoch.',
    kundeEmail: 'ben.schmidt@example.com',
  },
  {
    kanal: 'email',
    richtung: 'inbound',
    betreff: 'Frage zu Trainingsplan',
    inhalt: 'Können wir den Trainingsplan für Nala anpassen?',
    kundeEmail: 'clara.neumann@example.com',
    hundKey: 'clara.neumann@example.com::nala',
  },
];

const toEmailKey = (email: string): string => email.trim().toLowerCase();
const toDogKey = (ownerEmail: string, name: string): string =>
  `${toEmailKey(ownerEmail)}::${name.trim().toLowerCase()}`;

const resolveSeedUsers = (options?: SeedDatabaseOptions): UserSeed[] => {
  if (options?.users && options.users.length > 0) {
    return options.users;
  }

  const email = process.env.PREALPHA_SEED_EMAIL ?? DEFAULT_ADMIN.email;
  const password = process.env.PREALPHA_SEED_PASSWORD ?? DEFAULT_ADMIN.password;
  const role = process.env.PREALPHA_SEED_ROLE ?? DEFAULT_ADMIN.role;

  return [
    {
      email,
      password,
      role,
    },
  ];
};

export const seedDatabase = async (options: SeedDatabaseOptions = {}): Promise<void> => {
  const database = options.database ?? getDatabaseClient();
  const shouldDisconnect = !options.database;

  await database.connect();

  let createdUsers = 0;
  let createdCustomers = 0;
  let createdDogs = 0;
  let createdCourses = 0;
  let createdFinances = 0;
  let createdCalendarEvents = 0;
  let createdCommunications = 0;

  const customerIds = new Map<string, string>();
  const dogIds = new Map<string, string>();

  try {
    for (const user of resolveSeedUsers(options)) {
      const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
      const existing = await database.query<{ id: string } & { role: string }>({
        text: `
          SELECT id, role
          FROM users
          WHERE LOWER(email) = LOWER($1)
        `,
        params: [user.email],
      });

      if (existing[0]) {
        await database.query({
          text: `
            UPDATE users
            SET hashed_password = $2, role = $3
            WHERE id = $1
          `,
          params: [existing[0].id, hashedPassword, user.role],
        });
      } else {
        await database.query({
          text: `
            INSERT INTO users (email, hashed_password, role)
            VALUES ($1, $2, $3)
          `,
          params: [user.email, hashedPassword, user.role],
        });
        createdUsers += 1;
      }
    }

    for (const customer of customers) {
      const key = toEmailKey(customer.email);
      const existing = await database.query<{ id: string }>({
        text: `
          SELECT id
          FROM kunden
          WHERE LOWER(email) = LOWER($1)
        `,
        params: [customer.email],
      });

      if (existing[0]) {
        customerIds.set(key, existing[0].id);
        continue;
      }

      const rows = await database.query<{ id: string }>({
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

      if (rows[0]) {
        customerIds.set(key, rows[0].id);
        createdCustomers += 1;
      }
    }

    for (const dog of dogs) {
      const ownerKey = toEmailKey(dog.ownerEmail);
      const ownerId = customerIds.get(ownerKey);
      if (!ownerId) {
        continue;
      }

      const key = toDogKey(dog.ownerEmail, dog.name);
      const existing = await database.query<{ id: string }>({
        text: `
          SELECT id
          FROM hunde
          WHERE kunde_id = $1 AND LOWER(name) = LOWER($2)
        `,
        params: [ownerId, dog.name],
      });

      if (existing[0]) {
        dogIds.set(key, existing[0].id);
        continue;
      }

      const rows = await database.query<{ id: string }>({
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

      if (rows[0]) {
        dogIds.set(key, rows[0].id);
        createdDogs += 1;
      }
    }

    for (const course of courses) {
      const existing = await database.query<{ id: string }>({
        text: `
          SELECT id
          FROM kurse
          WHERE LOWER(titel) = LOWER($1) AND start_datum = $2
        `,
        params: [course.titel, course.startDatum],
      });

      if (existing[0]) {
        continue;
      }

      await database.query({
        text: `
          INSERT INTO kurse (
            titel,
            beschreibung,
            start_datum,
            end_datum,
            ort,
            preis_cents,
            max_teilnehmer,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        params: [
          course.titel,
          course.beschreibung ?? null,
          course.startDatum,
          course.endDatum ?? null,
          course.ort ?? null,
          course.preisCents ?? 0,
          course.maxTeilnehmer ?? 0,
          course.status ?? 'geplant',
        ],
      });
      createdCourses += 1;
    }

    for (const finance of finances) {
      const existing = await database.query<{ id: string }>({
        text: `
          SELECT id
          FROM finanzen
          WHERE datum = $1 AND betrag_cents = $2 AND typ = $3
        `,
        params: [finance.datum, finance.betragCents, finance.typ],
      });

      if (existing[0]) {
        continue;
      }

      await database.query({
        text: `
          INSERT INTO finanzen (datum, typ, betrag_cents, kategorie, beschreibung, referenz)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        params: [
          finance.datum,
          finance.typ,
          finance.betragCents,
          finance.kategorie ?? null,
          finance.beschreibung ?? null,
          finance.referenz ?? null,
        ],
      });
      createdFinances += 1;
    }

    for (const event of calendarEvents) {
      const kundeId = event.kundeEmail ? customerIds.get(toEmailKey(event.kundeEmail)) ?? null : null;
      const hundId = event.hundKey ? dogIds.get(event.hundKey) ?? null : null;

      const existing = await database.query<{ id: string }>({
        text: `
          SELECT id
          FROM kalender_events
          WHERE titel = $1 AND start_at = $2
        `,
        params: [event.titel, event.startAt],
      });

      if (existing[0]) {
        continue;
      }

      await database.query({
        text: `
          INSERT INTO kalender_events (
            titel,
            beschreibung,
            start_at,
            end_at,
            ort,
            kunde_id,
            hund_id,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        params: [
          event.titel,
          event.beschreibung ?? null,
          event.startAt,
          event.endAt,
          event.ort ?? null,
          kundeId,
          hundId,
          event.status ?? 'geplant',
        ],
      });
      createdCalendarEvents += 1;
    }

    for (const communication of communications) {
      const kundeId = communication.kundeEmail
        ? customerIds.get(toEmailKey(communication.kundeEmail)) ?? null
        : null;
      const hundId = communication.hundKey ? dogIds.get(communication.hundKey) ?? null : null;

      const existing = await database.query<{ id: string }>({
        text: `
          SELECT id
          FROM kommunikation
          WHERE LOWER(betreff) = LOWER($1) AND kanal = $2
        `,
        params: [communication.betreff, communication.kanal],
      });

      if (existing[0]) {
        continue;
      }

      await database.query({
        text: `
          INSERT INTO kommunikation (
            kanal,
            richtung,
            betreff,
            inhalt,
            kunde_id,
            hund_id
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        params: [
          communication.kanal,
          communication.richtung,
          communication.betreff,
          communication.inhalt,
          kundeId,
          hundId,
        ],
      });
      createdCommunications += 1;
    }

    logInfo(LogCode.LOG_SEED_DONE_001, {
      users: createdUsers,
      customers: createdCustomers,
      dogs: createdDogs,
      courses: createdCourses,
      finances: createdFinances,
      kalender: createdCalendarEvents,
      kommunikation: createdCommunications,
    });
  } catch (error) {
    logError(ErrorCode.ERR_SEED_001, error);
    throw error instanceof Error ? error : new Error(ErrorCode.ERR_SEED_001);
  } finally {
    if (shouldDisconnect) {
      await database.disconnect().catch(() => undefined);
    }
  }
};
