import { DogCreateInput } from '../../../../../packages/domain';

const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export const parseDogCreateInput = (payload: unknown): DogCreateInput => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid dog payload');
  }

  const { name, breed, ownerId, dateOfBirth } = payload as Record<string, unknown>;

  if (!isString(name) || !isString(breed) || !isString(ownerId)) {
    throw new Error('Dog name, breed and ownerId are required');
  }

  if (dateOfBirth !== undefined && !isString(dateOfBirth)) {
    throw new Error('Dog dateOfBirth must be a string');
  }

  return {
    name,
    breed,
    ownerId,
    dateOfBirth,
  };
};

export const parseDogUpdateInput = (payload: unknown): Partial<DogCreateInput> => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid dog payload');
  }

  const { name, breed, ownerId, dateOfBirth } = payload as Record<string, unknown>;
  const result: Partial<DogCreateInput> = {};

  if (name !== undefined) {
    if (!isString(name)) {
      throw new Error('Dog name must be a string');
    }
    result.name = name;
  }

  if (breed !== undefined) {
    if (!isString(breed)) {
      throw new Error('Dog breed must be a string');
    }
    result.breed = breed;
  }

  if (ownerId !== undefined) {
    if (!isString(ownerId)) {
      throw new Error('Dog ownerId must be a string');
    }
    result.ownerId = ownerId;
  }

  if (dateOfBirth !== undefined) {
    if (!isString(dateOfBirth)) {
      throw new Error('Dog dateOfBirth must be a string');
    }
    result.dateOfBirth = dateOfBirth;
  }

  return result;
};
