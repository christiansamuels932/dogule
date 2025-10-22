import { randomUUID } from 'crypto';

import { Pool, QueryResult } from 'pg';
import { IMemoryDb, newDb } from 'pg-mem';

import { logError, logInfo, logWarn } from '@dogule/utils';

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
        logError('ERR_DB_CONFIG_001 mode=postgres requires url');
        throw new Error('ERR_DB_CONFIG_001');
      }

      try {
        this.pool = new Pool({ connectionString: this.url });
      } catch (error) {
        logError('ERR_DB_CONNECT_001', error);
        throw new Error('ERR_DB_CONNECT_001');
      }

      try {
        await this.pool.query('SELECT 1');
      } catch (error) {
        logError('ERR_DB_LIVENESS_001', error);
        await this.pool.end().catch(() => undefined);
        this.pool = undefined;
        throw new Error('ERR_DB_LIVENESS_001');
      }

      logInfo('LOG_DB_READY_001', this.url);
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
        logError('ERR_DB_CONNECT_001', error);
        throw new Error('ERR_DB_CONNECT_001');
      }

      try {
        await this.pool.query('SELECT 1');
      } catch (error) {
        logError('ERR_DB_LIVENESS_001', error);
        this.pool = undefined;
        this.memoryDb = undefined;
        throw new Error('ERR_DB_LIVENESS_001');
      }

      logInfo('LOG_DB_READY_002');
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

      statements.push(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          hashed_password TEXT NOT NULL,
          role TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS kunden (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          notes TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_kunden_created_at ON kunden(created_at);
        DROP TABLE IF EXISTS hunde;
        CREATE TABLE IF NOT EXISTS hunde (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          kunde_id UUID NOT NULL REFERENCES kunden(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          geburtsdatum DATE,
          rasse TEXT,
          notizen TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_hunde_kunde_id ON hunde(kunde_id);
        CREATE INDEX IF NOT EXISTS idx_hunde_created_at ON hunde(created_at);
        CREATE TABLE IF NOT EXISTS kurse (
          id TEXT PRIMARY KEY
        );
        CREATE TABLE IF NOT EXISTS finanzen (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          datum DATE NOT NULL,
          typ TEXT NOT NULL CHECK (typ IN ('einnahme','ausgabe')),
          betrag_cents INTEGER NOT NULL CHECK (betrag_cents >= 0),
          kategorie TEXT,
          beschreibung TEXT,
          referenz TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_finanzen_datum ON finanzen(datum);
        CREATE INDEX IF NOT EXISTS idx_finanzen_typ ON finanzen(typ);
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
      logInfo('LOG_DB_BOOTSTRAP_001');
    } catch (error) {
      logError('ERR_DB_BOOTSTRAP_001', error);
      throw new Error('ERR_DB_BOOTSTRAP_001');
    }
  }
}

export const createDatabaseClient = (url?: string): DatabaseClient => {
  const candidateUrl = url?.trim() || process.env.DATABASE_URL?.trim();

  if (candidateUrl) {
    if (candidateUrl.startsWith('pg-mem://')) {
      return new DatabaseClient({ mode: 'memory' });
    }

    return new DatabaseClient({ mode: 'postgres', url: candidateUrl });
  }

  if (candidateUrl && candidateUrl.startsWith('pg-mem://')) {
    return new DatabaseClient({ mode: 'memory' });
  }

  if (process.env.NODE_ENV !== 'test') {
    logWarn('WARN_DB_FALLBACK_001 using pg-mem');
  }

  return new DatabaseClient({ mode: 'memory' });
};
