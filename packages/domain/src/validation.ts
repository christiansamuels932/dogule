import { z } from 'zod';

const BaseEntitySchema = z.object({
  uuid: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const KundeSchema = BaseEntitySchema.extend({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(3).optional(),
});

export const HundSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  breed: z.string().min(1),
  ownerId: z.string().uuid(),
  dateOfBirth: z.string().date().optional(),
});

export const KursSchema = BaseEntitySchema.extend({
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  scheduleId: z.string().uuid().optional(),
});

export const FinanzSchema = BaseEntitySchema.extend({
  customerId: z.string().uuid(),
  amount: z.number().finite(),
  currency: z.string().length(3),
  type: z.enum(['invoice', 'payment']),
  issuedAt: z.string().datetime(),
  dueAt: z.string().datetime().optional(),
  settledAt: z.string().datetime().optional(),
});

export const KalenderSchema = BaseEntitySchema.extend({
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  relatedCourseId: z.string().uuid().optional(),
  relatedDogId: z.string().uuid().optional(),
});

export const KommunikationSchema = BaseEntitySchema.extend({
  senderId: z.string().uuid(),
  recipientId: z.string().uuid(),
  subject: z.string().min(1),
  body: z.string().min(1),
  sentAt: z.string().datetime(),
  readAt: z.string().datetime().optional(),
});

export const Schemas = {
  BaseEntity: BaseEntitySchema,
  Kunde: KundeSchema,
  Hund: HundSchema,
  Kurs: KursSchema,
  Finanz: FinanzSchema,
  Kalender: KalenderSchema,
  Kommunikation: KommunikationSchema,
};

export type Kunde = z.infer<typeof KundeSchema>;
export type Hund = z.infer<typeof HundSchema>;
export type Kurs = z.infer<typeof KursSchema>;
export type Finanz = z.infer<typeof FinanzSchema>;
export type Kalender = z.infer<typeof KalenderSchema>;
export type Kommunikation = z.infer<typeof KommunikationSchema>;

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
