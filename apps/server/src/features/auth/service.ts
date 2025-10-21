import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { loadConfig } from '../../infrastructure';
import { AuthRepository, UserRecord } from './repository';
import { LoginInput, RegisterInput } from './schemas';

const SALT_ROUNDS = 10;

export interface AuthResult {
  token: string;
  user: Pick<UserRecord, 'id' | 'email' | 'role'>;
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
      const error = new Error('ERR_AUTH_EMAIL_EXISTS');
      (error as Error & { status?: number }).status = 409;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(payload.password, SALT_ROUNDS);
    const user = await this.repository.createUser(payload.email, hashedPassword, role);

    return this.createAuthResult(user);
  }

  async login(payload: LoginInput): Promise<AuthResult> {
    const existing = await this.repository.findByEmail(payload.email);
    if (!existing) {
      const error = new Error('ERR_AUTH_LOGIN_001');
      (error as Error & { status?: number }).status = 401;
      throw error;
    }

    const passwordMatches = await bcrypt.compare(payload.password, existing.hashedPassword);
    if (!passwordMatches) {
      const error = new Error('ERR_AUTH_LOGIN_001');
      (error as Error & { status?: number }).status = 401;
      throw error;
    }

    return this.createAuthResult(existing);
  }

  private createAuthResult(user: UserRecord): AuthResult {
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      this.config.jwtSecret,
      { expiresIn: '1h' },
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
}
