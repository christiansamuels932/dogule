import {
  Finanz,
  FinanzCreateInput,
  FinanzListFilters,
  FinanzListResult,
  FinanzUpdateInput,
} from '../../../../../packages/domain';
import { FinanzenRepository } from './repository';

export class FinanzenService {
  constructor(private readonly repository = new FinanzenRepository()) {}

  list(filters?: FinanzListFilters): Promise<FinanzListResult> {
    return this.repository.list(filters);
  }

  get(id: string): Promise<Finanz | undefined> {
    return this.repository.findById(id);
  }

  create(payload: FinanzCreateInput): Promise<Finanz> {
    return this.repository.create(payload);
  }

  update(id: string, payload: FinanzUpdateInput): Promise<Finanz | undefined> {
    return this.repository.update(id, payload);
  }

  delete(id: string): Promise<boolean> {
    return this.repository.remove(id);
  }

  sum(filters?: Pick<FinanzListFilters, 'from' | 'to' | 'typ'>): Promise<number> {
    return this.repository.sum(filters ?? {});
  }
}
