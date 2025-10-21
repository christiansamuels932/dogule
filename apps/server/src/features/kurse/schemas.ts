import { z } from 'zod';

export const kursStatusEnum = z.enum(['geplant', 'laufend', 'abgeschlossen', 'abgesagt']);

const dateString = z.string().date();

const ensureEndAfterStart = <T extends { start_datum?: string; end_datum?: string }>(
  data: T,
  ctx: z.RefinementCtx,
) => {
  if (data.start_datum && data.end_datum) {
    const start = new Date(data.start_datum);
    const end = new Date(data.end_datum);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return;
    }

    if (end < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_datum'],
        message: 'end_datum must be on or after start_datum',
      });
    }
  }
};

export const kursCreateSchema = z
  .object({
    titel: z.string().min(1, 'titel is required'),
    beschreibung: z.string().optional(),
    start_datum: dateString,
    end_datum: dateString.optional(),
    ort: z.string().optional(),
    preis_cents: z.number().int().min(0).default(0),
    max_teilnehmer: z.number().int().min(0).default(0),
    status: kursStatusEnum.default('geplant'),
  })
  .superRefine(ensureEndAfterStart);

export const kursUpdateSchema = z
  .object({
    titel: z.string().min(1).optional(),
    beschreibung: z.string().optional(),
    start_datum: dateString.optional(),
    end_datum: dateString.optional(),
    ort: z.string().optional(),
    preis_cents: z.number().int().min(0).optional(),
    max_teilnehmer: z.number().int().min(0).optional(),
    status: kursStatusEnum.optional(),
  })
  .superRefine(ensureEndAfterStart);

export const kursListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
    status: kursStatusEnum.optional(),
    from: dateString.optional(),
    to: dateString.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.from && data.to) {
      const from = new Date(data.from);
      const to = new Date(data.to);

      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to < from) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['to'],
          message: 'to must be on or after from',
        });
      }
    }
  });

export type KursStatus = z.infer<typeof kursStatusEnum>;
export type KursCreateInput = z.infer<typeof kursCreateSchema>;
export type KursUpdateInput = z.infer<typeof kursUpdateSchema>;
export type KursListQuery = z.infer<typeof kursListQuerySchema>;

export interface Kurs {
  id: string;
  created_at: string;
  updated_at: string;
  titel: string;
  beschreibung?: string;
  start_datum: string;
  end_datum?: string;
  ort?: string;
  preis_cents: number;
  max_teilnehmer: number;
  status: KursStatus;
}

export interface KursListResult {
  data: Kurs[];
  total: number;
  limit: number;
  offset: number;
}
