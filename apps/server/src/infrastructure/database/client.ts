import { Pool, QueryResult } from 'pg';
import { newDb, IMemoryDb } from 'pg-mem';

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
  private pool?: Pool;
  private memoryDb?: IMemoryDb;

  constructor(private readonly url: string) {}

  async connect(): Promise<void> {
    await this.ensurePool();

    if (process.env.NODE_ENV !== 'test') {
      console.info('[database] connect', this.url);
    }

    if (this.pool) {
      await this.initializeSchema(this.pool);
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

  private async ensurePool(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    if (process.env.NODE_ENV === 'test' || this.url.startsWith('pg-mem://')) {
      if (!this.memoryDb) {
        this.memoryDb = newDb({ autoCreateForeignKeyIndices: true });
      }

      const adapter = this.memoryDb.adapters.createPg();
      this.pool = new adapter.Pool();
      await this.initializeSchema(this.pool);
      return this.pool;
    }

    this.pool = new Pool({ connectionString: this.url });
    return this.pool;
  }

  private async initializeSchema(pool: Pool): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        role TEXT NOT NULL
      );
    `);
  }
}

export const createDatabaseClient = (url?: string): DatabaseClient =>
  new DatabaseClient(resolveDatabaseUrl(url));
