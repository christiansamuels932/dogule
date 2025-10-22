import { z } from 'zod';

import {
  ErrorCode,
  type KommunikationCreateInput,
  type KommunikationListFilters,
  type KommunikationUpdateInput,
} from '@dogule/domain';

const richtungSchema = z.enum(['eingehend', 'ausgehend']);

const basePayloadSchema = {
  kanal: z.string().trim().min(1, ErrorCode.ERR_KOMM_INVALID_PAYLOAD),
  richtung: richtungSchema,
  betreff: z.string().trim().min(1, ErrorCode.ERR_KOMM_INVALID_PAYLOAD),
  inhalt: z.string().trim().min(1, ErrorCode.ERR_KOMM_INVALID_PAYLOAD),
  kunde_id: z.string().uuid().optional(),
  hund_id: z.string().uuid().optional(),
};

const kommunikationCreateSchema = z.object(basePayloadSchema);

const kommunikationUpdateSchema = z
  .object({
    ...basePayloadSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: ErrorCode.ERR_KOMM_INVALID_PAYLOAD,
  });

const coerceQueryString = <T extends z.ZodTypeAny>(schema: T) =>
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

const isoDateSchema = coerceQueryString(
  z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: ErrorCode.ERR_KOMM_INVALID_PAYLOAD,
    })
);

const kommunikationListQuerySchema = z.object({
  limit: coerceQueryString(z.coerce.number().int().positive()),
  offset: coerceQueryString(z.coerce.number().int().nonnegative()),
  kunde_id: coerceQueryString(z.string().uuid()),
  hund_id: coerceQueryString(z.string().uuid()),
  kanal: coerceQueryString(z.string().trim().min(1)),
  from: isoDateSchema,
  to: isoDateSchema,
});

export const parseKommunikationCreateInput = (payload: unknown): KommunikationCreateInput => {
  const parsed = kommunikationCreateSchema.parse(payload);

  return {
    kanal: parsed.kanal,
    richtung: parsed.richtung,
    betreff: parsed.betreff,
    inhalt: parsed.inhalt,
    kundeId: parsed.kunde_id,
    hundId: parsed.hund_id,
  };
};

export const parseKommunikationUpdateInput = (payload: unknown): KommunikationUpdateInput => {
  const parsed = kommunikationUpdateSchema.parse(payload);
  const result: KommunikationUpdateInput = {};

  if (parsed.kanal !== undefined) {
    result.kanal = parsed.kanal;
  }

  if (parsed.richtung !== undefined) {
    result.richtung = parsed.richtung;
  }

  if (parsed.betreff !== undefined) {
    result.betreff = parsed.betreff;
  }

  if (parsed.inhalt !== undefined) {
    result.inhalt = parsed.inhalt;
  }

  if (parsed.kunde_id !== undefined) {
    result.kundeId = parsed.kunde_id;
  }

  if (parsed.hund_id !== undefined) {
    result.hundId = parsed.hund_id;
  }

  return result;
};

export const parseKommunikationListQuery = (
  query: Record<string, unknown>
): KommunikationListFilters => {
  const parsed = kommunikationListQuerySchema.parse(query);

  return {
    limit: parsed.limit,
    offset: parsed.offset,
    kundeId: parsed.kunde_id,
    hundId: parsed.hund_id,
    kanal: parsed.kanal,
    from: parsed.from,
    to: parsed.to,
  };
};
