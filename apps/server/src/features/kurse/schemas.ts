import { CourseCreateInput } from '@dogule/domain';

const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export const parseCourseCreateInput = (payload: unknown): CourseCreateInput => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid course payload');
  }

  const { title, description, scheduleId } = payload as Record<string, unknown>;

  if (!isString(title)) {
    throw new Error('Course title is required');
  }

  if (description !== undefined && typeof description !== 'string') {
    throw new Error('Course description must be a string');
  }

  if (scheduleId !== undefined && !isString(scheduleId)) {
    throw new Error('Course scheduleId must be a string');
  }

  return {
    title,
    description,
    scheduleId,
  };
};

export const parseCourseUpdateInput = (payload: unknown): Partial<CourseCreateInput> => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid course payload');
  }

  const { title, description, scheduleId } = payload as Record<string, unknown>;
  const result: Partial<CourseCreateInput> = {};

  if (title !== undefined) {
    if (!isString(title)) {
      throw new Error('Course title must be a string');
    }
    result.title = title;
  }

  if (description !== undefined) {
    if (description !== null && typeof description !== 'string') {
      throw new Error('Course description must be a string');
    }
    result.description = description as string | undefined;
  }

  if (scheduleId !== undefined) {
    if (!isString(scheduleId)) {
      throw new Error('Course scheduleId must be a string');
    }
    result.scheduleId = scheduleId;
  }

  return result;
};
