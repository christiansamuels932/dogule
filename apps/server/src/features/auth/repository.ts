import { randomUUID } from 'node:crypto';

import { getDatabaseClient } from '../../infrastructure';

interface UserRow {
  id: string;
  email: string;
  hashed_password: string;
  role: string;
}

interface RefreshTokenRow {
  id: string;
  user_id: string;
  hashed_token: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
}

export interface UserRecord {
  id: string;
  email: string;
  hashedPassword: string;
  role: string;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  hashedToken: string;
  expiresAt: Date;
  revokedAt: Date | null;
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

    return this.mapUserRow(rows[0]);
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
    return row ? this.mapUserRow(row) : undefined;
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    const rows = await this.database.query<UserRow>({
      text: `
        SELECT id, email, hashed_password, role
        FROM users
        WHERE id = $1
      `,
      params: [id],
    });

    const row = rows[0];
    return row ? this.mapUserRow(row) : undefined;
  }

  async createRefreshToken(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<RefreshTokenRecord> {
    const id = randomUUID();
    const rows = await this.database.query<RefreshTokenRow>({
      text: `
        INSERT INTO auth_refresh_tokens (id, user_id, hashed_token, expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, hashed_token, expires_at, revoked_at
      `,
      params: [id, userId, hashedToken, expiresAt],
    });

    return this.mapRefreshTokenRow(rows[0]);
  }

  async findRefreshTokenByHash(hashedToken: string): Promise<RefreshTokenRecord | undefined> {
    const rows = await this.database.query<RefreshTokenRow>({
      text: `
        SELECT id, user_id, hashed_token, expires_at, revoked_at
        FROM auth_refresh_tokens
        WHERE hashed_token = $1
      `,
      params: [hashedToken],
    });

    const row = rows[0];
    return row ? this.mapRefreshTokenRow(row) : undefined;
  }

  async revokeRefreshToken(id: string, revokedAt = new Date()): Promise<void> {
    await this.database.query({
      text: `
        UPDATE auth_refresh_tokens
        SET revoked_at = $2
        WHERE id = $1
      `,
      params: [id, revokedAt],
    });
  }

  async revokeRefreshTokensByUser(userId: string, revokedAt = new Date()): Promise<void> {
    await this.database.query({
      text: `
        UPDATE auth_refresh_tokens
        SET revoked_at = $2
        WHERE user_id = $1 AND revoked_at IS NULL
      `,
      params: [userId, revokedAt],
    });
  }

  private mapUserRow(row: UserRow): UserRecord {
    return {
      id: row.id,
      email: row.email,
      hashedPassword: row.hashed_password,
      role: row.role,
    };
  }

  private mapRefreshTokenRow(row: RefreshTokenRow): RefreshTokenRecord {
    return {
      id: row.id,
      userId: row.user_id,
      hashedToken: row.hashed_token,
      expiresAt: row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at),
      revokedAt:
        row.revoked_at instanceof Date || row.revoked_at === null
          ? row.revoked_at
          : new Date(row.revoked_at),
    };
  }
}
