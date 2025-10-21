import { getDatabaseClient } from '../../infrastructure';
import type { DatabaseClient } from '../../infrastructure';
import type {
  Kurs,
  KursCreateInput,
  KursListQuery,
  KursListResult,
  KursStatus,
  KursUpdateInput,
} from './schemas';

interface KursRow {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
  titel: string;
  beschreibung: string | null;
  start_datum: string | Date;
  end_datum: string | Date | null;
  ort: string | null;
  preis_cents: number | string | null;
  max_teilnehmer: number | string | null;
  status: KursStatus;
}

interface KursCountRow {
  count: number | string;
}

type Database = Pick<DatabaseClient, 'query'>;

type KursFilters = Pick<KursListQuery, 'status' | 'from' | 'to'>;

export class KurseRepository {
  constructor(private readonly database: Database = getDatabaseClient()) {}

  async create(data: KursCreateInput): Promise<Kurs> {
    const payload: KursCreateInput = {
      preis_cents: 0,
      max_teilnehmer: 0,
      status: 'geplant',
      ...data,
    };

    try {
      const rows = await this.database.query<KursRow>({
        text: `
          INSERT INTO kurse (
            titel,
            beschreibung,
            start_datum,
            end_datum,
            ort,
            preis_cents,
            max_teilnehmer,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, created_at, updated_at, titel, beschreibung, start_datum, end_datum, ort,
            preis_cents, max_teilnehmer, status
        `,
        params: [
          payload.titel,
          payload.beschreibung ?? null,
          payload.start_datum,
          payload.end_datum ?? null,
          payload.ort ?? null,
          payload.preis_cents,
          payload.max_teilnehmer,
          payload.status,
        ],
      });

      const kurs = this.mapRow(rows[0]);
      console.info('LOG_KURSE_CREATE_001', kurs.id);
      return kurs;
    } catch (error) {
      console.error('ERR_KURSE_CREATE_001', error);
      throw new Error('ERR_KURSE_CREATE_001');
    }
  }

  async findById(id: string): Promise<Kurs | undefined> {
    try {
      const rows = await this.database.query<KursRow>({
        text: `
          SELECT id, created_at, updated_at, titel, beschreibung, start_datum, end_datum, ort,
            preis_cents, max_teilnehmer, status
          FROM kurse
          WHERE id = $1
        `,
        params: [id],
      });

      const row = rows[0];
      return row ? this.mapRow(row) : undefined;
    } catch (error) {
      console.error('ERR_KURSE_READ_001', error);
      throw new Error('ERR_KURSE_READ_001');
    }
  }

  async list(query: KursListQuery): Promise<KursListResult> {
    const { limit, offset, ...filters } = query;
    const { whereClause, params } = this.buildFilters(filters);

    try {
      const [totalRows, kursRows] = await Promise.all([
        this.database.query<KursCountRow>({
          text: `SELECT COUNT(*)::int AS count FROM kurse ${whereClause}`,
          params,
        }),
        this.database.query<KursRow>({
          text: `
            SELECT id, created_at, updated_at, titel, beschreibung, start_datum, end_datum, ort,
              preis_cents, max_teilnehmer, status
            FROM kurse
            ${whereClause}
            ORDER BY start_datum ASC, created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
          `,
          params: [...params, limit, offset],
        }),
      ]);

      const total = this.toNumber(totalRows[0]?.count ?? 0);

      return {
        data: kursRows.map((row) => this.mapRow(row)),
        total,
        limit,
        offset,
      };
    } catch (error) {
      console.error('ERR_KURSE_LIST_001', error);
      throw new Error('ERR_KURSE_LIST_001');
    }
  }

  async update(id: string, data: KursUpdateInput): Promise<Kurs | undefined> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let index = 1;

    if (data.titel !== undefined) {
      updates.push(`titel = $${index}`);
      params.push(data.titel);
      index += 1;
    }

    if (data.beschreibung !== undefined) {
      updates.push(`beschreibung = $${index}`);
      params.push(data.beschreibung ?? null);
      index += 1;
    }

    if (data.start_datum !== undefined) {
      updates.push(`start_datum = $${index}`);
      params.push(data.start_datum);
      index += 1;
    }

