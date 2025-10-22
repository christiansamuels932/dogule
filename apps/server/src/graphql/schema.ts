import { gql } from 'apollo-server-express';
import {
  CustomerCreateInput,
  DogCreateInput,
  CourseCreateInput,
  ErrorCode,
  FinanzCreateInput,
  KalenderEventCreateInput,
  KalenderEventUpdateInput,
  MessageCreateInput,
} from '@dogule/domain';
import { KundenService } from '../features/kunden/service';
import { HundeService } from '../features/hunde/service';
import { KurseService } from '../features/kurse/service';
import { kursCreateSchema } from '../features/kurse/schemas';
import { FinanzenService } from '../features/finanzen/service';
import { KalenderService } from '../features/kalender/service';
import {
  parseKalenderCreateInput,
  parseKalenderListFilters,
  parseKalenderUpdateInput,
} from '../features/kalender/schemas';
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
    createdAt: String!
    updatedAt: String!
    titel: String!
    beschreibung: String
    startAt: String!
    endAt: String!
    ort: String
    kundeId: String
    hundId: String
    status: String!
  }

  input KalenderEventCreateInput {
    titel: String!
    beschreibung: String
    startAt: String!
    endAt: String!
    ort: String
    kundeId: String
    hundId: String
    status: String
  }

  input KalenderEventUpdateInput {
    titel: String
    beschreibung: String
    startAt: String
    endAt: String
    ort: String
    kundeId: String
    hundId: String
    status: String
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
    events(from: String, to: String, kunde_id: String, hund_id: String): [KalenderEvent!]!
    nachrichten: [Nachricht!]!
  }

  type Mutation {
    createKunde(input: KundeInput!): Kunde!
    createHund(input: HundInput!): Hund!
    createKurs(input: KursInput!): Kurs!
    createFinanz(input: FinanzInput!): Finanz!
    createEvent(input: KalenderEventCreateInput!): KalenderEvent!
    updateEvent(id: ID!, input: KalenderEventUpdateInput!): KalenderEvent!
    deleteEvent(id: ID!): Boolean!
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
    events: (
      _: unknown,
      args: { from?: string; to?: string; kunde_id?: string; hund_id?: string },
    ) => {
      const filters = parseKalenderListFilters({
        from: args.from,
        to: args.to,
        kunde_id: args.kunde_id,
        hund_id: args.hund_id,
      });

      return kalenderService.list(filters).then((result) => result.data);
    },
    nachrichten: () => kommunikationService.list().then((result) => result.data),
  },
  Mutation: {
    createKunde: (_: unknown, { input }: { input: CustomerCreateInput }) => kundenService.create(input),
    createHund: (_: unknown, { input }: { input: DogCreateInput }) => hundeService.create(input),
    createKurs: (_: unknown, { input }: { input: CourseCreateInput }) => kurseService.create(input),
    createFinanz: (_: unknown, { input }: { input: FinanzCreateInput }) =>
      finanzenService.create(input),
    createEvent: (_: unknown, { input }: { input: KalenderEventCreateInput }) =>
      kalenderService.create(
        parseKalenderCreateInput({
          titel: input.titel,
          start_at: input.startAt,
          end_at: input.endAt,
          ort: input.ort,
          beschreibung: input.beschreibung,
          kunde_id: input.kundeId,
          hund_id: input.hundId,
          status: input.status,
        }),
      ),
    updateEvent: async (
      _: unknown,
      { id, input }: { id: string; input: KalenderEventUpdateInput },
    ) => {
      const event = await kalenderService.update(
        id,
        parseKalenderUpdateInput({
          titel: input.titel,
          start_at: input.startAt,
          end_at: input.endAt,
          ort: input.ort,
          beschreibung: input.beschreibung,
          kunde_id: input.kundeId,
          hund_id: input.hundId,
          status: input.status,
        }),
      );

      if (!event) {
        throw new Error(ErrorCode.ERR_KALENDER_READ_001);
      }

      return event;
    },
    deleteEvent: (_: unknown, { id }: { id: string }) => kalenderService.delete(id),
    createNachricht: (_: unknown, { input }: { input: MessageCreateInput }) =>
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
