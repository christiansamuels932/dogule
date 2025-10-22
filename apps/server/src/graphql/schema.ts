import { gql } from 'apollo-server-express';
import {
  CustomerCreateInput,
  DogCreateInput,
  CourseCreateInput,
  FinanzCreateInput,
  CalendarEventCreateInput,
  KommunikationCreateInput,
  KommunikationUpdateInput,
  KommunikationListFilters,
} from '@dogule/domain';
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
    kanal: String!
    richtung: String!
    betreff: String!
    inhalt: String!
    kundeId: String
    hundId: String
    createdAt: String!
    updatedAt: String!
  }

  input NachrichtInput {
    kanal: String!
    richtung: String!
    betreff: String!
    inhalt: String!
    kundeId: String
    hundId: String
  }

  input NachrichtUpdateInput {
    kanal: String
    richtung: String
    betreff: String
    inhalt: String
    kundeId: String
    hundId: String
  }

  input NachrichtFilterInput {
    kundeId: String
    hundId: String
    kanal: String
    from: String
    to: String
    limit: Int
    offset: Int
  }

  type NachrichtList {
    data: [Nachricht!]!
    total: Int!
    limit: Int!
    offset: Int!
  }

  type Query {
    kunden: [Kunde!]!
    hunde: [Hund!]!
    kurse: [Kurs!]!
    finanzen(from: String, to: String, typ: String): [Finanz!]!
    kalender: [KalenderEvent!]!
    nachrichten(filters: NachrichtFilterInput): NachrichtList!
  }

  type Mutation {
    createKunde(input: KundeInput!): Kunde!
    createHund(input: HundInput!): Hund!
    createKurs(input: KursInput!): Kurs!
    createFinanz(input: FinanzInput!): Finanz!
    createKalenderEvent(input: KalenderEventInput!): KalenderEvent!
    createNachricht(input: NachrichtInput!): Nachricht!
    updateNachricht(id: ID!, input: NachrichtUpdateInput!): Nachricht!
    deleteNachricht(id: ID!): Boolean!
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
    nachrichten: (
      _: unknown,
      args: {
        filters?: {
          kundeId?: string;
          hundId?: string;
          kanal?: string;
          from?: string;
          to?: string;
          limit?: number;
          offset?: number;
        };
      },
    ) => {
      const filters: KommunikationListFilters = {};

      if (args.filters) {
        if (args.filters.kundeId) {
          filters.kundeId = args.filters.kundeId;
        }

        if (args.filters.hundId) {
          filters.hundId = args.filters.hundId;
        }

        if (args.filters.kanal) {
          filters.kanal = args.filters.kanal;
        }

        if (args.filters.from) {
          filters.from = args.filters.from;
        }

        if (args.filters.to) {
          filters.to = args.filters.to;
        }

        if (typeof args.filters.limit === 'number') {
          filters.limit = args.filters.limit;
        }

        if (typeof args.filters.offset === 'number') {
          filters.offset = args.filters.offset;
        }
      }

      return kommunikationService.list(filters);
    },
  },
  Mutation: {
    createKunde: (_: unknown, { input }: { input: CustomerCreateInput }) => kundenService.create(input),
    createHund: (_: unknown, { input }: { input: DogCreateInput }) => hundeService.create(input),
    createKurs: (_: unknown, { input }: { input: CourseCreateInput }) => kurseService.create(input),
    createFinanz: (_: unknown, { input }: { input: FinanzCreateInput }) =>
      finanzenService.create(input),
    createKalenderEvent: (_: unknown, { input }: { input: CalendarEventCreateInput }) =>
      kalenderService.create(input),
    createNachricht: (_: unknown, { input }: { input: KommunikationCreateInput }) =>
      kommunikationService.create(input),
    updateNachricht: (
      _: unknown,
      { id, input }: { id: string; input: KommunikationUpdateInput },
    ) =>
      kommunikationService.update(id, input).then((result) => {
        if (!result) {
          throw new Error('Kommunikationseintrag nicht gefunden');
        }

        return result;
      }),
    deleteNachricht: (_: unknown, { id }: { id: string }) => kommunikationService.remove(id),
  },
};
