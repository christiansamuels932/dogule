import {
  Finanz,
  FinanzCreateInput,
  FinanzListFilters,
  FinanzListResult,
  FinanzUpdateInput,
} from '../../../../../packages/domain';
import { logError, logInfo } from '@dogule/utils';
import { getDatabaseClient } from '../../infrastructure';
import type { DatabaseClient } from '../../infrastructure';

type Database = Pick<DatabaseClient, 'query'>;

interface FinanzRow {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
  datum: string | Date;
  typ: 'einnahme' | 'ausgabe';
  betrag_cents: number;
  kategorie: string | null;
  beschreibung: string | null;
  referenz: string | null;
}

const DEFAULT_LIMIT = 50;

const formatDate = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (value.includes('T')) {
    return new Date(value).toISOString().slice(0, 10);
  }

  return value;
};

const toIsoString = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
};

const buildFilters = (filters: Pick<FinanzListFilters, 'from' | 'to' | 'typ'>) => {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.from) {
    params.push(filters.from);
    conditions.push(`datum >= $${params.length}`);
  }

  if (filters.to) {
    params.push(filters.to);
    conditions.push(`datum <= $${params.length}`);
  }

  if (filters.typ) {
    params.push(filters.typ);
    conditions.push(`typ = $${params.length}`);
  }

  return { conditions, params };
};

export class FinanzenRepository {
  constructor(private readonly database: Database = getDatabaseClient()) {}

  private mapRow(row: FinanzRow): Finanz {
    return {
      id: row.id,
      createdAt: toIsoString(row.created_at),
      updatedAt: toIsoString(row.updated_at),
      datum: formatDate(row.datum),
      typ: row.typ,
      betragCents: row.betrag_cents,
      kategorie: row.kategorie ?? undefined,
      beschreibung: row.beschreibung ?? undefined,
      referenz: row.referenz ?? undefined,
    };
  }

  async create(data: FinanzCreateInput): Promise<Finanz> {
    try {
      const rows = await this.database.query<FinanzRow>({
        text: `
          INSERT INTO finanzen (datum, typ, betrag_cents, kategorie, beschreibung, referenz)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, created_at, updated_at, datum, typ, betrag_cents, kategorie, beschreibung, referenz
        `,
        params: [
          data.datum,
          data.typ,
          data.betragCents,
          data.kategorie ?? null,
          data.beschreibung ?? null,
          data.referenz ?? null,
        ],
      });

      const finanz = this.mapRow(rows[0]);
      logInfo('LOG_FINANZ_CREATE_001', finanz.id);
      return finanz;
    } catch (error) {
      logError('ERR_FINANZ_CREATE_001', error);
      throw new Error('ERR_FINANZ_CREATE_001');
    }
  }

  async findById(id: string): Promise<Finanz | undefined> {
    try {
      const rows = await this.database.query<FinanzRow>({
        text: `
          SELECT id, created_at, updated_at, datum, typ, betrag_cents, kategorie, beschreibung, referenz
          FROM finanzen
          WHERE id = $1
        `,
        params: [id],
      });

      const row = rows[0];
      return row ? this.mapRow(row) : undefined;
    } catch (error) {
      logError('ERR_FINANZ_READ_001', error);
      throw new Error('ERR_FINANZ_READ_001');
    }
  }

  async list(filters: FinanzListFilters = {}): Promise<FinanzListResult> {
    const { conditions, params } = buildFilters(filters);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    try {
      const rows = await this.database.query<FinanzRow>({
        text: `
          SELECT id, created_at, updated_at, datum, typ, betrag_cents, kategorie, beschreibung, referenz
          FROM finanzen
          ${whereClause}
          ORDER BY datum DESC, created_at DESC
          LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `,
        params: [...params, limit, offset],
      });

      const countRows = await this.database.query<{ count: number }>({
        text: `
          SELECT COUNT(*)::int AS count
          FROM finanzen
          ${whereClause}
        `,
        params,
      });

      return {
        data: rows.map((row) => this.mapRow(row)),
        total: countRows[0]?.count ?? 0,
        limit,
        offset,
      };
    } catch (error) {
      logError('ERR_FINANZ_READ_001', error);
      throw new Error('ERR_FINANZ_READ_001');
    }
  }

  async sum(filters: Pick<FinanzListFilters, 'from' | 'to' | 'typ'> = {}): Promise<number> {
    const { conditions, params } = buildFilters(filters);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const rows = await this.database.query<{ sum: number }>({
        text: `
          SELECT COALESCE(SUM(betrag_cents), 0)::int AS sum
          FROM finanzen
          ${whereClause}
        `,
        params,
      });

      return rows[0]?.sum ?? 0;
    } catch (error) {
      logError('ERR_FINANZ_SUM_001', error);
      throw new Error('ERR_FINANZ_SUM_001');
    }
  }

  async update(id: string, data: FinanzUpdateInput): Promise<Finanz | undefined> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.datum !== undefined) {
      params.push(data.datum);
      updates.push(`datum = $${params.length}`);
    }

    if (data.typ !== undefined) {
      params.push(data.typ);
      updates.push(`typ = $${params.length}`);
    }

    if (data.betragCents !== undefined) {
      params.push(data.betragCents);
      updates.push(`betrag_cents = $${params.length}`);
    }

    if (data.kategorie !== undefined) {
      params.push(data.kategorie ?? null);
      updates.push(`kategorie = $${params.length}`);
    }

    if (data.beschreibung !== undefined) {
      params.push(data.beschreibung ?? null);
      updates.push(`beschreibung = $${params.length}`);
    }

    if (data.referenz !== undefined) {
      params.push(data.referenz ?? null);
      updates.push(`referenz = $${params.length}`);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = now()`);
    params.push(id);

    try {
      const rows = await this.database.query<FinanzRow>({
        text: `
          UPDATE finanzen
          SET ${updates.join(', ')}
          WHERE id = $${params.length}
          RETURNING id, created_at, updated_at, datum, typ, betrag_cents, kategorie, beschreibung, referenz
        `,
        params,
      });

      const row = rows[0];
      if (!row) {
        return undefined;
      }

      const finanz = this.mapRow(row);
      logInfo('LOG_FINANZ_UPDATE_001', finanz.id);
      return finanz;
    } catch (error) {
      logError('ERR_FINANZ_UPDATE_001', error);
      throw new Error('ERR_FINANZ_UPDATE_001');
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const rows = await this.database.query<{ id: string }>({
        text: `
          DELETE FROM finanzen
          WHERE id = $1
          RETURNING id
        `,
        params: [id],
      });

      const deleted = rows.length > 0;
      if (deleted) {
        logInfo('LOG_FINANZ_DELETE_001', id);
      }

      return deleted;
    } catch (error) {
      logError('ERR_FINANZ_DELETE_001', error);
      throw new Error('ERR_FINANZ_DELETE_001');
    }
  }

  async count(): Promise<number> {
    try {
      const rows = await this.database.query<{ count: number }>({
        text: 'SELECT COUNT(*)::int AS count FROM finanzen',
      });

      return rows[0]?.count ?? 0;
    } catch (error) {
      logError('ERR_FINANZ_READ_001', error);
      throw new Error('ERR_FINANZ_READ_001');
    }
  }
}
