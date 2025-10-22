import {
  KalenderEvent,
  KalenderEventCreateInput,
  KalenderEventUpdateInput,
  KalenderListFilters,
  KalenderListResult,
} from '@dogule/domain';

import { KalenderRepository } from './repository';

export class KalenderService {
  constructor(private readonly repository = new KalenderRepository()) {}

  list(filters?: KalenderListFilters): Promise<KalenderListResult> {
    return this.repository.list(filters);
  }

  get(id: string): Promise<KalenderEvent | undefined> {
    return this.repository.findById(id);
  }

  create(payload: KalenderEventCreateInput): Promise<KalenderEvent> {
    return this.repository.create(payload);
  }

  update(id: string, payload: KalenderEventUpdateInput): Promise<KalenderEvent | undefined> {
    return this.repository.update(id, payload);
  }

  delete(id: string): Promise<boolean> {
    return this.repository.remove(id);
  }

  count(filters?: Pick<KalenderListFilters, 'from' | 'to'>): Promise<number> {
    return this.repository.count(filters);
  }
}
