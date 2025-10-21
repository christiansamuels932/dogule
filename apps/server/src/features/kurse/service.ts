import type {
  Kurs,
  KursCreateInput,
  KursListQuery,
  KursListResult,
  KursStatus,
  KursUpdateInput,
} from './schemas';
import { KurseRepository } from './repository';

export class KurseService {
  constructor(private readonly repository = new KurseRepository()) {}

  list(query: KursListQuery): Promise<KursListResult> {
    return this.repository.list(query);
  }

  get(id: string): Promise<Kurs | undefined> {
    return this.repository.findById(id);
  }

  create(payload: KursCreateInput): Promise<Kurs> {
    return this.repository.create(payload);
  }

  update(id: string, payload: KursUpdateInput): Promise<Kurs | undefined> {
    return this.repository.update(id, payload);
  }

  remove(id: string): Promise<boolean> {
    return this.repository.remove(id);
  }

  count(filter?: { status?: KursStatus }): Promise<number> {
    return this.repository.count(filter ?? {});
  }
}
