import { gql } from 'apollo-server-express';
import { ZodError } from 'zod';

import {
  CustomerCreateInput,
  DogCreateInput,
  ErrorCode,
  FinanzCreateInput,
  FinanzListFilters,
  KalenderEventCreateInput,
  KalenderEventUpdateInput,
  KommunikationCreateInput,
  KommunikationListFilters,
  KommunikationUpdateInput,
} from '@dogule/domain';
import { logError } from '@dogule/utils';

import { KundenService } from '../features/kunden/service';
import { parseCustomerCreateInput } from '../features/kunden/schemas';
import { HundeService } from '../features/hunde/service';
import { parseHundeCreateInput } from '../features/hunde/schemas';
import { KurseService } from '../features/kurse/service';
import { kursCreateSchema, type KursCreateInput } from '../features/kurse/schemas';
import { FinanzenService } from '../features/finanzen/service';
import {
  parseFinanzCreateInput,
  parseFinanzListFilters,
} from '../features/finanzen/schemas';
import { KalenderService } from '../features/kalender/service';
import {
  parseKalenderCreateInput,
  parseKalenderListFilters,
  parseKalenderUpdateInput,
} from '../features/kalender/schemas';
import { KommunikationService } from '../features/kommunikation/service';
import {
  parseKommunikationCreateInput,
  parseKommunikationListQuery,
  parseKommunikationUpdateInput,
} from '../features/kommunikation/schemas';

const kundenService = new KundenService();
const hundeService = new HundeService();
const kurseService = new KurseService();
const finanzenService = new FinanzenService();
const kalenderService = new KalenderService();
const kommunikationService = new KommunikationService();

const normalizeOptional = <T>(value: T | null | undefined): T | undefined =>
  value === null || value === undefined ? undefined : value;

