import { Pool, QueryResult } from 'pg';
import { newDb } from 'pg-mem';

export interface QueryOptions {
  text: string;
  params?: ReadonlyArray<unknown>;
}

interface DatabaseConfig {
  createPool: () => Pool;
  label: string;
}

const resolveDatabaseConfig = (url?: string): DatabaseConfig => {
  const candidateUrl = url?.trim() || process.env.DATABASE_URL?.trim();

  if (candidateUrl) {
    return {
      createPool: () => new Pool({ connectionString: candidateUrl }),
      label: candidateUrl,
    };
  }

  console.warn('WARN_DB_FALLBACK_001 using pg-mem');
  const db = newDb();
  const { Pool: MemoryPool } = db.adapters.createPg();

  return {
    createPool: () => new MemoryPool() as unknown as Pool,
    label: 'pg-mem',
  };
};

export class DatabaseClient {
  private pool?: Pool;

  constructor(
    private readonly createPool: () => Pool,
    private readonly label: string,
  ) {}

  private async ensurePool(): Promise<Pool> {
    if (!this.pool) {
      try {
        this.pool = this.createPool();
        await this.pool.query('SELECT 1');
      } catch (error) {
        console.error('ERR_DB_CONNECT_001', error);
        process.exit(1);
      }
    }

    return this.pool;
  }

  async connect(): Promise<void> {
    await this.ensurePool();

    if (process.env.NODE_ENV !== 'test') {
      console.info('[database] connect', this.label);
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

export const createDatabaseClient = (url?: string): DatabaseClient => {
  const config = resolveDatabaseConfig(url);
  return new DatabaseClient(config.createPool, config.label);
};
