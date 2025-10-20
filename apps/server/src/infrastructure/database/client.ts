export interface QueryOptions {
  text: string;
  params?: ReadonlyArray<unknown>;
}

export class DatabaseClient {
  constructor(private readonly url?: string) {}

  async connect(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[database] connect', this.url ?? 'in-memory');
    }
  }

  async disconnect(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[database] disconnect');
    }
  }

  async query<T>(_options: QueryOptions): Promise<T[]> {
    if (process.env.NODE_ENV !== 'test') {
      console.debug('[database] query executed');
    }

    return [];
  }
}

export const createDatabaseClient = (url?: string): DatabaseClient =>
  new DatabaseClient(url);
