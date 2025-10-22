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

interface CourseSeed {
  key: string;
  titel: string;
  beschreibung?: string;
  startDatum: string;
  endDatum: string;
  ort: string;
  preisCents: number;
  maxTeilnehmer: number;
  status: 'geplant' | 'aktiv' | 'abgeschlossen';
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
  start: string;
  end: string;
  ort: string;
  courseKey?: string;
  dogKey?: string;
}

interface CommunicationSeed {
  senderEmail?: string;
  recipientEmail?: string;
  dogKey?: string;
  subject: string;
  body: string;
  sentAt: string;
  readAt?: string;
}

const toDogKey = (ownerEmail: string, name: string): string =>
  `${ownerEmail.trim().toLowerCase()}::${name.trim().toLowerCase()}`;
const toEmailKey = (email: string): string => email.trim().toLowerCase();

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
  {
    firstName: 'Hundeschule',
    lastName: 'Team',
    email: 'kontakt@hundeschule.example.com',
    phone: '+49 30 0000000',
    notes: 'Internes Teamkonto für Kommunikation',
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
    notizen: 'Junger Hund in der Welpenschule',
  },
];

const courseSeeds: CourseSeed[] = [
  {
    key: 'welpenschule_fruehling_2024',
    titel: 'Welpenschule Frühling 2024',
    beschreibung: 'Grundlagen der Erziehung für Junghunde mit Sozialisation und Bindungstraining.',
    startDatum: '2024-03-15',
    endDatum: '2024-05-31',
    ort: 'Hundeschule Berlin - Außenplatz',
    preisCents: 18000,
    maxTeilnehmer: 8,
    status: 'aktiv',
  },
  {
    key: 'agility_sommer_2024',
    titel: 'Agility Sommergruppe 2024',
    beschreibung: 'Aufbaukurs mit Fokus auf Schnelligkeit und sauberer Gerätearbeit.',
    startDatum: '2024-06-05',
    endDatum: '2024-08-28',
    ort: 'Hundeschule Berlin - Halle',
    preisCents: 24000,
    maxTeilnehmer: 10,
    status: 'geplant',
  },
  {
    key: 'nasenarbeit_workshop',
    titel: 'Nasenarbeit Intensiv Workshop',
    beschreibung: 'Wochenend-Workshop zur Vertiefung von Such- und Spürarbeit.',
    startDatum: '2024-04-20',
    endDatum: '2024-04-21',
    ort: 'Hundeschule Berlin - Seminarraum',
    preisCents: 9900,
    maxTeilnehmer: 6,
    status: 'abgeschlossen',
  },
];

const financeSeeds: FinanceSeed[] = [
  {
    datum: '2024-03-20',
    typ: 'einnahme',
    betragCents: 18000,
    kategorie: 'Kursgebühr',
    beschreibung: 'Teilnahmegebühr Welpenschule Anna Muster',
    referenz: 'invoice-welpenschule-anna',
  },
  {
    datum: '2024-03-22',
    typ: 'einnahme',
    betragCents: 18000,
    kategorie: 'Kursgebühr',
    beschreibung: 'Teilnahmegebühr Welpenschule Ben Schmidt',
    referenz: 'invoice-welpenschule-ben',
  },
  {
    datum: '2024-03-25',
    typ: 'ausgabe',
    betragCents: 4500,
    kategorie: 'Material',
    beschreibung: 'Neue Agility-Geräte für Sommergruppe',
    referenz: 'expense-agility-2024',
  },
  {
    datum: '2024-04-05',
    typ: 'ausgabe',
    betragCents: 2200,
    kategorie: 'Miete',
    beschreibung: 'Platzmiete Seminarraum Nasenarbeit',
    referenz: 'expense-nasenarbeit-raum',
  },
];

