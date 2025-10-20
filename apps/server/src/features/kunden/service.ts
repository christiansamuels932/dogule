import {
  Customer,
  CustomerCreateInput,
  PaginatedResult,
  PaginationQuery,
} from '../../../../../packages/domain';
import { KundenRepository } from './repository';

export class KundenService {
  constructor(private readonly repository = new KundenRepository()) {}

  list(query?: PaginationQuery): Promise<PaginatedResult<Customer>> {
    return this.repository.findAll(query);
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
    return this.repository.delete(id);
  }
}
