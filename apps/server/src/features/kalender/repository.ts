import {
  ErrorCode,
  KalenderEvent,
  KalenderEventCreateInput,
  KalenderEventUpdateInput,
  KalenderListFilters,
  KalenderListResult,
  LogCode,
} from '@dogule/domain';
import { logError, logInfo } from '@dogule/utils';

import { getDatabaseClient } from '../../infrastructure';
import type { DatabaseClient } from '../../infrastructure';

interface KalenderEventRow {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
  titel: string;
  beschreibung: string | null;
  start_at: string | Date;
  end_at: string | Date;
  ort: string | null;
  kunde_id: string | null;
  hund_id: string | null;
  status: 'geplant' | 'bestaetigt' | 'abgesagt';
}

type Database = Pick<DatabaseClient, 'query'>;

const DEFAULT_LIMIT = 50;

const toIsoString = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
};

const buildFilters = (filters: Pick<KalenderListFilters, 'from' | 'to' | 'kundeId' | 'hundId'>) => {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.from) {
    params.push(filters.from);
    conditions.push(`start_at >= $${params.length}`);
  }

  if (filters.to) {
    params.push(filters.to);
    conditions.push(`start_at <= $${params.length}`);
  }

  if (filters.kundeId) {
    params.push(filters.kundeId);
    conditions.push(`kunde_id = $${params.length}`);
  }

  if (filters.hundId) {
    params.push(filters.hundId);
    conditions.push(`hund_id = $${params.length}`);
  }

  return { conditions, params };
};

export class KalenderRepository {
  constructor(private readonly database: Database = getDatabaseClient()) {}

  private mapRow(row: KalenderEventRow): KalenderEvent {
    return {
      id: row.id,
      createdAt: toIsoString(row.created_at),
      updatedAt: toIsoString(row.updated_at),
      titel: row.titel,
      beschreibung: row.beschreibung ?? undefined,
      startAt: toIsoString(row.start_at),
      endAt: toIsoString(row.end_at),
      ort: row.ort ?? undefined,
      kundeId: row.kunde_id ?? undefined,
      hundId: row.hund_id ?? undefined,
      status: row.status,
    };
  }

  async create(data: KalenderEventCreateInput): Promise<KalenderEvent> {
    try {
      const rows = await this.database.query<KalenderEventRow>({
        text: `
          INSERT INTO kalender_events (titel, beschreibung, start_at, end_at, ort, kunde_id, hund_id, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, created_at, updated_at, titel, beschreibung, start_at, end_at, ort, kunde_id, hund_id, status
        `,
        params: [
          data.titel,
          data.beschreibung ?? null,
          data.startAt,
          data.endAt,
          data.ort ?? null,
          data.kundeId ?? null,
          data.hundId ?? null,
          data.status ?? 'geplant',
        ],
      });

      const event = this.mapRow(rows[0]);
      logInfo(LogCode.LOG_KALENDER_CREATE_001, event.id);
      return event;
    } catch (error) {
      logError(ErrorCode.ERR_KALENDER_CREATE_001, error);
      throw new Error(ErrorCode.ERR_KALENDER_CREATE_001);
    }
  }

  async findById(id: string): Promise<KalenderEvent | undefined> {
    try {
      const rows = await this.database.query<KalenderEventRow>({
        text: `
          SELECT id, created_at, updated_at, titel, beschreibung, start_at, end_at, ort, kunde_id, hund_id, status
          FROM kalender_events
          WHERE id = $1
        `,
        params: [id],
      });

      const row = rows[0];
      return row ? this.mapRow(row) : undefined;
    } catch (error) {
      logError(ErrorCode.ERR_KALENDER_READ_001, error);
      throw new Error(ErrorCode.ERR_KALENDER_READ_001);
    }
  }

