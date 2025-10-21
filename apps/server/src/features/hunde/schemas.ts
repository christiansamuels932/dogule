import { z } from 'zod';
import { DogCreateInput } from '../../../../../packages/domain';

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD');

const hundeCreateSchema = z.object({
  kunde_id: z.string().uuid(),
  name: z.string().trim().min(1, 'Name is required'),
  geburtsdatum: isoDateSchema.optional(),
  rasse: z.union([z.string().trim().min(1), z.null()]).optional(),
  notizen: z.union([z.string(), z.null()]).optional(),
});

const hundeUpdateSchema = z
  .object({
    kunde_id: z.string().uuid().optional(),
    name: z.string().trim().min(1).optional(),
    geburtsdatum: z.union([isoDateSchema, z.null()]).optional(),
    rasse: z.union([z.string().trim().min(1), z.null()]).optional(),
    notizen: z.union([z.string(), z.null()]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const parseHundeCreateInput = (payload: unknown): DogCreateInput => {
  const parsed = hundeCreateSchema.parse(payload);

  return {
    kundeId: parsed.kunde_id,
    name: parsed.name,
    geburtsdatum: parsed.geburtsdatum,
    rasse: parsed.rasse ?? undefined,
    notizen: parsed.notizen ?? undefined,
  };
};

export const parseHundeUpdateInput = (payload: unknown): Partial<DogCreateInput> => {
  const parsed = hundeUpdateSchema.parse(payload);
  const result: Partial<DogCreateInput> = {};

  if (parsed.kunde_id !== undefined) {
    result.kundeId = parsed.kunde_id;
  }

  if (parsed.name !== undefined) {
    result.name = parsed.name;
  }

  if (parsed.geburtsdatum !== undefined) {
    result.geburtsdatum = parsed.geburtsdatum ?? undefined;
  }

  if (parsed.rasse !== undefined) {
    result.rasse = parsed.rasse ?? undefined;
  }

  if (parsed.notizen !== undefined) {
    result.notizen = parsed.notizen ?? undefined;
  }

  return result;
};
