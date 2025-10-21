import { Router } from 'express';

import { KurseService } from './service';
import {
  kursCreateSchema,
  kursListQuerySchema,
  kursUpdateSchema,
} from './schemas';

const router = Router();
const service = new KurseService();

const singleValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

router.get('/', async (req, res, next) => {
  try {
    const query = kursListQuerySchema.parse({
      limit: singleValue(req.query.limit),
      offset: singleValue(req.query.offset),
      status: singleValue(req.query.status),
      from: singleValue(req.query.from),
      to: singleValue(req.query.to),
    });

    const result = await service.list(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const kurs = await service.get(req.params.id);
    if (!kurs) {
      return res.status(404).json({ message: 'Kurs not found' });
    }

    res.json(kurs);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = kursCreateSchema.parse(req.body);
    const kurs = await service.create(payload);
    res.status(201).json(kurs);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = kursUpdateSchema.parse(req.body);
    const kurs = await service.update(req.params.id, payload);
    if (!kurs) {
      return res.status(404).json({ message: 'Kurs not found' });
    }

    res.json(kurs);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await service.remove(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Kurs not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
