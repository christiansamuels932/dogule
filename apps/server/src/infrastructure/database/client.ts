import { Pool, QueryResult } from 'pg';

export interface QueryOptions {
  text: string;
  params?: ReadonlyArray<unknown>;
}

export class DatabaseClient {
  private pool?: Pool;

  constructor(private readonly url: string) {}

  private async ensurePool(): Promise<Pool> {
    if (!this.pool) {
      await this.connect();
    }

    if (!this.pool) {
      throw new Error('Database pool is not initialized');
    }

    return this.pool;
  }

  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    this.pool = new Pool({ connectionString: this.url });

    if (process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      const client = await this.pool.connect();
      client.release();

      console.info('[database] connect', this.url);
    } catch (error) {
      console.error('ERR_DB_CONNECT_001 Failed to connect to database', error);
      throw error;
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

export const createDatabaseClient = (url: string): DatabaseClient => new DatabaseClient(url);
