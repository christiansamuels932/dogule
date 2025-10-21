import { Router, Response } from 'express';
import { ZodError } from 'zod';

import { HundeService } from './service';
import { parseHundeCreateInput, parseHundeUpdateInput } from './schemas';

const router = Router();
const service = new HundeService();

const handleValidationError = (error: unknown, res: Response) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: 'ERR_HUNDE_INVALID_PAYLOAD',
      details: error.flatten(),
    });
    return true;
  }

  return false;
};

const parseOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

router.get('/', async (req, res, next) => {
  try {
    const limit = parseOptionalNumber(req.query.limit);
    const offset = parseOptionalNumber(req.query.offset);
    const kundeId = typeof req.query.kunde_id === 'string' ? req.query.kunde_id : undefined;

    const result = await service.list({ limit, offset, kundeId });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const hund = await service.get(req.params.id);
    if (!hund) {
      return res.status(404).json({ message: 'Hund not found' });
    }
    res.json(hund);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = parseHundeCreateInput(req.body);
    const hund = await service.create(payload);
    res.status(201).json(hund);
  } catch (error) {
    if (!handleValidationError(error, res)) {
      next(error);
    }
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = parseHundeUpdateInput(req.body);
    const hund = await service.update(req.params.id, payload);
    if (!hund) {
      return res.status(404).json({ message: 'Hund not found' });
    }
    res.json(hund);
  } catch (error) {
    if (!handleValidationError(error, res)) {
      next(error);
    }
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await service.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Hund not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
