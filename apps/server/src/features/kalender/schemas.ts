import { CalendarEventCreateInput } from '@dogule/domain';

const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export const parseCalendarEventCreateInput = (payload: unknown): CalendarEventCreateInput => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid calendar event payload');
  }

  const { title, description, start, end, relatedCourseId, relatedDogId } = payload as Record<string, unknown>;

  if (!isString(title) || !isString(start) || !isString(end)) {
    throw new Error('Calendar event title, start and end are required');
  }

  if (description !== undefined && typeof description !== 'string') {
    throw new Error('Calendar event description must be a string');
  }

  if (relatedCourseId !== undefined && !isString(relatedCourseId)) {
    throw new Error('Calendar event relatedCourseId must be a string');
  }

  if (relatedDogId !== undefined && !isString(relatedDogId)) {
    throw new Error('Calendar event relatedDogId must be a string');
  }

  return {
    title,
    description,
    start,
    end,
    relatedCourseId,
    relatedDogId,
  };
};

export const parseCalendarEventUpdateInput = (
  payload: unknown,
): Partial<CalendarEventCreateInput> => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid calendar event payload');
  }

  const { title, description, start, end, relatedCourseId, relatedDogId } = payload as Record<string, unknown>;
  const result: Partial<CalendarEventCreateInput> = {};

  if (title !== undefined) {
    if (!isString(title)) {
      throw new Error('Calendar event title must be a string');
    }
    result.title = title;
  }

  if (description !== undefined) {
    if (description !== null && typeof description !== 'string') {
      throw new Error('Calendar event description must be a string');
    }
    result.description = description as string | undefined;
  }

  if (start !== undefined) {
    if (!isString(start)) {
      throw new Error('Calendar event start must be a string');
    }
    result.start = start;
  }

  if (end !== undefined) {
    if (!isString(end)) {
      throw new Error('Calendar event end must be a string');
    }
    result.end = end;
  }

  if (relatedCourseId !== undefined) {
    if (!isString(relatedCourseId)) {
      throw new Error('Calendar event relatedCourseId must be a string');
    }
    result.relatedCourseId = relatedCourseId;
  }

  if (relatedDogId !== undefined) {
    if (!isString(relatedDogId)) {
      throw new Error('Calendar event relatedDogId must be a string');
    }
    result.relatedDogId = relatedDogId;
  }

  return result;
};
