import { logError, logInfo } from '@dogule/utils';

import { Customer, CustomerCreateInput, ErrorCode, LogCode } from '@dogule/domain';
import { getDatabaseClient } from '../../infrastructure';
import type { DatabaseClient } from '../../infrastructure';

interface KundenRow {
  id: string;
  created_at: string | Date;
  updated_at: string | Date;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
}

type Database = Pick<DatabaseClient, 'query'>;

export class KundenRepository {
  constructor(private readonly database: Database = getDatabaseClient()) {}

  async create(data: CustomerCreateInput): Promise<Customer> {
    try {
      const rows = await this.database.query<KundenRow>({
        text: `
          INSERT INTO kunden (first_name, last_name, email, phone)
          VALUES ($1, $2, $3, $4)
          RETURNING id, created_at, updated_at, first_name, last_name, email, phone, notes
        `,
        params: [data.firstName, data.lastName, data.email, data.phone ?? null],
      });

      const customer = this.mapRow(rows[0]);
      logInfo(LogCode.LOG_KUNDEN_CREATE_001, customer.id);
      return customer;
    } catch (error) {
      logError(ErrorCode.ERR_KUNDEN_CREATE_001, error);
      throw new Error(ErrorCode.ERR_KUNDEN_CREATE_001);
    }
  }

  async findById(id: string): Promise<Customer | undefined> {
    try {
      const rows = await this.database.query<KundenRow>({
        text: `
          SELECT id, created_at, updated_at, first_name, last_name, email, phone, notes
          FROM kunden
          WHERE id = $1
        `,
        params: [id],
      });

      const row = rows[0];
      return row ? this.mapRow(row) : undefined;
    } catch (error) {
      logError(ErrorCode.ERR_KUNDEN_READ_001, error);
      throw new Error(ErrorCode.ERR_KUNDEN_READ_001);
    }
  }

  async list({ limit, offset }: { limit: number; offset: number }): Promise<Customer[]> {
    try {
      const rows = await this.database.query<KundenRow>({
        text: `
          SELECT id, created_at, updated_at, first_name, last_name, email, phone, notes
          FROM kunden
          ORDER BY created_at DESC
          LIMIT $1 OFFSET $2
        `,
        params: [limit, offset],
      });

      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logError(ErrorCode.ERR_KUNDEN_READ_001, error);
      throw new Error(ErrorCode.ERR_KUNDEN_READ_001);
    }
  }

  async update(
    id: string,
    data: Partial<CustomerCreateInput>,
  ): Promise<Customer | undefined> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let index = 1;

    if (data.firstName !== undefined) {
      updates.push(`first_name = $${index}`);
      params.push(data.firstName);
      index += 1;
    }

    if (data.lastName !== undefined) {
      updates.push(`last_name = $${index}`);
      params.push(data.lastName);
      index += 1;
    }

    if (data.email !== undefined) {
      updates.push(`email = $${index}`);
      params.push(data.email);
      index += 1;
    }

    if (data.phone !== undefined) {
      updates.push(`phone = $${index}`);
      params.push(data.phone ?? null);
      index += 1;
    }

    const setClause = [...updates, 'updated_at = now()'].join(', ');

    try {
      const rows = await this.database.query<KundenRow>({
        text: `
          UPDATE kunden
          SET ${setClause}
          WHERE id = $${index}
          RETURNING id, created_at, updated_at, first_name, last_name, email, phone, notes
        `,
        params: [...params, id],
      });

      const row = rows[0];
      if (!row) {
        return undefined;
      }

      const customer = this.mapRow(row);
      logInfo(LogCode.LOG_KUNDEN_UPDATE_001, customer.id);
      return customer;
    } catch (error) {
      logError(ErrorCode.ERR_KUNDEN_UPDATE_001, error);
      throw new Error(ErrorCode.ERR_KUNDEN_UPDATE_001);
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      const rows = await this.database.query<{ id: string }>({
        text: `
          DELETE FROM kunden
          WHERE id = $1
          RETURNING id
        `,
        params: [id],
      });

      const deleted = rows.length > 0;
      if (deleted) {
        logInfo(LogCode.LOG_KUNDEN_DELETE_001, id);
      }

      return deleted;
    } catch (error) {
      logError(ErrorCode.ERR_KUNDEN_DELETE_001, error);
      throw new Error(ErrorCode.ERR_KUNDEN_DELETE_001);
    }
  }

  async count(): Promise<number> {
    try {
      const rows = await this.database.query<{ count: number }>({
        text: 'SELECT COUNT(*)::int AS count FROM kunden',
      });

      return rows[0]?.count ?? 0;
    } catch (error) {
      logError(ErrorCode.ERR_KUNDEN_READ_001, error);
      throw new Error(ErrorCode.ERR_KUNDEN_READ_001);
    }
  }

  private mapRow(row: KundenRow): Customer {
    const createdAt = this.toIsoString(row.created_at);
    const updatedAt = this.toIsoString(row.updated_at);

    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone ?? undefined,
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
}
