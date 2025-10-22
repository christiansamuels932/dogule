import { z } from 'zod';

import type {
  FinanzCreateInput,
  FinanzListFilters,
  FinanzUpdateInput,
} from '../../../../../packages/domain';

const finanzTypSchema = z.enum(['einnahme', 'ausgabe']);

const optionalText = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.trim())
  .optional();

const coerceQueryValue = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value[0];
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }

    return value;
  }, schema.optional());

const createSchema = z.object({
  datum: z.coerce.date(),
  typ: finanzTypSchema,
  betrag_cents: z.number().int().min(0),
  kategorie: optionalText,
  beschreibung: optionalText,
  referenz: optionalText,
});

const updateSchema = createSchema.partial();

const listFiltersSchema = z
  .object({
    from: coerceQueryValue(
      z
        .string()
        .trim()
        .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
    ),
    to: coerceQueryValue(
      z
        .string()
        .trim()
        .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
    ),
    typ: coerceQueryValue(finanzTypSchema),
    limit: coerceQueryValue(z.coerce.number().int().min(1)),
    offset: coerceQueryValue(z.coerce.number().int().min(0)),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to) {
      const from = Date.parse(data.from);
      const to = Date.parse(data.to);

      if (!Number.isNaN(from) && !Number.isNaN(to) && to < from) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['to'],
          message: 'to must be on or after from',
        });
      }
    }
  });

const toDateString = (value: Date): string => value.toISOString().slice(0, 10);

const mapSchemaToCreateInput = (data: z.infer<typeof createSchema>): FinanzCreateInput => {
  const result: FinanzCreateInput = {
    datum: toDateString(data.datum),
    typ: data.typ,
    betragCents: data.betrag_cents,
  };

  if (data.kategorie !== undefined) {
    result.kategorie = data.kategorie;
  }

  if (data.beschreibung !== undefined) {
    result.beschreibung = data.beschreibung;
  }

  if (data.referenz !== undefined) {
    result.referenz = data.referenz;
  }

  return result;
};

export const parseFinanzCreateInput = (payload: unknown): FinanzCreateInput => {
  const parsed = createSchema.parse(payload);
  return mapSchemaToCreateInput(parsed);
};

export const parseFinanzUpdateInput = (payload: unknown): FinanzUpdateInput => {
  const parsed = updateSchema.parse(payload);
  const result: FinanzUpdateInput = {};

  if (parsed.datum !== undefined) {
    result.datum = toDateString(parsed.datum);
  }

  if (parsed.typ !== undefined) {
    result.typ = parsed.typ;
  }

  if (parsed.betrag_cents !== undefined) {
    result.betragCents = parsed.betrag_cents;
  }

  if (parsed.kategorie !== undefined) {
    result.kategorie = parsed.kategorie;
  }

  if (parsed.beschreibung !== undefined) {
    result.beschreibung = parsed.beschreibung;
  }

  if (parsed.referenz !== undefined) {
    result.referenz = parsed.referenz;
  }

  return result;
};

export const parseFinanzListFilters = (payload: unknown): FinanzListFilters => {
  const parsed = listFiltersSchema.parse(payload);
  const result: FinanzListFilters = {};

  if (parsed.from) {
    result.from = parsed.from;
  }

  if (parsed.to) {
    result.to = parsed.to;
  }

  if (parsed.typ) {
    result.typ = parsed.typ;
  }

  if (parsed.limit !== undefined) {
    result.limit = parsed.limit;
  }

  if (parsed.offset !== undefined) {
    result.offset = parsed.offset;
  }

  return result;
};
