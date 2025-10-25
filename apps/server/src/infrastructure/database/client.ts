import { randomUUID } from 'node:crypto';
import { Pool, QueryResult } from 'pg';
import { IMemoryDb, newDb } from 'pg-mem';

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
        const db = newDb({ autoCreateForeignKeyIndices: true });
        try {
          const register = (name: 'gen_random_uuid' | 'uuid_generate_v4') => {
            db.public.registerFunction({
              name,
              args: [],
              returns: 'uuid',
              implementation: () => randomUUID(),
              impure: true,
            });
          };

          register('gen_random_uuid');
          register('uuid_generate_v4');

          logInfo(LogCode.LOG_DB_UUID_SHIM_001, db.public.mocks.has('gen_random_uuid'));
        } catch (error) {
          logError(ErrorCode.ERR_DB_UUID_SHIM_001, error);
          throw error;
        }
        this.memoryDb = db;
        const { Pool: MemoryPool } = db.adapters.createPg();
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

    this.bootstrapped = true;

    try {
      const statements: string[] = [];

      const isMemory = this.mode === 'memory';
      if (!isMemory) {
        statements.push('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      }

      const uuidType = 'UUID';
      const uuidDefault = ` DEFAULT ${isMemory ? 'uuid_generate_v4()' : 'gen_random_uuid()'}`;
      const kundenIdType = uuidType;
      const kundenIdDefault = uuidDefault;
      const userIdType = uuidType;
      const userIdDefault = uuidDefault;
      const refreshIdDefault = uuidDefault;
      const kundenColumns = `
          id ${kundenIdType} PRIMARY KEY${kundenIdDefault},
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
          id ${userIdType} PRIMARY KEY${userIdDefault},
          email TEXT UNIQUE NOT NULL,
          hashed_password TEXT NOT NULL,
          role TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
          id ${uuidType} PRIMARY KEY${refreshIdDefault},
          user_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          hashed_token TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          revoked_at TIMESTAMPTZ
        );
        CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user_id ON auth_refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_expires_at ON auth_refresh_tokens(expires_at);
        CREATE TABLE IF NOT EXISTS kunden (
${kundenColumns}
        );
        CREATE INDEX IF NOT EXISTS idx_kunden_created_at ON kunden(created_at);
        DROP TABLE IF EXISTS hunde;
        CREATE TABLE IF NOT EXISTS hunde (
          id ${uuidType} PRIMARY KEY${uuidDefault},
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          kunde_id ${kundenIdType} NOT NULL REFERENCES kunden(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          geburtsdatum DATE,
          rasse TEXT,
          notizen TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_hunde_kunde_id ON hunde(kunde_id);
        CREATE INDEX IF NOT EXISTS idx_hunde_created_at ON hunde(created_at);
        CREATE TABLE IF NOT EXISTS kurse (
          id ${uuidType} PRIMARY KEY${uuidDefault},
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
          id ${uuidType} PRIMARY KEY${uuidDefault},
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
        CREATE TABLE IF NOT EXISTS kalender_events (
          id ${uuidType} PRIMARY KEY${uuidDefault},
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          titel TEXT NOT NULL,
          beschreibung TEXT,
          start_at TIMESTAMPTZ NOT NULL,
          end_at TIMESTAMPTZ NOT NULL,
          ort TEXT,
          kunde_id ${kundenIdType} REFERENCES kunden(id) ON DELETE SET NULL,
          hund_id ${uuidType} REFERENCES hunde(id) ON DELETE SET NULL,
          status TEXT NOT NULL DEFAULT 'geplant' CHECK (status IN ('geplant','bestaetigt','abgesagt')),
          CHECK (end_at >= start_at)
        );
        CREATE INDEX IF NOT EXISTS idx_events_start ON kalender_events(start_at);
        CREATE INDEX IF NOT EXISTS idx_events_kunde ON kalender_events(kunde_id);
        CREATE INDEX IF NOT EXISTS idx_events_hund ON kalender_events(hund_id);
        CREATE TABLE IF NOT EXISTS kommunikation (
          id ${uuidType} PRIMARY KEY${uuidDefault},
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          kanal TEXT${isMemory ? '' : ' NOT NULL'},
          richtung TEXT${isMemory ? '' : ' NOT NULL'},
          betreff TEXT${isMemory ? '' : ' NOT NULL'},
          inhalt TEXT${isMemory ? '' : ' NOT NULL'},
          kunde_id ${kundenIdType} REFERENCES kunden(id) ON DELETE SET NULL,
          hund_id ${uuidType} REFERENCES hunde(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_kommunikation_kunde_id ON kommunikation(kunde_id);
        CREATE INDEX IF NOT EXISTS idx_kommunikation_hund_id ON kommunikation(hund_id);
        CREATE INDEX IF NOT EXISTS idx_kommunikation_kanal ON kommunikation(kanal);
        CREATE INDEX IF NOT EXISTS idx_kommunikation_created_at ON kommunikation(created_at);
      `);

      const schemaSql = statements.join('\n');

      if (this.mode === 'memory' && this.memoryDb) {
        const stripCreateExtension = (sql: string) =>
          sql
            .split('\n')
            .filter((line) => !/^\s*CREATE\s+EXTENSION\b/i.test(line))
            .join('\n');
        this.memoryDb.public.none(stripCreateExtension(schemaSql));
      } else {
        for (const statement of statements) {
          await pool.query(statement);
        }
      }
      logInfo(LogCode.LOG_DB_BOOTSTRAP_001);
    } catch (error) {
      this.bootstrapped = false;
      logError(ErrorCode.ERR_DB_BOOTSTRAP_001, error);
      throw error;
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