  async list(filters: KalenderListFilters = {}): Promise<KalenderListResult> {
    const { conditions, params } = buildFilters(filters);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;

    try {
      const rows = await this.database.query<KalenderEventRow>({
        text: `
          SELECT id, created_at, updated_at, titel, beschreibung, start_at, end_at, ort, kunde_id, hund_id, status
          FROM kalender_events
          ${whereClause}
          ORDER BY start_at ASC, created_at DESC
          LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `,
        params: [...params, limit, offset],
      });

      const countRows = await this.database.query<{ count: number }>({
        text: `
          SELECT COUNT(*)::int AS count
          FROM kalender_events
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
      logError(ErrorCode.ERR_KALENDER_LIST_001, error);
      throw new Error(ErrorCode.ERR_KALENDER_LIST_001);
    }
  }

  async update(id: string, data: KalenderEventUpdateInput): Promise<KalenderEvent | undefined> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.titel !== undefined) {
      params.push(data.titel);
      updates.push(`titel = $${params.length}`);
    }

    if (data.beschreibung !== undefined) {
      params.push(data.beschreibung ?? null);
      updates.push(`beschreibung = $${params.length}`);
    }

    if (data.startAt !== undefined) {
      params.push(data.startAt);
      updates.push(`start_at = $${params.length}`);
    }

    if (data.endAt !== undefined) {
      params.push(data.endAt);
      updates.push(`end_at = $${params.length}`);
    }

    if (data.ort !== undefined) {
      params.push(data.ort ?? null);
      updates.push(`ort = $${params.length}`);
    }

    if (data.kundeId !== undefined) {
      params.push(data.kundeId ?? null);
      updates.push(`kunde_id = $${params.length}`);
    }

    if (data.hundId !== undefined) {
      params.push(data.hundId ?? null);
      updates.push(`hund_id = $${params.length}`);
    }

    if (data.status !== undefined) {
      params.push(data.status);
      updates.push(`status = $${params.length}`);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    const idIndex = params.length + 1;
    const setClause = [...updates, `updated_at = now()`].join(', ');

    try {
      const rows = await this.database.query<KalenderEventRow>({
        text: `
          UPDATE kalender_events
          SET ${setClause}
          WHERE id = $${idIndex}
          RETURNING id, created_at, updated_at, titel, beschreibung, start_at, end_at, ort, kunde_id, hund_id, status
        `,
        params: [...params, id],
      });

      const row = rows[0];
      if (!row) {
        return undefined;
      }

      const event = this.mapRow(row);
      logInfo(LogCode.LOG_KALENDER_UPDATE_001, id);
      return event;
    } catch (error) {
      logError(ErrorCode.ERR_KALENDER_UPDATE_001, error);
      throw new Error(ErrorCode.ERR_KALENDER_UPDATE_001);
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const rows = await this.database.query<{ id: string }>({
        text: `
          DELETE FROM kalender_events
          WHERE id = $1
          RETURNING id
        `,
        params: [id],
      });

      const removed = rows.length > 0;
      if (removed) {
        logInfo(LogCode.LOG_KALENDER_DELETE_001, id);
      }

      return removed;
    } catch (error) {
      logError(ErrorCode.ERR_KALENDER_DELETE_001, error);
      throw new Error(ErrorCode.ERR_KALENDER_DELETE_001);
    }
  }

  async count(filters: Pick<KalenderListFilters, 'from' | 'to'> = {}): Promise<number> {
    const { conditions, params } = buildFilters({
      from: filters.from,
      to: filters.to,
      kundeId: undefined,
      hundId: undefined,
    });
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const rows = await this.database.query<{ count: number }>({
        text: `
          SELECT COUNT(*)::int AS count
          FROM kalender_events
          ${whereClause}
        `,
        params,
      });

      return rows[0]?.count ?? 0;
    } catch (error) {
      logError(ErrorCode.ERR_KALENDER_COUNT_001, error);
      throw new Error(ErrorCode.ERR_KALENDER_COUNT_001);
    }
  }
}
