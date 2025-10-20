export interface QueryOptions {
  text: string;
  params?: ReadonlyArray<unknown>;
}

const resolveDatabaseUrl = (url?: string): string => {
  if (url && url.trim().length > 0) {
    return url;
  }

  const envUrl = process.env.DATABASE_URL?.trim();

  if (envUrl && envUrl.length > 0) {
    return envUrl;
  }

  console.error('ERR_DB_ENV_001: DATABASE_URL environment variable is not defined.');
  process.exit(1);

  throw new Error('ERR_DB_ENV_001');
};

export class DatabaseClient {
  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[database] connect', this.url);
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
  new DatabaseClient(resolveDatabaseUrl(url));
