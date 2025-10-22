import { gql } from 'apollo-server-express';
import {
  CustomerCreateInput,
  DogCreateInput,
  CourseCreateInput,
  FinanzCreateInput,
  CalendarEventCreateInput,
  MessageCreateInput,
} from '@dogule/domain';
import { KundenService } from '../features/kunden/service';
import { HundeService } from '../features/hunde/service';
import { KurseService } from '../features/kurse/service';
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
    title: String!
    description: String
    scheduleId: String
    createdAt: String!
    updatedAt: String!
  }

  input KursInput {
    title: String!
    description: String
    scheduleId: String
  }

  type Finanz {
    id: ID!
    createdAt: String!
    updatedAt: String!
    datum: String!
    typ: String!
    betragCents: Int!
    kategorie: String
    beschreibung: String
    referenz: String
  }

  input FinanzInput {
    datum: String!
    typ: String!
    betragCents: Int!
    kategorie: String
    beschreibung: String
    referenz: String
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
    finanzen(from: String, to: String, typ: String): [Finanz!]!
    kalender: [KalenderEvent!]!
    nachrichten: [Nachricht!]!
  }

  type Mutation {
    createKunde(input: KundeInput!): Kunde!
    createHund(input: HundInput!): Hund!
    createKurs(input: KursInput!): Kurs!
    createFinanz(input: FinanzInput!): Finanz!
    createKalenderEvent(input: KalenderEventInput!): KalenderEvent!
    createNachricht(input: NachrichtInput!): Nachricht!
  }
`;

export const resolvers = {
  Query: {
    kunden: () => kundenService.list().then((result) => result.data),
    hunde: () => hundeService.list().then((result) => result.data),
    kurse: () => kurseService.list().then((result) => result.data),
    finanzen: (
      _: unknown,
      args: { from?: string; to?: string; typ?: string },
    ) => {
      const filters: { from?: string; to?: string; typ?: 'einnahme' | 'ausgabe' } = {};

      if (args.from) {
        filters.from = args.from;
      }

      if (args.to) {
        filters.to = args.to;
      }

      if (args.typ) {
        if (args.typ !== 'einnahme' && args.typ !== 'ausgabe') {
          throw new Error('Invalid typ parameter');
        }

        filters.typ = args.typ;
      }

      return finanzenService.list(filters).then((result) => result.data);
    },
    kalender: () => kalenderService.list().then((result) => result.data),
    nachrichten: () => kommunikationService.list().then((result) => result.data),
  },
  Mutation: {
    createKunde: (_: unknown, { input }: { input: CustomerCreateInput }) => kundenService.create(input),
    createHund: (_: unknown, { input }: { input: DogCreateInput }) => hundeService.create(input),
    createKurs: (_: unknown, { input }: { input: CourseCreateInput }) => kurseService.create(input),
    createFinanz: (_: unknown, { input }: { input: FinanzCreateInput }) =>
      finanzenService.create(input),
    createKalenderEvent: (_: unknown, { input }: { input: CalendarEventCreateInput }) =>
      kalenderService.create(input),
    createNachricht: (_: unknown, { input }: { input: MessageCreateInput }) =>
      kommunikationService.create(input),
  },
};
