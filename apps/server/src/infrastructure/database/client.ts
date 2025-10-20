import { Pool, QueryResult } from 'pg';

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
    if (!this.pool) {
      return;
    }

    await this.pool.end();
    this.pool = undefined;

    if (process.env.NODE_ENV !== 'test') {
      console.info('[database] disconnect');
    }
  }

  async query<T>({ text, params = [] }: QueryOptions): Promise<T[]> {
    const pool = await this.ensurePool();

    if (process.env.NODE_ENV !== 'test') {
      console.debug('[database] query executed', text);
    }

    const result: QueryResult<T> = await pool.query(text, params);
    return result.rows;
  }
}

export const createDatabaseClient = (url?: string): DatabaseClient =>
  new DatabaseClient(resolveDatabaseUrl(url));
