import { Router, Response } from 'express';
import { ZodError } from 'zod';

import { ErrorCode } from '@dogule/domain';

import { KalenderService } from './service';
import {
  parseKalenderCreateInput,
  parseKalenderListFilters,
  parseKalenderUpdateInput,
} from './schemas';

const router = Router();
const service = new KalenderService();

const handleValidationError = (error: unknown, res: Response) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: ErrorCode.ERR_KALENDER_INVALID_PAYLOAD,
      details: error.flatten(),
    });
    return true;
  }

  return false;
};

router.get('/', async (req, res, next) => {
  try {
    const filters = parseKalenderListFilters(req.query);
    const result = await service.list(filters);
    res.json(result);
  } catch (error) {
    if (!handleValidationError(error, res)) {
      next(error);
    }
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await service.get(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }
    res.json(event);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = parseKalenderCreateInput(req.body);
    const event = await service.create(payload);
    res.status(201).json(event);
  } catch (error) {
    if (!handleValidationError(error, res)) {
      next(error);
    }
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const payload = parseKalenderUpdateInput(req.body);
    const event = await service.update(req.params.id, payload);
    if (!event) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }
    res.json(event);
  } catch (error) {
    if (!handleValidationError(error, res)) {
      next(error);
    }
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await service.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
