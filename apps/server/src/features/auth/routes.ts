import { Router, Response } from 'express';
import { ZodError } from 'zod';

import { logError } from '@dogule/utils';

import { loginSchema, registerSchema } from './schemas';
import { AuthService } from './service';
import { authMiddleware, AuthenticatedRequest } from '../../infrastructure';

const router = Router();

const createService = () => new AuthService();

const handleValidationError = (error: unknown, res: Response): boolean => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: 'ERR_AUTH_INVALID_PAYLOAD',
      details: error.flatten(),
    });
    return true;
  }

  return false;
};

router.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const service = createService();
    const result = await service.register(payload);
    res.status(201).json(result);
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
    res.json(result);
  } catch (error) {
    if (!handleValidationError(error, res)) {
      next(error);
    }
  }
});

router.get('/me', authMiddleware, (req, res) => {
  try {
    const request = req as typeof req & AuthenticatedRequest;

    if (!request.user) {
      res.status(500).json({ message: 'ERR_AUTH_ME_001' });
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
    res.status(500).json({ message: 'ERR_AUTH_ME_001' });
  }
});

export default router;
