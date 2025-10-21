import { randomUUID } from 'crypto';

import { Pool, QueryResult } from 'pg';
import { IMemoryDb, newDb } from 'pg-mem';

export interface QueryOptions {
  text: string;
  params?: ReadonlyArray<unknown>;
}

export class DatabaseClient {
  public readonly mode: 'postgres' | 'memory';
  public readonly url?: string;
  public pool?: Pool;
  public memoryDb?: IMemoryDb;
  public bootstrapped = false;

  constructor(options: { mode: 'postgres'; url: string } | { mode: 'memory' }) {
    this.mode = options.mode;
    if (options.mode === 'postgres') {
      this.url = options.url;
    }
  }

  private async ensurePool(): Promise<Pool> {
    if (this.pool) {
      if (!this.bootstrapped) {
        await this.bootstrapSchema(this.pool);
      }

      return this.pool;
    }

    if (this.mode === 'postgres') {
      if (!this.url) {
        console.error('ERR_DB_CONFIG_001 mode=postgres requires url');
        throw new Error('ERR_DB_CONFIG_001');
      }

      try {
        this.pool = new Pool({ connectionString: this.url });
      } catch (error) {
        console.error('ERR_DB_CONNECT_001', error);
        throw new Error('ERR_DB_CONNECT_001');
      }

      try {
        await this.pool.query('SELECT 1');
      } catch (error) {
        console.error('ERR_DB_LIVENESS_001', error);
        await this.pool.end().catch(() => undefined);
        this.pool = undefined;
        throw new Error('ERR_DB_LIVENESS_001');
      }

      console.info('LOG_DB_READY_001', this.url);
    } else {
      try {
        this.memoryDb = newDb();
        this.memoryDb.public.registerFunction({
          name: 'gen_random_uuid',
          returns: 'uuid',
          implementation: () => randomUUID(),
          impure: true,
        });
        const { Pool: MemoryPool } = this.memoryDb.adapters.createPg();
        this.pool = new MemoryPool() as unknown as Pool;
      } catch (error) {
        console.error('ERR_DB_CONNECT_001', error);
        throw new Error('ERR_DB_CONNECT_001');
      }

      try {
        await this.pool.query('SELECT 1');
      } catch (error) {
        console.error('ERR_DB_LIVENESS_001', error);
        this.pool = undefined;
        this.memoryDb = undefined;
        throw new Error('ERR_DB_LIVENESS_001');
      }

      console.info('LOG_DB_READY_002');
    }

    await this.bootstrapSchema(this.pool);
    return this.pool;
  }

  async connect(): Promise<void> {
    await this.ensurePool();
  }

  async disconnect(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.end();
    this.pool = undefined;
    this.memoryDb = undefined;
    this.bootstrapped = false;
  }

  async query<T>({ text, params = [] }: QueryOptions): Promise<T[]> {
    const pool = await this.ensurePool();

    const result: QueryResult<T> = await pool.query(text, params);
    return result.rows;
  }

  private async bootstrapSchema(pool: Pool): Promise<void> {
    if (this.bootstrapped) {
      return;
    }

    try {
      const statements: string[] = [];

      if (this.mode === 'postgres') {
        statements.push('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      }

      const kundenIdType = this.mode === 'postgres' ? 'UUID' : 'TEXT';

      const isMemory = this.mode === 'memory';
      const kundenColumns = `
          id ${kundenIdType} PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          first_name TEXT${isMemory ? '' : ' NOT NULL'},
          last_name TEXT${isMemory ? '' : ' NOT NULL'},
          email TEXT${isMemory ? '' : ' NOT NULL'},
          phone TEXT,
          notes TEXT
        `;

      statements.push(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          hashed_password TEXT NOT NULL,
          role TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS kunden (
${kundenColumns}
        );
        CREATE INDEX IF NOT EXISTS idx_kunden_created_at ON kunden(created_at);
        CREATE TABLE IF NOT EXISTS hunde (
          id TEXT PRIMARY KEY,
          owner_id ${kundenIdType},
          CONSTRAINT fk_hunde_owner FOREIGN KEY (owner_id) REFERENCES kunden (id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS kurse (
          id TEXT PRIMARY KEY
        );
        CREATE TABLE IF NOT EXISTS finanzen (
          id TEXT PRIMARY KEY
        );
        CREATE TABLE IF NOT EXISTS kalender (
          id TEXT PRIMARY KEY
        );
        CREATE TABLE IF NOT EXISTS kommunikation (
          id TEXT PRIMARY KEY
        );
      `);

      for (const statement of statements) {
        await pool.query(statement);
      }
      this.bootstrapped = true;
      console.info('LOG_DB_BOOTSTRAP_001');
    } catch (error) {
      console.error('ERR_DB_BOOTSTRAP_001', error);
      throw new Error('ERR_DB_BOOTSTRAP_001');
    }
  }
}

export const createDatabaseClient = (url?: string): DatabaseClient => {
  const candidateUrl = url?.trim() || process.env.DATABASE_URL?.trim();

  if (process.env.NODE_ENV === 'test') {
    return new DatabaseClient({ mode: 'memory' });
  }

  if (candidateUrl) {
    if (candidateUrl.startsWith('pg-mem://')) {
      return new DatabaseClient({ mode: 'memory' });
    }

    return new DatabaseClient({ mode: 'postgres', url: candidateUrl });
  }

  console.warn('WARN_DB_FALLBACK_001 using pg-mem');
  return new DatabaseClient({ mode: 'memory' });
};
