import { z } from 'zod';

import {
  ErrorCode,
  KalenderEventCreateInput,
  KalenderEventUpdateInput,
  KalenderListFilters,
} from '@dogule/domain';

const statusEnum = z.enum(['geplant', 'bestaetigt', 'abgesagt']);

const datetimeString = z
  .string()
  .datetime({ message: ErrorCode.ERR_KALENDER_INVALID_PAYLOAD })
  .transform((value) => new Date(value).toISOString());

const kalenderBaseSchema = z.object({
  titel: z.string().min(1),
  start_at: datetimeString,
  end_at: datetimeString,
  ort: z.string().min(1).optional(),
  beschreibung: z.string().optional(),
  kunde_id: z.string().uuid().optional(),
  hund_id: z.string().uuid().optional(),
  status: statusEnum.optional(),
});

const kalenderCreateSchema = kalenderBaseSchema.superRefine((data, ctx) => {
  if (new Date(data.end_at).getTime() < new Date(data.start_at).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: ErrorCode.ERR_KALENDER_INVALID_PAYLOAD,
      path: ['end_at'],
    });
  }
});

const kalenderUpdateSchema = kalenderBaseSchema.partial().superRefine((data, ctx) => {
  if (data.start_at && data.end_at) {
    if (new Date(data.end_at).getTime() < new Date(data.start_at).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: ErrorCode.ERR_KALENDER_INVALID_PAYLOAD,
        path: ['end_at'],
      });
    }
  }
});

const kalenderListQuerySchema = z
  .object({
    from: datetimeString.optional(),
    to: datetimeString.optional(),
    kunde_id: z.string().uuid().optional(),
    hund_id: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to) {
      if (new Date(data.to).getTime() < new Date(data.from).getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: ErrorCode.ERR_KALENDER_INVALID_PAYLOAD,
          path: ['to'],
        });
      }
    }
  });

export const parseKalenderCreateInput = (payload: unknown): KalenderEventCreateInput => {
  const data = kalenderCreateSchema.parse(payload);
  const result: KalenderEventCreateInput = {
    titel: data.titel,
    startAt: data.start_at,
    endAt: data.end_at,
  };

  if (data.ort !== undefined) {
    result.ort = data.ort;
  }

  if (data.beschreibung !== undefined) {
    result.beschreibung = data.beschreibung;
  }

  if (data.kunde_id !== undefined) {
    result.kundeId = data.kunde_id;
  }

  if (data.hund_id !== undefined) {
    result.hundId = data.hund_id;
  }

  if (data.status !== undefined) {
    result.status = data.status;
  }

  return result;
};

export const parseKalenderUpdateInput = (payload: unknown): KalenderEventUpdateInput => {
  const data = kalenderUpdateSchema.parse(payload);
  const result: KalenderEventUpdateInput = {};

  if (data.titel !== undefined) {
    result.titel = data.titel;
  }

  if (data.start_at !== undefined) {
    result.startAt = data.start_at;
  }

  if (data.end_at !== undefined) {
    result.endAt = data.end_at;
  }

  if (data.ort !== undefined) {
    result.ort = data.ort;
  }

  if (data.beschreibung !== undefined) {
    result.beschreibung = data.beschreibung;
  }

  if (data.kunde_id !== undefined) {
    result.kundeId = data.kunde_id;
  }

  if (data.hund_id !== undefined) {
    result.hundId = data.hund_id;
  }

  if (data.status !== undefined) {
    result.status = data.status;
  }

  return result;
};

export const parseKalenderListFilters = (query: unknown): KalenderListFilters => {
  const data = kalenderListQuerySchema.parse(query);
  const filters: KalenderListFilters = {};

  if (data.from) {
    filters.from = data.from;
  }

  if (data.to) {
    filters.to = data.to;
  }

  if (data.kunde_id) {
    filters.kundeId = data.kunde_id;
  }

  if (data.hund_id) {
    filters.hundId = data.hund_id;
  }

  if (data.limit !== undefined) {
    filters.limit = data.limit;
  }

  if (data.offset !== undefined) {
    filters.offset = data.offset;
  }

  return filters;
};
