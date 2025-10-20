import {
  FinancialRecord,
  FinancialRecordCreateInput,
  PaginatedResult,
  PaginationQuery,
} from '../../../../../packages/domain';
import { FinanzenRepository } from './repository';

export class FinanzenService {
  constructor(private readonly repository = new FinanzenRepository()) {}

  list(query?: PaginationQuery): Promise<PaginatedResult<FinancialRecord>> {
    return this.repository.findAll(query);
  }

  get(id: string): Promise<FinancialRecord | undefined> {
    return this.repository.findById(id);
  }

  create(payload: FinancialRecordCreateInput): Promise<FinancialRecord> {
    return this.repository.create(payload);
  }

  update(
    id: string,
    payload: Partial<FinancialRecordCreateInput>,
  ): Promise<FinancialRecord | undefined> {
    return this.repository.update(id, payload);
  }

  delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