const calendarSeeds: CalendarEventSeed[] = [
  {
    titel: 'Welpenschule Gruppentraining',
    beschreibung: 'Sozialisationseinheit für junge Hunde inklusive Gerätegewöhnung.',
    start: '2024-04-10T15:00:00.000Z',
    end: '2024-04-10T16:30:00.000Z',
    ort: 'Außenplatz',
    courseKey: 'welpenschule_fruehling_2024',
    dogKey: toDogKey('anna.muster@example.com', 'Rex'),
  },
  {
    titel: 'Einzeltraining Luna - Impulskontrolle',
    beschreibung: 'Schwerpunkt Frustrationstoleranz und Entspannungssignal.',
    start: '2024-04-12T09:00:00.000Z',
    end: '2024-04-12T10:00:00.000Z',
    ort: 'Trainingshalle 2',
    dogKey: toDogKey('ben.schmidt@example.com', 'Luna'),
  },
  {
    titel: 'Agility Sommergruppe Kick-Off',
    beschreibung: 'Erste Stunde zur Einführung in Parcoursaufbau.',
    start: '2024-06-05T17:30:00.000Z',
    end: '2024-06-05T19:00:00.000Z',
    ort: 'Halle',
    courseKey: 'agility_sommer_2024',
  },
];

const communicationSeeds: CommunicationSeed[] = [
  {
    senderEmail: 'kontakt@hundeschule.example.com',
    recipientEmail: 'anna.muster@example.com',
    dogKey: toDogKey('anna.muster@example.com', 'Rex'),
    subject: 'Feedback zur letzten Welpenschule-Stunde',
    body: 'Rex hat tolle Fortschritte gemacht. Bitte üben Sie weiter das Rückrufsignal täglich.',
    sentAt: '2024-04-11T08:30:00.000Z',
    readAt: '2024-04-11T09:15:00.000Z',
  },
  {
    senderEmail: 'ben.schmidt@example.com',
    recipientEmail: 'kontakt@hundeschule.example.com',
    dogKey: toDogKey('ben.schmidt@example.com', 'Luna'),
    subject: 'Frage zum Trainingsplan von Luna',
    body: 'Können wir den Plan um zusätzliche Ruheübungen ergänzen? Luna wirkt zu Hause noch aufgeregt.',
    sentAt: '2024-04-13T18:45:00.000Z',
  },
  {
    senderEmail: 'kontakt@hundeschule.example.com',
    recipientEmail: 'clara.neumann@example.com',
    dogKey: toDogKey('clara.neumann@example.com', 'Nala'),
    subject: 'Vorbereitung auf den Nasenarbeits-Workshop',
    body: 'Bitte bringen Sie Nalas Lieblingsspielzeug und ausreichend Leckerlis mit.',
    sentAt: '2024-04-18T07:20:00.000Z',
  },
];

