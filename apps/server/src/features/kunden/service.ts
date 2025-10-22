import { Customer, CustomerCreateInput, PaginatedResult, PaginationQuery } from '@dogule/domain';
import { KundenRepository } from './repository';

const DEFAULT_PAGE_SIZE = 50;

export class KundenService {
  constructor(private readonly repository = new KundenRepository()) {}

  async list(query?: PaginationQuery): Promise<PaginatedResult<Customer>> {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const pageSize = query?.pageSize && query.pageSize > 0 ? query.pageSize : DEFAULT_PAGE_SIZE;
    const offset = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.repository.list({ limit: pageSize, offset }),
      this.repository.count(),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  get(id: string): Promise<Customer | undefined> {
    return this.repository.findById(id);
  }

  create(payload: CustomerCreateInput): Promise<Customer> {
    return this.repository.create(payload);
  }

  update(id: string, payload: Partial<CustomerCreateInput>): Promise<Customer | undefined> {
    return this.repository.update(id, payload);
  }

  delete(id: string): Promise<boolean> {
    return this.repository.remove(id);
  }
}
