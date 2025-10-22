import { randomUUID } from 'crypto';

import { Pool, QueryResult } from 'pg';
import { IMemoryDb, newDb } from 'pg-mem';
import type { DataType } from 'pg-mem';

import { ErrorCode, LogCode } from '@dogule/domain';
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
        logError(ErrorCode.ERR_DB_CONFIG_001, 'mode=postgres requires url');
        throw new Error(ErrorCode.ERR_DB_CONFIG_001);
      }

      try {
        this.pool = new Pool({ connectionString: this.url });
      } catch (error) {
        logError(ErrorCode.ERR_DB_CONNECT_001, error);
        throw new Error(ErrorCode.ERR_DB_CONNECT_001);
      }

      try {
        await this.pool.query('SELECT 1');
      } catch (error) {
        logError(ErrorCode.ERR_DB_LIVENESS_001, error);
        await this.pool.end().catch(() => undefined);
        this.pool = undefined;
        throw new Error(ErrorCode.ERR_DB_LIVENESS_001);
      }

      logInfo(LogCode.LOG_DB_READY_001, this.url);
    } else {
      try {
        this.memoryDb = newDb();
        this.memoryDb.public.registerFunction({
          name: 'gen_random_uuid',
          returns: 'uuid' as unknown as DataType,
          implementation: () => randomUUID(),
          impure: true,
        });
        const { Pool: MemoryPool } = this.memoryDb.adapters.createPg();
        this.pool = new MemoryPool() as unknown as Pool;
      } catch (error) {
        logError(ErrorCode.ERR_DB_CONNECT_001, error);
        throw new Error(ErrorCode.ERR_DB_CONNECT_001);
      }

      try {
        await this.pool.query('SELECT 1');
      } catch (error) {
        logError(ErrorCode.ERR_DB_LIVENESS_001, error);
        this.pool = undefined;
        this.memoryDb = undefined;
        throw new Error(ErrorCode.ERR_DB_LIVENESS_001);
      }

      logInfo(LogCode.LOG_DB_READY_002);
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
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          titel TEXT NOT NULL,
          beschreibung TEXT,
          start_datum DATE NOT NULL,
          end_datum DATE,
          ort TEXT,
          preis_cents INTEGER DEFAULT 0 CHECK (preis_cents >= 0),
          max_teilnehmer INTEGER DEFAULT 0 CHECK (max_teilnehmer >= 0),
          status TEXT NOT NULL DEFAULT 'geplant'
        );
        CREATE INDEX IF NOT EXISTS idx_kurse_start ON kurse(start_datum);
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
        DROP TABLE IF EXISTS kalender;
        CREATE TABLE IF NOT EXISTS kalender (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          titel TEXT NOT NULL,
          beschreibung TEXT,
          start_datum TIMESTAMPTZ NOT NULL,
          end_datum TIMESTAMPTZ NOT NULL,
          ort TEXT,
          related_kurs_id UUID REFERENCES kurse(id) ON DELETE SET NULL,
          related_hund_id UUID REFERENCES hunde(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_kalender_start ON kalender(start_datum);
        CREATE INDEX IF NOT EXISTS idx_kalender_kurs_id ON kalender(related_kurs_id);
        CREATE INDEX IF NOT EXISTS idx_kalender_hund_id ON kalender(related_hund_id);
        DROP TABLE IF EXISTS kommunikation;
        CREATE TABLE IF NOT EXISTS kommunikation (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          sender_kunde_id ${kundenIdType} REFERENCES kunden(id) ON DELETE SET NULL,
          recipient_kunde_id ${kundenIdType} REFERENCES kunden(id) ON DELETE SET NULL,
          hund_id UUID REFERENCES hunde(id) ON DELETE SET NULL,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          read_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_kommunikation_sender ON kommunikation(sender_kunde_id);
        CREATE INDEX IF NOT EXISTS idx_kommunikation_recipient ON kommunikation(recipient_kunde_id);
      `);

      for (const statement of statements) {
        await pool.query(statement);
      }
      this.bootstrapped = true;
      logInfo(LogCode.LOG_DB_BOOTSTRAP_001);
    } catch (error) {
      logError(ErrorCode.ERR_DB_BOOTSTRAP_001, error);
      throw new Error(ErrorCode.ERR_DB_BOOTSTRAP_001);
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

  if (candidateUrl && candidateUrl.startsWith('pg-mem://')) {
    return new DatabaseClient({ mode: 'memory' });
  }

  if (process.env.NODE_ENV !== 'test') {
    logWarn('WARN_DB_FALLBACK_001 using pg-mem');
  }

  return new DatabaseClient({ mode: 'memory' });
};
