import { Dog, DogCreateInput } from '../../../../../packages/domain';
import { HundeRepository } from './repository';

interface ListParams {
  limit?: number;
  offset?: number;
  kundeId?: string;
}

interface ListResult {
  data: Dog[];
  total: number;
  limit: number;
  offset: number;
}

export class HundeService {
  constructor(private readonly repository = new HundeRepository()) {}

  async list(params: ListParams = {}): Promise<ListResult> {
    const limit = typeof params.limit === 'number' && Number.isFinite(params.limit) ? params.limit : 50;
    const offset = typeof params.offset === 'number' && Number.isFinite(params.offset) ? params.offset : 0;
    const safeLimit = limit > 0 ? limit : 50;
    const safeOffset = offset >= 0 ? offset : 0;

    return this.repository.list({
      limit: safeLimit,
      offset: safeOffset,
      kundeId: params.kundeId,
    });
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

  remove(id: string): Promise<boolean> {
    return this.repository.remove(id);
  }

  count(): Promise<number> {
    return this.repository.count();
  }
}