const seed = async () => {
  loadConfig();

  const database = getDatabaseClient();
  let createdCustomers = 0;
  let createdDogs = 0;
  let createdCourses = 0;
  let createdFinances = 0;
  let createdCalendarEvents = 0;
  let createdCommunications = 0;

  try {
    await database.connect();

    const customerIds = new Map<string, string>();
    const dogIds = new Map<string, string>();
    const courseIds = new Map<string, string>();

    for (const customer of customers) {
      const emailKey = toEmailKey(customer.email);
      const existing = await database.query<{ id: string }>({
        text: 'SELECT id FROM kunden WHERE email = $1',
        params: [customer.email],
      });

      if (existing[0]) {
        customerIds.set(emailKey, existing[0].id);
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
        customerIds.set(emailKey, inserted[0].id);
      }
    }

    for (const dog of dogs) {
      const ownerId = customerIds.get(toEmailKey(dog.ownerEmail));
      if (!ownerId) {
        continue;
      }

      const dogKey = toDogKey(dog.ownerEmail, dog.name);
      const existing = await database.query<{ id: string }>({
        text: 'SELECT id FROM hunde WHERE kunde_id = $1 AND LOWER(name) = LOWER($2)',
        params: [ownerId, dog.name],
      });

      if (existing[0]) {
        dogIds.set(dogKey, existing[0].id);
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
        dogIds.set(dogKey, inserted[0].id);
      }
    }

    for (const course of courseSeeds) {
      const existing = await database.query<{ id: string }>({
        text: 'SELECT id FROM kurse WHERE titel = $1 AND start_datum = $2',
        params: [course.titel, course.startDatum],
      });

      if (existing[0]) {
        courseIds.set(course.key, existing[0].id);
        continue;
      }

      const inserted = await database.query<{ id: string }>({
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
          RETURNING id
        `,
        params: [
          course.titel,
          course.beschreibung ?? null,
          course.startDatum,
          course.endDatum,
          course.ort,
          course.preisCents,
          course.maxTeilnehmer,
          course.status,
        ],
      });

      if (inserted[0]) {
        createdCourses += 1;
        courseIds.set(course.key, inserted[0].id);
      }
    }

    for (const finance of financeSeeds) {
      const existing = await database.query<{ id: string }>({
        text: `
          SELECT id
          FROM finanzen
          WHERE datum = $1
            AND typ = $2
            AND betrag_cents = $3
            AND COALESCE(referenz, '') = COALESCE($4, '')
        `,
        params: [finance.datum, finance.typ, finance.betragCents, finance.referenz ?? null],
      });

      if (existing[0]) {
        continue;
      }

      await database.query({
        text: `
          INSERT INTO finanzen (
            datum,
            typ,
            betrag_cents,
            kategorie,
            beschreibung,
            referenz
          )
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

    for (const event of calendarSeeds) {
      const relatedCourseId = event.courseKey ? courseIds.get(event.courseKey) ?? null : null;
      const relatedDogId = event.dogKey ? dogIds.get(event.dogKey) ?? null : null;

      if (event.courseKey && !relatedCourseId) {
        continue;
      }

      if (event.dogKey && !relatedDogId) {
        continue;
      }

      const existing = await database.query<{ id: string }>({
        text: 'SELECT id FROM kalender WHERE titel = $1 AND start_datum = $2',
        params: [event.titel, event.start],
      });

      if (existing[0]) {
        continue;
      }

      await database.query({
        text: `
          INSERT INTO kalender (
            titel,
            beschreibung,
            start_datum,
            end_datum,
            ort,
            related_kurs_id,
            related_hund_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        params: [
          event.titel,
          event.beschreibung ?? null,
          event.start,
          event.end,
          event.ort,
          relatedCourseId,
          relatedDogId,
        ],
      });
      createdCalendarEvents += 1;
    }

    for (const communication of communicationSeeds) {
      const senderId = communication.senderEmail
        ? customerIds.get(toEmailKey(communication.senderEmail)) ?? null
        : null;
      const recipientId = communication.recipientEmail
        ? customerIds.get(toEmailKey(communication.recipientEmail)) ?? null
        : null;
      const hundId = communication.dogKey ? dogIds.get(communication.dogKey) ?? null : null;

      if (communication.senderEmail && !senderId) {
        continue;
      }

      if (communication.recipientEmail && !recipientId) {
        continue;
      }

      if (communication.dogKey && !hundId) {
        continue;
      }

      const existing = await database.query<{ id: string }>({
        text: 'SELECT id FROM kommunikation WHERE subject = $1 AND sent_at = $2',
        params: [communication.subject, communication.sentAt],
      });

      if (existing[0]) {
        continue;
      }

      await database.query({
        text: `
          INSERT INTO kommunikation (
            sender_kunde_id,
            recipient_kunde_id,
            hund_id,
            subject,
            body,
            sent_at,
            read_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        params: [
          senderId,
          recipientId,
          hundId,
          communication.subject,
          communication.body,
          communication.sentAt,
          communication.readAt ?? null,
        ],
      });
      createdCommunications += 1;
    }

    logInfo(LogCode.LOG_SEED_DONE_001, {
      customers: createdCustomers,
      dogs: createdDogs,
      courses: createdCourses,
      finances: createdFinances,
      kalender: createdCalendarEvents,
      kommunikation: createdCommunications,
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
