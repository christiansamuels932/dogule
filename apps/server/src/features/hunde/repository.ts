import { Dog, DogCreateInput, PaginatedResult, PaginationQuery } from '../../../../../packages/domain';

let sequence = 0;
const generateId = () => {
  sequence += 1;
  return `dog_${sequence}`;
};

export class HundeRepository {
  private readonly dogs = new Map<string, Dog>();

  async findAll({ page = 1, pageSize = 50 }: PaginationQuery = {}): Promise<PaginatedResult<Dog>> {
    const values = Array.from(this.dogs.values());
    const start = (page - 1) * pageSize;
    const data = values.slice(start, start + pageSize);
    return {
      data,
      total: values.length,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<Dog | undefined> {
    return this.dogs.get(id);
  }

  async create(payload: DogCreateInput): Promise<Dog> {
    const now = new Date().toISOString();
    const dog: Dog = {
      id: generateId(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    this.dogs.set(dog.id, dog);
    return dog;
  }

  async update(id: string, payload: Partial<DogCreateInput>): Promise<Dog | undefined> {
    const existing = this.dogs.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Dog = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    this.dogs.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.dogs.delete(id);
  }
}
