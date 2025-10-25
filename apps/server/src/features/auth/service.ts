import { createHash, randomBytes, randomUUID } from 'node:crypto';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { ErrorCode, LogCode } from '@dogule/domain';
import { logError, logInfo } from '@dogule/utils';

import { loadConfig } from '../../infrastructure';
import { AuthRepository, UserRecord } from './repository';
import { LoginInput, RegisterInput } from './schemas';

const SALT_ROUNDS = 10;
const DEFAULT_REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const REFRESH_COOKIE_NAME = 'refreshToken';

export interface AuthResult {
  token: string;
  user: Pick<UserRecord, 'id' | 'email' | 'role'>;
  refresh: {
    token: string;
    expiresAt: Date;
  };
}

export class AuthService {
  constructor(
    private readonly repository = new AuthRepository(),
    private readonly config = loadConfig(),
  ) {}

  async register(payload: RegisterInput): Promise<AuthResult> {
    const role = payload.role ?? 'user';
    const existing = await this.repository.findByEmail(payload.email);
    if (existing) {
      const error = new Error(ErrorCode.ERR_AUTH_EMAIL_EXISTS);
      (error as Error & { status?: number }).status = 409;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(payload.password, SALT_ROUNDS);
    const user = await this.repository.createUser(payload.email, hashedPassword, role);

    await this.repository.revokeRefreshTokensByUser(user.id);
    logInfo(LogCode.LOG_AUTH_REFRESH_REVOKED, { userId: user.id, reason: 'register' });

    return this.createAuthResult(user);
  }

  async login(payload: LoginInput): Promise<AuthResult> {
    const existing = await this.repository.findByEmail(payload.email);
    if (!existing) {
      const error = new Error(ErrorCode.ERR_AUTH_LOGIN_001);
      (error as Error & { status?: number }).status = 401;
      throw error;
    }

    const passwordMatches = await bcrypt.compare(payload.password, existing.hashedPassword);
    if (!passwordMatches) {
      const error = new Error(ErrorCode.ERR_AUTH_LOGIN_001);
      (error as Error & { status?: number }).status = 401;
      throw error;
    }

    await this.repository.revokeRefreshTokensByUser(existing.id);
    logInfo(LogCode.LOG_AUTH_REFRESH_REVOKED, { userId: existing.id, reason: 'login' });

    return this.createAuthResult(existing);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const hashedToken = this.hashRefreshToken(refreshToken);
    const record = await this.repository.findRefreshTokenByHash(hashedToken);

    if (!record) {
      logError(ErrorCode.ERR_AUTH_REFRESH_INVALID, { reason: 'missing-record' });
      throw this.createAuthError(ErrorCode.ERR_AUTH_REFRESH_INVALID);
    }

    if (record.revokedAt) {
      logError(ErrorCode.ERR_AUTH_REFRESH_REVOKED, {
        tokenId: record.id,
        revokedAt: record.revokedAt,
      });
      throw this.createAuthError(ErrorCode.ERR_AUTH_REFRESH_REVOKED);
    }

    const now = new Date();
    if (record.expiresAt.getTime() <= now.getTime()) {
      await this.repository.revokeRefreshToken(record.id, now);
      logError(ErrorCode.ERR_AUTH_REFRESH_EXPIRED, {
        tokenId: record.id,
        expiresAt: record.expiresAt,
      });
      throw this.createAuthError(ErrorCode.ERR_AUTH_REFRESH_EXPIRED);
    }

    const user = await this.repository.findById(record.userId);
    if (!user) {
      await this.repository.revokeRefreshToken(record.id, now);
      logError(ErrorCode.ERR_AUTH_REFRESH_INVALID, {
        reason: 'missing-user',
        userId: record.userId,
      });
      throw this.createAuthError(ErrorCode.ERR_AUTH_REFRESH_INVALID);
    }

    await this.repository.revokeRefreshTokensByUser(user.id, now);
    logInfo(LogCode.LOG_AUTH_REFRESH_REVOKED, { userId: user.id, reason: 'rotation' });
    logInfo(LogCode.LOG_AUTH_REFRESH_ROTATED, { userId: user.id });

    return this.createAuthResult(user);
  }

  private async createAuthResult(user: UserRecord): Promise<AuthResult> {
    const token = this.createAccessToken(user);
    const refreshToken = this.createRefreshTokenValue();
    const expiresAt = this.calculateRefreshExpiry();
    const hashedToken = this.hashRefreshToken(refreshToken);

    await this.repository.createRefreshToken(user.id, hashedToken, expiresAt);
    logInfo(LogCode.LOG_AUTH_REFRESH_ISSUED, { userId: user.id });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      refresh: {
        token: refreshToken,
        expiresAt,
      },
    };
  }

  private createAccessToken(user: UserRecord): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      this.config.jwtSecret,
      { expiresIn: '1h' },
    );
  }

  private createRefreshTokenValue(): string {
    const randomPart = randomBytes(32).toString('hex');
    return `${randomUUID()}.${randomPart}`;
  }

  private calculateRefreshExpiry(): Date {
    const ttl = Number.isFinite(this.config.refreshTokenTtlMs)
      ? this.config.refreshTokenTtlMs
      : DEFAULT_REFRESH_TOKEN_TTL_MS;

    return new Date(Date.now() + ttl);
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private createAuthError(code: ErrorCode, status = 401): Error {
    const error = new Error(code);
    (error as Error & { status?: number }).status = status;
    return error;
  }
}