const withGraphqlValidation = <T>(callback: () => T): T => {
  try {
    return callback();
  } catch (error) {
    if (error instanceof ZodError) {
      logError(ErrorCode.ERR_GQL_VALIDATION_001, error);
      throw new Error(ErrorCode.ERR_GQL_VALIDATION_001);
    }

    throw error;
  }
};

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
    nachrichten(filters: NachrichtFilterInput): NachrichtList!
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
      args: { from?: string | null; to?: string | null; typ?: string | null },
    ) => {
      const filters: FinanzListFilters = withGraphqlValidation(() =>
        parseFinanzListFilters({
          from: normalizeOptional(args.from),
          to: normalizeOptional(args.to),
          typ: normalizeOptional(args.typ),
        }),
      );

      return finanzenService.list(filters).then((result) => result.data);
    },
    events: (
      _: unknown,
      args: {
        from?: string | null;
        to?: string | null;
        kunde_id?: string | null;
        hund_id?: string | null;
      },
    ) => {
      const filters = withGraphqlValidation(() =>
        parseKalenderListFilters({
          from: normalizeOptional(args.from),
          to: normalizeOptional(args.to),
          kunde_id: normalizeOptional(args.kunde_id),
          hund_id: normalizeOptional(args.hund_id),
        }),
      );

      return kalenderService.list(filters).then((result) => result.data);
    },
    nachrichten: (
      _: unknown,
      args: {
        filters?: {
          kundeId?: string | null;
          hundId?: string | null;
          kanal?: string | null;
          from?: string | null;
          to?: string | null;
          limit?: number | null;
          offset?: number | null;
        };
      },
    ) => {
      const parsedFilters: KommunikationListFilters | undefined = args.filters
        ? withGraphqlValidation(() =>
            parseKommunikationListQuery({
              kunde_id: normalizeOptional(args.filters?.kundeId),
              hund_id: normalizeOptional(args.filters?.hundId),
              kanal: normalizeOptional(args.filters?.kanal),
              from: normalizeOptional(args.filters?.from),
              to: normalizeOptional(args.filters?.to),
              limit: normalizeOptional(args.filters?.limit),
              offset: normalizeOptional(args.filters?.offset),
            }),
          )
        : undefined;

      return kommunikationService.list(parsedFilters ?? {});
    },
  },
  Mutation: {
    createKunde: (
      _: unknown,
      { input }: { input: CustomerCreateInput & { phone?: string | null } },
    ) =>
      kundenService.create(
        withGraphqlValidation(() =>
          parseCustomerCreateInput({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: normalizeOptional(input.phone),
          }),
        ),
      ),
    createHund: (
      _: unknown,
      {
        input,
      }: {
        input: DogCreateInput & {
          geburtsdatum?: string | null;
          rasse?: string | null;
          notizen?: string | null;
        };
      },
    ) =>
      hundeService.create(
        withGraphqlValidation(() =>
          parseHundeCreateInput({
            kunde_id: input.kundeId,
            name: input.name,
            geburtsdatum: normalizeOptional(input.geburtsdatum),
            rasse: normalizeOptional(input.rasse),
            notizen: normalizeOptional(input.notizen),
          }),
        ),
      ),
    createKurs: (
      _: unknown,
      {
        input,
      }: {
        input: KursCreateInput & {
          beschreibung?: string | null;
          end_datum?: string | null;
          ort?: string | null;
          preis_cents?: number | null;
          max_teilnehmer?: number | null;
          status?: string | null;
        };
      },
    ) => {
      const payload: KursCreateInput = withGraphqlValidation(() =>
        kursCreateSchema.parse({
          titel: input.titel,
          beschreibung: normalizeOptional(input.beschreibung),
          start_datum: input.start_datum,
          end_datum: normalizeOptional(input.end_datum),
          ort: normalizeOptional(input.ort),
          preis_cents: normalizeOptional(input.preis_cents),
          max_teilnehmer: normalizeOptional(input.max_teilnehmer),
          status: normalizeOptional(input.status),
        }),
      );

      return kurseService.create(payload);
    },
    createFinanz: (
      _: unknown,
      {
        input,
      }: {
        input: FinanzCreateInput & {
          kategorie?: string | null;
          beschreibung?: string | null;
          referenz?: string | null;
        };
      },
    ) =>
      finanzenService.create(
        withGraphqlValidation(() =>
          parseFinanzCreateInput({
            datum: input.datum,
            typ: input.typ,
            betrag_cents: input.betragCents,
            kategorie: normalizeOptional(input.kategorie),
            beschreibung: normalizeOptional(input.beschreibung),
            referenz: normalizeOptional(input.referenz),
          }),
        ),
      ),
    createEvent: (
      _: unknown,
      {
        input,
      }: {
        input: KalenderEventCreateInput & {
          beschreibung?: string | null;
          ort?: string | null;
          kundeId?: string | null;
          hundId?: string | null;
          status?: string | null;
        };
      },
    ) =>
      kalenderService.create(
        withGraphqlValidation(() =>
          parseKalenderCreateInput({
            titel: input.titel,
            start_at: input.startAt,
            end_at: input.endAt,
            ort: normalizeOptional(input.ort),
            beschreibung: normalizeOptional(input.beschreibung),
            kunde_id: normalizeOptional(input.kundeId),
            hund_id: normalizeOptional(input.hundId),
            status: normalizeOptional(input.status),
          }),
        ),
      ),
    updateEvent: async (
      _: unknown,
      { id, input }: { id: string; input: KalenderEventUpdateInput },
    ) => {
      const payload = withGraphqlValidation(() =>
        parseKalenderUpdateInput({
          titel: input.titel,
          start_at: normalizeOptional(input.startAt),
          end_at: normalizeOptional(input.endAt),
          ort: normalizeOptional(input.ort),
          beschreibung: normalizeOptional(input.beschreibung),
          kunde_id: normalizeOptional(input.kundeId),
          hund_id: normalizeOptional(input.hundId),
          status: normalizeOptional(input.status),
        }),
      );

      const event = await kalenderService.update(id, payload);

      if (!event) {
        throw new Error(ErrorCode.ERR_KALENDER_READ_001);
      }

      return event;
    },
    deleteEvent: (_: unknown, { id }: { id: string }) => kalenderService.delete(id),
    createNachricht: (
      _: unknown,
      {
        input,
      }: {
        input: KommunikationCreateInput & {
          kundeId?: string | null;
          hundId?: string | null;
        };
      },
    ) =>
      kommunikationService.create(
        withGraphqlValidation(() =>
          parseKommunikationCreateInput({
            kanal: input.kanal,
            richtung: input.richtung,
            betreff: input.betreff,
            inhalt: input.inhalt,
            kunde_id: normalizeOptional(input.kundeId),
            hund_id: normalizeOptional(input.hundId),
          }),
        ),
      ),
    updateNachricht: (
      _: unknown,
      { id, input }: { id: string; input: KommunikationUpdateInput },
    ) =>
      kommunikationService
        .update(
          id,
          withGraphqlValidation(() =>
            parseKommunikationUpdateInput({
              kanal: normalizeOptional(input.kanal),
              richtung: normalizeOptional(input.richtung),
              betreff: normalizeOptional(input.betreff),
              inhalt: normalizeOptional(input.inhalt),
              kunde_id: normalizeOptional(input.kundeId),
              hund_id: normalizeOptional(input.hundId),
            }),
          ),
        )
        .then((result) => {
          if (!result) {
            throw new Error('Kommunikationseintrag nicht gefunden');
          }

          return result;
        }),
    deleteNachricht: (_: unknown, { id }: { id: string }) => kommunikationService.remove(id),
  },
};
