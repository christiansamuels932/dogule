import { Dog, DogCreateInput, PaginatedResult, PaginationQuery } from '../../../../../packages/domain';
import { HundeRepository } from './repository';

export class HundeService {
  constructor(private readonly repository = new HundeRepository()) {}

  list(query?: PaginationQuery): Promise<PaginatedResult<Dog>> {
    return this.repository.findAll(query);
  }

  get(id: string): Promise<Dog | undefined> {
    return this.repository.findById(id);
  }

  create(payload: DogCreateInput): Promise<Dog> {
    return this.repository.create(payload);
  }

  update(id: string, payload: Partial<DogCreateInput>): Promise<Dog | undefined> {
    return this.repository.update(id, payload);
  }

  delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
