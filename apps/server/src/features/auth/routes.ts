import { Router, Response, type CookieOptions, type Request } from 'express';
import { ZodError } from 'zod';

import { ErrorCode } from '@dogule/domain';
import { logError } from '@dogule/utils';

import { loginSchema, registerSchema } from './schemas';
import { AuthService, REFRESH_COOKIE_NAME } from './service';
import { authMiddleware, AuthenticatedRequest } from '../../infrastructure';

const router = Router();

const createService = () => new AuthService();

const handleValidationError = (error: unknown, res: Response): boolean => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: ErrorCode.ERR_AUTH_INVALID_PAYLOAD,
      details: error.flatten(),
    });
    return true;
  }

  return false;
};

const refreshCookieBaseOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/auth/refresh',
};

const setRefreshCookie = (res: Response, token: string, expiresAt: Date) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieBaseOptions,
    expires: expiresAt,
  });
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieBaseOptions);
};

const extractRefreshToken = (req: Request): string | undefined => {
  const header = req.headers.cookie;
  if (!header) {
    return undefined;
  }

  const pairs = header.split(';');
  for (const pair of pairs) {
    const [name, ...valueParts] = pair.trim().split('=');
    if (name === REFRESH_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join('='));
    }
  }

  return undefined;
};

router.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const service = createService();
    const result = await service.register(payload);
    setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt);
    res.status(201).json({ token: result.token, user: result.user });
  } catch (error) {
    if (!handleValidationError(error, res)) {
      next(error);
    }
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const service = createService();
    const result = await service.login(payload);
    setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt);
    res.json({ token: result.token, user: result.user });
  } catch (error) {
    if (!handleValidationError(error, res)) {
      next(error);
    }
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      logError(ErrorCode.ERR_AUTH_REFRESH_MISSING, 'Missing refresh token cookie');
      clearRefreshCookie(res);
      res.status(401).json({ message: ErrorCode.ERR_AUTH_REFRESH_MISSING });
      return;
    }

    const service = createService();
    const result = await service.refresh(refreshToken);

    setRefreshCookie(res, result.refresh.token, result.refresh.expiresAt);
    res.json({ token: result.token, user: result.user });
  } catch (error) {
    const message = error instanceof Error ? error.message : undefined;
    if (message && message.startsWith('ERR_AUTH_REFRESH_')) {
      const status = (error as Error & { status?: number }).status ?? 401;
      clearRefreshCookie(res);
      res.status(status).json({ message });
      return;
    }

    next(error);
  }
});

router.get('/me', authMiddleware, (req, res) => {
  try {
    const request = req as typeof req & AuthenticatedRequest;

    if (!request.user) {
      res.status(500).json({ message: ErrorCode.ERR_AUTH_ME_001 });
      return;
    }

    const name =
      typeof request.user.name === 'string' && request.user.name.trim().length > 0
        ? String(request.user.name)
        : request.user.email;

    res.json({
      user: {
        ...request.user,
        name,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      logError('[auth] failed to load profile', error);
    }
    res.status(500).json({ message: ErrorCode.ERR_AUTH_ME_001 });
  }
});

export default router;