    if (data.end_datum !== undefined) {
      updates.push(`end_datum = $${index}`);
      params.push(data.end_datum ?? null);
      index += 1;
    }

    if (data.ort !== undefined) {
      updates.push(`ort = $${index}`);
      params.push(data.ort ?? null);
      index += 1;
    }

    if (data.preis_cents !== undefined) {
      updates.push(`preis_cents = $${index}`);
      params.push(data.preis_cents);
      index += 1;
    }

    if (data.max_teilnehmer !== undefined) {
      updates.push(`max_teilnehmer = $${index}`);
      params.push(data.max_teilnehmer);
      index += 1;
    }

    if (data.status !== undefined) {
      updates.push(`status = $${index}`);
      params.push(data.status);
      index += 1;
    }

    updates.push('updated_at = now()');

    try {
      const rows = await this.database.query<KursRow>({
        text: `
          UPDATE kurse
          SET ${updates.join(', ')}
          WHERE id = $${index}
          RETURNING id, created_at, updated_at, titel, beschreibung, start_datum, end_datum, ort,
            preis_cents, max_teilnehmer, status
        `,
        params: [...params, id],
      });

      const row = rows[0];
      if (!row) {
        return undefined;
      }

      const kurs = this.mapRow(row);
      console.info('LOG_KURSE_UPDATE_001', kurs.id);
      return kurs;
    } catch (error) {
      console.error('ERR_KURSE_UPDATE_001', error);
      throw new Error('ERR_KURSE_UPDATE_001');
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const rows = await this.database.query<{ id: string }>({
        text: `
          DELETE FROM kurse
          WHERE id = $1
          RETURNING id
        `,
        params: [id],
      });

      const deleted = rows.length > 0;
      if (deleted) {
        console.info('LOG_KURSE_DELETE_001', id);
      }

      return deleted;
    } catch (error) {
      console.error('ERR_KURSE_DELETE_001', error);
      throw new Error('ERR_KURSE_DELETE_001');
    }
  }

  async count(filter: { status?: KursStatus } = {}): Promise<number> {
    const { whereClause, params } = this.buildFilters(filter);

    try {
      const rows = await this.database.query<KursCountRow>({
        text: `SELECT COUNT(*)::int AS count FROM kurse ${whereClause}`,
        params,
      });

      return this.toNumber(rows[0]?.count ?? 0);
    } catch (error) {
      console.error('ERR_KURSE_COUNT_001', error);
      throw new Error('ERR_KURSE_COUNT_001');
    }
  }

  private buildFilters(filters: KursFilters | { status?: KursStatus }): {
    whereClause: string;
    params: unknown[];
  } {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      clauses.push(`status = $${params.length + 1}`);
      params.push(filters.status);
    }

    if ('from' in filters && filters.from) {
      clauses.push(`start_datum >= $${params.length + 1}`);
      params.push(filters.from);
    }

    if ('to' in filters && filters.to) {
      clauses.push(`start_datum <= $${params.length + 1}`);
      params.push(filters.to);
    }

    if (clauses.length === 0) {
      return { whereClause: '', params };
    }

    return { whereClause: `WHERE ${clauses.join(' AND ')}`, params };
  }

  private mapRow(row: KursRow): Kurs {
    return {
      id: row.id,
      created_at: this.toIsoString(row.created_at),
      updated_at: this.toIsoString(row.updated_at),
      titel: row.titel,
      beschreibung: row.beschreibung ?? undefined,
      start_datum: this.toDateString(row.start_datum),
      end_datum: row.end_datum ? this.toDateString(row.end_datum) : undefined,
      ort: row.ort ?? undefined,
      preis_cents: this.toNumber(row.preis_cents ?? 0),
      max_teilnehmer: this.toNumber(row.max_teilnehmer ?? 0),
      status: row.status,
    };
  }

  private toNumber(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    return 0;
  }

  private toIsoString(value: string | Date): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      const fallback = new Date(`${value}Z`);
      return Number.isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
    }

    return date.toISOString();
  }

  private toDateString(value: string | Date): string {
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toISOString().slice(0, 10);
  }
}
