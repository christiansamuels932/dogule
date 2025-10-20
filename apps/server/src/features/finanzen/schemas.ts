import { FinancialRecordCreateInput } from '../../../../../packages/domain';

const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const parseFinancialRecordCreateInput = (payload: unknown): FinancialRecordCreateInput => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid financial record payload');
  }

  const { customerId, amount, currency, type, issuedAt, dueAt } = payload as Record<string, unknown>;

  if (!isString(customerId) || !isNumber(amount) || !isString(currency) || !isString(type) || !isString(issuedAt)) {
    throw new Error('Financial record customerId, amount, currency, type and issuedAt are required');
  }

  if (type !== 'invoice' && type !== 'payment') {
    throw new Error('Financial record type must be invoice or payment');
  }

  if (dueAt !== undefined && !isString(dueAt)) {
    throw new Error('Financial record dueAt must be a string');
  }

  return {
    customerId,
    amount,
    currency,
    type,
    issuedAt,
    dueAt,
  };
};

export const parseFinancialRecordUpdateInput = (
  payload: unknown,
): Partial<FinancialRecordCreateInput> => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid financial record payload');
  }

  const { customerId, amount, currency, type, issuedAt, dueAt } = payload as Record<string, unknown>;
  const result: Partial<FinancialRecordCreateInput> = {};

  if (customerId !== undefined) {
    if (!isString(customerId)) {
      throw new Error('Financial record customerId must be a string');
    }
    result.customerId = customerId;
  }

  if (amount !== undefined) {
    if (!isNumber(amount)) {
      throw new Error('Financial record amount must be a number');
    }
    result.amount = amount;
  }

  if (currency !== undefined) {
    if (!isString(currency)) {
      throw new Error('Financial record currency must be a string');
    }
    result.currency = currency;
  }

  if (type !== undefined) {
    if (!isString(type) || (type !== 'invoice' && type !== 'payment')) {
      throw new Error('Financial record type must be invoice or payment');
    }
    result.type = type as 'invoice' | 'payment';
  }

  if (issuedAt !== undefined) {
    if (!isString(issuedAt)) {
      throw new Error('Financial record issuedAt must be a string');
    }
    result.issuedAt = issuedAt;
  }

  if (dueAt !== undefined) {
    if (!isString(dueAt)) {
      throw new Error('Financial record dueAt must be a string');
    }
    result.dueAt = dueAt;
  }

  return result;
};
