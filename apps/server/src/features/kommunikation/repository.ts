import { Message, MessageCreateInput, PaginatedResult, PaginationQuery } from '../../../../../packages/domain';

let sequence = 0;
const generateId = () => {
  sequence += 1;
  return `message_${sequence}`;
};

export class KommunikationRepository {
  private readonly messages = new Map<string, Message>();

  async findAll({ page = 1, pageSize = 50 }: PaginationQuery = {}): Promise<PaginatedResult<Message>> {
    const values = Array.from(this.messages.values());
    const start = (page - 1) * pageSize;
    const data = values.slice(start, start + pageSize);
    return {
      data,
      total: values.length,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async create(payload: MessageCreateInput): Promise<Message> {
    const message: Message = {
      id: generateId(),
      ...payload,
      sentAt: new Date().toISOString(),
    };
    this.messages.set(message.id, message);
    return message;
  }

  async update(id: string, payload: Partial<MessageCreateInput>): Promise<Message | undefined> {
    const existing = this.messages.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Message = {
      ...existing,
      ...payload,
    };

    this.messages.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.messages.delete(id);
  }
}
