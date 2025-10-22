import {
  CalendarEvent,
  CalendarEventCreateInput,
  PaginatedResult,
  PaginationQuery,
} from '@dogule/domain';
import { KalenderRepository } from './repository';

export class KalenderService {
  constructor(private readonly repository = new KalenderRepository()) {}

  list(query?: PaginationQuery): Promise<PaginatedResult<CalendarEvent>> {
    return this.repository.findAll(query);
  }

  get(id: string): Promise<CalendarEvent | undefined> {
    return this.repository.findById(id);
  }

  create(payload: CalendarEventCreateInput): Promise<CalendarEvent> {
    return this.repository.create(payload);
  }

  update(
    id: string,
    payload: Partial<CalendarEventCreateInput>,
  ): Promise<CalendarEvent | undefined> {
    return this.repository.update(id, payload);
  }

  delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
