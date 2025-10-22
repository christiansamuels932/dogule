import { Router, Response } from 'express';
import { ZodError } from 'zod';

import { ErrorCode } from '@dogule/domain';

import { KommunikationService } from './service';
import {
  parseKommunikationCreateInput,
  parseKommunikationListQuery,
  parseKommunikationUpdateInput,
} from './schemas';

const router = Router();
const service = new KommunikationService();

const handleValidationError = (error: unknown, res: Response) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: ErrorCode.ERR_KOMM_INVALID_PAYLOAD,
      details: error.flatten(),
    });
    return true;
  }

  return false;
};

router.get('/', async (req, res, next) => {
  try {
    const filters = parseKommunikationListQuery(req.query as Record<string, unknown>);
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
    const eintrag = await service.get(req.params.id);
    if (!eintrag) {
      return res.status(404).json({ message: 'Kommunikationseintrag nicht gefunden' });
    }
    res.json(eintrag);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = parseKommunikationCreateInput(req.body);
    const eintrag = await service.create(payload);
    res.status(201).json(eintrag);
  } catch (error) {
    if (!handleValidationError(error, res)) {
      next(error);
    }
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = parseKommunikationUpdateInput(req.body);
    const eintrag = await service.update(req.params.id, payload);
    if (!eintrag) {
      return res.status(404).json({ message: 'Kommunikationseintrag nicht gefunden' });
    }
    res.json(eintrag);
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
      return res.status(404).json({ message: 'Kommunikationseintrag nicht gefunden' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
