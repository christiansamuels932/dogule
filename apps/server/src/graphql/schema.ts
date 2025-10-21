import { gql } from 'apollo-server-express';
import {
  CustomerCreateInput,
  DogCreateInput,
  FinancialRecordCreateInput,
  CalendarEventCreateInput,
  MessageCreateInput,
} from '../../../../packages/domain';
import { KundenService } from '../features/kunden/service';
import { HundeService } from '../features/hunde/service';
import { KurseService } from '../features/kurse/service';
import { kursCreateSchema } from '../features/kurse/schemas';
import { FinanzenService } from '../features/finanzen/service';
import { KalenderService } from '../features/kalender/service';
import { KommunikationService } from '../features/kommunikation/service';

const kundenService = new KundenService();
const hundeService = new HundeService();
const kurseService = new KurseService();
const finanzenService = new FinanzenService();
const kalenderService = new KalenderService();
const kommunikationService = new KommunikationService();

export const typeDefs = gql`
  type Kunde {
    id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    createdAt: String!
    updatedAt: String!
  }

  input KundeInput {
    firstName: String!
    lastName: String!
    email: String!
    phone: String
  }

  type Hund {
    id: ID!
    kundeId: ID!
    name: String!
    geburtsdatum: String
    rasse: String
    notizen: String
    createdAt: String!
    updatedAt: String!
  }

  input HundInput {
    kundeId: ID!
    name: String!
    geburtsdatum: String
    rasse: String
    notizen: String
  }

  type Kurs {
    id: ID!
    titel: String!
    beschreibung: String
    start_datum: String!
    end_datum: String
    ort: String
    preis_cents: Int!
    max_teilnehmer: Int!
    status: String!
    created_at: String!
    updated_at: String!
  }

  input KursInput {
    titel: String!
    beschreibung: String
    start_datum: String!
    end_datum: String
    ort: String
    preis_cents: Int
    max_teilnehmer: Int
    status: String
  }

  type FinanzEintrag {
    id: ID!
    customerId: String!
    amount: Float!
    currency: String!
    type: String!
    issuedAt: String!
    dueAt: String
    settledAt: String
  }

  input FinanzEintragInput {
    customerId: String!
    amount: Float!
    currency: String!
    type: String!
    issuedAt: String!
    dueAt: String
  }

  type KalenderEvent {
    id: ID!
    title: String!
    description: String
    start: String!
    end: String!
    relatedCourseId: String
    relatedDogId: String
  }

  input KalenderEventInput {
    title: String!
    description: String
    start: String!
    end: String!
    relatedCourseId: String
    relatedDogId: String
  }

  type Nachricht {
    id: ID!
    senderId: String!
    recipientId: String!
    subject: String!
    body: String!
    sentAt: String!
    readAt: String
  }

  input NachrichtInput {
    senderId: String!
    recipientId: String!
    subject: String!
    body: String!
  }

  type Query {
    kunden: [Kunde!]!
    hunde: [Hund!]!
    kurse: [Kurs!]!
    finanzen: [FinanzEintrag!]!
    kalender: [KalenderEvent!]!
    nachrichten: [Nachricht!]!
  }

  type Mutation {
    createKunde(input: KundeInput!): Kunde!
    createHund(input: HundInput!): Hund!
    createKurs(input: KursInput!): Kurs!
    createFinanzEintrag(input: FinanzEintragInput!): FinanzEintrag!
    createKalenderEvent(input: KalenderEventInput!): KalenderEvent!
    createNachricht(input: NachrichtInput!): Nachricht!
  }
`;

export const resolvers = {
  Query: {
    kunden: () => kundenService.list().then((result) => result.data),
    hunde: () => hundeService.list().then((result) => result.data),
    kurse: () => kurseService.list({ limit: 50, offset: 0 }).then((result) => result.data),
    finanzen: () => finanzenService.list().then((result) => result.data),
    kalender: () => kalenderService.list().then((result) => result.data),
    nachrichten: () => kommunikationService.list().then((result) => result.data),
  },
  Mutation: {
    createKunde: (_: unknown, { input }: { input: CustomerCreateInput }) => kundenService.create(input),
    createHund: (_: unknown, { input }: { input: DogCreateInput }) => hundeService.create(input),
    createKurs: (_: unknown, { input }: { input: unknown }) =>
      kurseService.create(kursCreateSchema.parse(input)),
    createFinanzEintrag: (_: unknown, { input }: { input: FinancialRecordCreateInput }) =>
      finanzenService.create(input),
    createKalenderEvent: (_: unknown, { input }: { input: CalendarEventCreateInput }) =>
      kalenderService.create(input),
    createNachricht: (_: unknown, { input }: { input: MessageCreateInput }) =>
      kommunikationService.create(input),
  },
};
