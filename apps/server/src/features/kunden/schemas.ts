import { CustomerCreateInput } from '../../../../../packages/domain';

const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export const parseCustomerCreateInput = (payload: unknown): CustomerCreateInput => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid customer payload');
  }

  const { firstName, lastName, email, phone } = payload as Record<string, unknown>;

  if (!isString(firstName) || !isString(lastName) || !isString(email)) {
    throw new Error('Customer firstName, lastName and email are required');
  }

  if (phone !== undefined && typeof phone !== 'string') {
    throw new Error('Customer phone must be a string');
  }

  return {
    firstName,
    lastName,
    email,
    phone,
  };
};

export const parseCustomerUpdateInput = (payload: unknown): Partial<CustomerCreateInput> => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid customer payload');
  }

  const { firstName, lastName, email, phone } = payload as Record<string, unknown>;
  const result: Partial<CustomerCreateInput> = {};

  if (firstName !== undefined) {
    if (!isString(firstName)) {
      throw new Error('Customer firstName must be a string');
    }
    result.firstName = firstName;
  }

  if (lastName !== undefined) {
    if (!isString(lastName)) {
      throw new Error('Customer lastName must be a string');
    }
    result.lastName = lastName;
  }

  if (email !== undefined) {
    if (!isString(email)) {
      throw new Error('Customer email must be a string');
    }
    result.email = email;
  }

  if (phone !== undefined) {
    if (!isString(phone)) {
      throw new Error('Customer phone must be a string');
    }
    result.phone = phone;
  }

  return result;
};
