import {
  CalendarEvent,
  CalendarEventCreateInput,
  PaginatedResult,
  PaginationQuery,
} from '@dogule/domain';

let sequence = 0;
const generateId = () => {
  sequence += 1;
  return `event_${sequence}`;
};

export class KalenderRepository {
  private readonly events = new Map<string, CalendarEvent>();

  async findAll({ page = 1, pageSize = 50 }: PaginationQuery = {}): Promise<PaginatedResult<CalendarEvent>> {
    const values = Array.from(this.events.values());
    const start = (page - 1) * pageSize;
    const data = values.slice(start, start + pageSize);
    return {
      data,
      total: values.length,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<CalendarEvent | undefined> {
    return this.events.get(id);
  }

  async create(payload: CalendarEventCreateInput): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: generateId(),
      ...payload,
    };
    this.events.set(event.id, event);
    return event;
  }

  async update(
    id: string,
    payload: Partial<CalendarEventCreateInput>,
  ): Promise<CalendarEvent | undefined> {
    const existing = this.events.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: CalendarEvent = {
      ...existing,
      ...payload,
    };

    this.events.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.events.delete(id);
  }
}
