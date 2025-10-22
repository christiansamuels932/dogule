import { logError, logInfo } from '@dogule/utils';

import {
  ErrorCode,
  LogCode,
  type Kommunikation,
  type KommunikationCreateInput,
  type KommunikationListFilters,
  type KommunikationListResult,
  type KommunikationUpdateInput,
} from '@dogule/domain';
import { getDatabaseClient } from '../../infrastructure';
import type { DatabaseClient } from '../../infrastructure';

interface KommunikationRow {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
  kanal: string;
  richtung: string;
  betreff: string;
  inhalt: string;
  kunde_id: string | null;
  hund_id: string | null;
}

type Database = Pick<DatabaseClient, 'query'>;

const ensureIsoDate = (value: string | Date): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
};

const ensureDateOnlyIso = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString();
};

export class KommunikationRepository {
  constructor(private readonly database: Database = getDatabaseClient()) {}

  async create(data: KommunikationCreateInput): Promise<Kommunikation> {
    try {
      const rows = await this.database.query<KommunikationRow>({
        text: `
          INSERT INTO kommunikation (kanal, richtung, betreff, inhalt, kunde_id, hund_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, created_at, updated_at, kanal, richtung, betreff, inhalt, kunde_id, hund_id
        `,
        params: [
          data.kanal,
          data.richtung,
          data.betreff,
          data.inhalt,
          data.kundeId ?? null,
          data.hundId ?? null,
        ],
      });

      const eintrag = this.mapRow(rows[0]);
      logInfo(LogCode.LOG_KOMM_CREATE_001, eintrag.id);
      return eintrag;
    } catch (error) {
      logError(ErrorCode.ERR_KOMM_CREATE_001, error);
      throw new Error(ErrorCode.ERR_KOMM_CREATE_001);
    }
  }

  async findById(id: string): Promise<Kommunikation | undefined> {
    try {
      const rows = await this.database.query<KommunikationRow>({
        text: `
          SELECT id, created_at, updated_at, kanal, richtung, betreff, inhalt, kunde_id, hund_id
          FROM kommunikation
          WHERE id = $1
        `,
        params: [id],
      });

      const row = rows[0];
      return row ? this.mapRow(row) : undefined;
    } catch (error) {
      logError(ErrorCode.ERR_KOMM_READ_001, error);
      throw new Error(ErrorCode.ERR_KOMM_READ_001);
    }
  }

  async list(filters: KommunikationListFilters & { limit: number; offset: number }): Promise<KommunikationListResult> {
    const whereFragments: string[] = [];
    const params: unknown[] = [];

    if (filters.kundeId) {
      whereFragments.push(`kunde_id = $${params.length + 1}`);
      params.push(filters.kundeId);
    }

    if (filters.hundId) {
      whereFragments.push(`hund_id = $${params.length + 1}`);
      params.push(filters.hundId);
    }

    if (filters.kanal) {
      whereFragments.push(`kanal = $${params.length + 1}`);
      params.push(filters.kanal);
    }

    const fromIso = ensureDateOnlyIso(filters.from);
    if (fromIso) {
      whereFragments.push(`created_at >= $${params.length + 1}`);
      params.push(fromIso);
    }

    const toIso = ensureDateOnlyIso(filters.to);
    if (toIso) {
      whereFragments.push(`created_at <= $${params.length + 1}`);
      params.push(toIso);
    }

    const whereClause = whereFragments.length > 0 ? `WHERE ${whereFragments.join(' AND ')}` : '';

    try {
      const rows = await this.database.query<KommunikationRow>({
        text: `
          SELECT id, created_at, updated_at, kanal, richtung, betreff, inhalt, kunde_id, hund_id
          FROM kommunikation
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${params.length + 1}
          OFFSET $${params.length + 2}
        `,
        params: [...params, filters.limit, filters.offset],
      });

      const countRows = await this.database.query<{ count: number }>({
        text: `
          SELECT COUNT(*)::int AS count
          FROM kommunikation
          ${whereClause}
        `,
        params,
      });

      return {
        data: rows.map((row) => this.mapRow(row)),
        total: countRows[0]?.count ?? 0,
        limit: filters.limit,
        offset: filters.offset,
      };
    } catch (error) {
      logError(ErrorCode.ERR_KOMM_READ_001, error);
      throw new Error(ErrorCode.ERR_KOMM_READ_001);
    }
  }

  async update(id: string, data: KommunikationUpdateInput): Promise<Kommunikation | undefined> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let index = 1;

    if (data.kanal !== undefined) {
      updates.push(`kanal = $${index}`);
      params.push(data.kanal);
      index += 1;
    }

    if (data.richtung !== undefined) {
      updates.push(`richtung = $${index}`);
      params.push(data.richtung);
      index += 1;
    }

    if (data.betreff !== undefined) {
      updates.push(`betreff = $${index}`);
      params.push(data.betreff);
      index += 1;
    }

    if (data.inhalt !== undefined) {
      updates.push(`inhalt = $${index}`);
      params.push(data.inhalt);
      index += 1;
    }

    if (data.kundeId !== undefined) {
      updates.push(`kunde_id = $${index}`);
      params.push(data.kundeId ?? null);
      index += 1;
    }

    if (data.hundId !== undefined) {
      updates.push(`hund_id = $${index}`);
      params.push(data.hundId ?? null);
      index += 1;
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    const setClause = `${updates.join(', ')}, updated_at = now()`;

    try {
      const rows = await this.database.query<KommunikationRow>({
        text: `
          UPDATE kommunikation
          SET ${setClause}
          WHERE id = $${index}
          RETURNING id, created_at, updated_at, kanal, richtung, betreff, inhalt, kunde_id, hund_id
        `,
        params: [...params, id],
      });

      const row = rows[0];
      if (!row) {
        return undefined;
      }

      const eintrag = this.mapRow(row);
      logInfo(LogCode.LOG_KOMM_UPDATE_001, eintrag.id);
      return eintrag;
    } catch (error) {
      logError(ErrorCode.ERR_KOMM_UPDATE_001, error);
      throw new Error(ErrorCode.ERR_KOMM_UPDATE_001);
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const rows = await this.database.query<{ id: string }>({
        text: `
          DELETE FROM kommunikation
          WHERE id = $1
          RETURNING id
        `,
        params: [id],
      });

      const deleted = rows.length > 0;
      if (deleted) {
        logInfo(LogCode.LOG_KOMM_DELETE_001, id);
      }

      return deleted;
    } catch (error) {
      logError(ErrorCode.ERR_KOMM_DELETE_001, error);
      throw new Error(ErrorCode.ERR_KOMM_DELETE_001);
    }
  }

  async count(): Promise<number> {
    try {
      const rows = await this.database.query<{ count: number }>({
        text: 'SELECT COUNT(*)::int AS count FROM kommunikation',
      });

      return rows[0]?.count ?? 0;
    } catch (error) {
      logError(ErrorCode.ERR_KOMM_READ_001, error);
      throw new Error(ErrorCode.ERR_KOMM_READ_001);
    }
  }

  private mapRow(row: KommunikationRow): Kommunikation {
    return {
      id: row.id,
      kanal: row.kanal,
      richtung: row.richtung as Kommunikation['richtung'],
      betreff: row.betreff,
      inhalt: row.inhalt,
      kundeId: row.kunde_id ?? undefined,
      hundId: row.hund_id ?? undefined,
      createdAt: ensureIsoDate(row.created_at),
      updatedAt: ensureIsoDate(row.updated_at),
    };
  }
}
