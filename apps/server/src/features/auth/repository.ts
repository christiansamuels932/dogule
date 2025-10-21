import { randomUUID } from 'crypto';

import { getDatabaseClient } from '../../infrastructure';

interface UserRow {
  id: string;
  email: string;
  hashed_password: string;
  role: string;
}

export interface UserRecord {
  id: string;
  email: string;
  hashedPassword: string;
  role: string;
}

export class AuthRepository {
  constructor(private readonly database = getDatabaseClient()) {}

  async createUser(email: string, hashedPassword: string, role: string): Promise<UserRecord> {
    const id = randomUUID();
    const rows = await this.database.query<UserRow>({
      text: `
        INSERT INTO users (id, email, hashed_password, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, hashed_password, role
      `,
      params: [id, email, hashedPassword, role],
    });

    return this.mapRow(rows[0]);
  }

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const rows = await this.database.query<UserRow>({
      text: `
        SELECT id, email, hashed_password, role
        FROM users
        WHERE email = $1
      `,
      params: [email],
    });

    const row = rows[0];
    return row ? this.mapRow(row) : undefined;
  }

  private mapRow(row: UserRow): UserRecord {
    return {
      id: row.id,
      email: row.email,
      hashedPassword: row.hashed_password,
      role: row.role,
    };
  }
}
