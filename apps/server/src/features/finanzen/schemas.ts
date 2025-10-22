import { z } from 'zod';

import type { FinanzCreateInput, FinanzUpdateInput } from '../../../../../packages/domain';

const finanzTypSchema = z.enum(['einnahme', 'ausgabe']);

const optionalText = z
  .string()
  .trim()
  .min(1)
  .transform((value) => value.trim())
  .optional();

const createSchema = z.object({
  datum: z.coerce.date(),
  typ: finanzTypSchema,
  betrag_cents: z.number().int().min(0),
  kategorie: optionalText,
  beschreibung: optionalText,
  referenz: optionalText,
});

const updateSchema = createSchema.partial();

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
