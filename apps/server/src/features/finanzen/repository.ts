import {
  FinancialRecord,
  FinancialRecordCreateInput,
  PaginatedResult,
  PaginationQuery,
} from '../../../../../packages/domain';

let sequence = 0;
const generateId = () => {
  sequence += 1;
  return `finance_${sequence}`;
};

export class FinanzenRepository {
  private readonly records = new Map<string, FinancialRecord>();

  async findAll({ page = 1, pageSize = 50 }: PaginationQuery = {}): Promise<PaginatedResult<FinancialRecord>> {
    const values = Array.from(this.records.values());
    const start = (page - 1) * pageSize;
    const data = values.slice(start, start + pageSize);
    return {
      data,
      total: values.length,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<FinancialRecord | undefined> {
    return this.records.get(id);
  }

  async create(payload: FinancialRecordCreateInput): Promise<FinancialRecord> {
    const record: FinancialRecord = {
      id: generateId(),
      ...payload,
      settledAt: payload.type === 'payment' ? new Date().toISOString() : undefined,
    };
    this.records.set(record.id, record);
    return record;
  }

  async update(
    id: string,
    payload: Partial<FinancialRecordCreateInput>,
  ): Promise<FinancialRecord | undefined> {
    const existing = this.records.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: FinancialRecord = {
      ...existing,
      ...payload,
    };

    this.records.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.records.delete(id);
  }
}
