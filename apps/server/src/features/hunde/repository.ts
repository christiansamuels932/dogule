import { Dog, DogCreateInput } from '../../../../../packages/domain';
import { getDatabaseClient } from '../../infrastructure';
import type { DatabaseClient } from '../../infrastructure';

interface HundRow {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
  kunde_id: string;
  name: string;
  geburtsdatum: string | Date | null;
  rasse: string | null;
  notizen: string | null;
}

type Database = Pick<DatabaseClient, 'query'>;

export class HundeRepository {
  constructor(private readonly database: Database = getDatabaseClient()) {}

  async create(data: DogCreateInput): Promise<Dog> {
    try {
      const rows = await this.database.query<HundRow>({
        text: `
          INSERT INTO hunde (kunde_id, name, geburtsdatum, rasse, notizen)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, created_at, updated_at, kunde_id, name, geburtsdatum, rasse, notizen
        `,
        params: [
          data.kundeId,
          data.name,
          data.geburtsdatum ?? null,
          data.rasse ?? null,
          data.notizen ?? null,
        ],
      });

      const hund = this.mapRow(rows[0]);
      console.info('LOG_HUNDE_CREATE_001', hund.id);
      return hund;
    } catch (error) {
      console.error('ERR_HUNDE_CREATE_001', error);
      throw new Error('ERR_HUNDE_CREATE_001');
    }
  }

  async findById(id: string): Promise<Dog | undefined> {
    try {
      const rows = await this.database.query<HundRow>({
        text: `
          SELECT id, created_at, updated_at, kunde_id, name, geburtsdatum, rasse, notizen
          FROM hunde
          WHERE id = $1
        `,
        params: [id],
      });

      const row = rows[0];
      return row ? this.mapRow(row) : undefined;
    } catch (error) {
      console.error('ERR_HUNDE_READ_001', error);
      throw new Error('ERR_HUNDE_READ_001');
    }
  }

  async list({
    limit,
    offset,
    kundeId,
  }: {
    limit: number;
    offset: number;
    kundeId?: string;
  }): Promise<{ data: Dog[]; total: number; limit: number; offset: number }> {
    try {
      const filterClauses: string[] = [];
      const filterParams: unknown[] = [];

      if (kundeId) {
        filterClauses.push(`kunde_id = $${filterParams.length + 1}`);
        filterParams.push(kundeId);
      }

      const whereClause = filterClauses.length > 0 ? `WHERE ${filterClauses.join(' AND ')}` : '';
      const rows = await this.database.query<HundRow>({
        text: `
          SELECT id, created_at, updated_at, kunde_id, name, geburtsdatum, rasse, notizen
          FROM hunde
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}
        `,
        params: [...filterParams, limit, offset],
      });

      const countRows = await this.database.query<{ count: number }>({
        text: `
          SELECT COUNT(*)::int AS count
          FROM hunde
          ${whereClause}
        `,
        params: filterParams,
      });

      return {
        data: rows.map((row) => this.mapRow(row)),
        total: countRows[0]?.count ?? 0,
        limit,
        offset,
      };
    } catch (error) {
      console.error('ERR_HUNDE_READ_001', error);
      throw new Error('ERR_HUNDE_READ_001');
    }
  }

  async update(id: string, data: Partial<DogCreateInput>): Promise<Dog | undefined> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let index = 1;

    if (data.kundeId !== undefined) {
      updates.push(`kunde_id = $${index}`);
      params.push(data.kundeId);
      index += 1;
    }

    if (data.name !== undefined) {
      updates.push(`name = $${index}`);
      params.push(data.name);
      index += 1;
    }

    if (data.geburtsdatum !== undefined) {
      updates.push(`geburtsdatum = $${index}`);
      params.push(data.geburtsdatum ?? null);
      index += 1;
    }

    if (data.rasse !== undefined) {
      updates.push(`rasse = $${index}`);
      params.push(data.rasse ?? null);
      index += 1;
    }

    if (data.notizen !== undefined) {
      updates.push(`notizen = $${index}`);
      params.push(data.notizen ?? null);
      index += 1;
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    const setClause = `${updates.join(', ')}, updated_at = now()`;

    try {
      const rows = await this.database.query<HundRow>({
        text: `
          UPDATE hunde
          SET ${setClause}
          WHERE id = $${index}
          RETURNING id, created_at, updated_at, kunde_id, name, geburtsdatum, rasse, notizen
        `,
        params: [...params, id],
      });

      const row = rows[0];
      if (!row) {
        return undefined;
      }

      const hund = this.mapRow(row);
      console.info('LOG_HUNDE_UPDATE_001', hund.id);
      return hund;
    } catch (error) {
      console.error('ERR_HUNDE_UPDATE_001', error);
      throw new Error('ERR_HUNDE_UPDATE_001');
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const rows = await this.database.query<{ id: string }>({
        text: `
          DELETE FROM hunde
          WHERE id = $1
          RETURNING id
        `,
        params: [id],
      });

      const deleted = rows.length > 0;
      if (deleted) {
        console.info('LOG_HUNDE_DELETE_001', id);
      }

      return deleted;
    } catch (error) {
      console.error('ERR_HUNDE_DELETE_001', error);
      throw new Error('ERR_HUNDE_DELETE_001');
    }
  }

  async count(): Promise<number> {
    try {
      const rows = await this.database.query<{ count: number }>({
        text: 'SELECT COUNT(*)::int AS count FROM hunde',
      });

      return rows[0]?.count ?? 0;
    } catch (error) {
      console.error('ERR_HUNDE_READ_001', error);
      throw new Error('ERR_HUNDE_READ_001');
    }
  }

  private mapRow(row: HundRow): Dog {
    const createdAt = this.toIsoString(row.created_at);
    const updatedAt = this.toIsoString(row.updated_at);
    const geburtsdatum = this.toDateOnly(row.geburtsdatum);

    return {
      id: row.id,
      kundeId: row.kunde_id,
      name: row.name,
      geburtsdatum: geburtsdatum ?? undefined,
      rasse: row.rasse ?? undefined,
      notizen: row.notizen ?? undefined,
      createdAt,
      updatedAt,
    };
  }

  private toIsoString(value: string | Date): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return new Date(value).toISOString();
  }

  private toDateOnly(value: string | Date | null): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    return new Date(value).toISOString().slice(0, 10);
  }
}
