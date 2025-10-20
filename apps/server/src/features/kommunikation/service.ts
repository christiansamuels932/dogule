import { Message, MessageCreateInput, PaginatedResult, PaginationQuery } from '../../../../../packages/domain';
import { KommunikationRepository } from './repository';

export class KommunikationService {
  constructor(private readonly repository = new KommunikationRepository()) {}

  list(query?: PaginationQuery): Promise<PaginatedResult<Message>> {
    return this.repository.findAll(query);
  }

  get(id: string): Promise<Message | undefined> {
    return this.repository.findById(id);
  }

  create(payload: MessageCreateInput): Promise<Message> {
    return this.repository.create(payload);
  }

  update(id: string, payload: Partial<MessageCreateInput>): Promise<Message | undefined> {
    return this.repository.update(id, payload);
  }

  delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
