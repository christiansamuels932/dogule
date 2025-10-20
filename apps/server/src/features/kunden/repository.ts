import { Customer, CustomerCreateInput, PaginatedResult, PaginationQuery } from '../../../../../packages/domain';

let sequence = 0;

const generateId = () => {
  sequence += 1;
  return `cust_${sequence}`;
};

export class KundenRepository {
  private readonly customers = new Map<string, Customer>();

  async findAll({ page = 1, pageSize = 50 }: PaginationQuery = {}): Promise<PaginatedResult<Customer>> {
    const values = Array.from(this.customers.values());
    const start = (page - 1) * pageSize;
    const data = values.slice(start, start + pageSize);
    return {
      data,
      total: values.length,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async create(payload: CustomerCreateInput): Promise<Customer> {
    const now = new Date().toISOString();
    const customer: Customer = {
      id: generateId(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };

    this.customers.set(customer.id, customer);
    return customer;
  }

  async update(id: string, payload: Partial<CustomerCreateInput>): Promise<Customer | undefined> {
    const existing = this.customers.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Customer = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    this.customers.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }
}
