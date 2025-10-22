import { z } from 'zod';
import { CustomerCreateInput } from '@dogule/domain';

export const kundenCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().min(1).optional(),
});

export const kundenUpdateSchema = kundenCreateSchema.partial();

export const parseCustomerCreateInput = (payload: unknown): CustomerCreateInput => {
  return kundenCreateSchema.parse(payload);
};

export const parseCustomerUpdateInput = (payload: unknown): Partial<CustomerCreateInput> => {
  return kundenUpdateSchema.parse(payload);
};
