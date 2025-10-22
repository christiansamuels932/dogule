import {
  type Kommunikation,
  type KommunikationCreateInput,
  type KommunikationListFilters,
  type KommunikationListResult,
  type KommunikationUpdateInput,
} from '@dogule/domain';

import { KommunikationRepository } from './repository';

const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

export class KommunikationService {
  constructor(private readonly repository = new KommunikationRepository()) {}

  async list(filters: KommunikationListFilters = {}): Promise<KommunikationListResult> {
    const limit =
      typeof filters.limit === 'number' && Number.isFinite(filters.limit) && filters.limit > 0
        ? filters.limit
        : DEFAULT_LIMIT;
    const offset =
      typeof filters.offset === 'number' && Number.isFinite(filters.offset) && filters.offset >= 0
        ? filters.offset
        : DEFAULT_OFFSET;

    return this.repository.list({
      ...filters,
      limit,
      offset,
    });
  }

  get(id: string): Promise<Kommunikation | undefined> {
    return this.repository.findById(id);
  }

  create(payload: KommunikationCreateInput): Promise<Kommunikation> {
    return this.repository.create(payload);
  }

  update(id: string, payload: KommunikationUpdateInput): Promise<Kommunikation | undefined> {
    return this.repository.update(id, payload);
  }

  remove(id: string): Promise<boolean> {
    return this.repository.remove(id);
  }

  count(): Promise<number> {
    return this.repository.count();
  }
}
