import { Router } from 'express';
import { FinanzenService } from './service';
import { parseFinanzCreateInput, parseFinanzUpdateInput } from './schemas';

const isFinanzTyp = (value: unknown): value is 'einnahme' | 'ausgabe' =>
  value === 'einnahme' || value === 'ausgabe';

const parseNumberParam = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const router = Router();
const service = new FinanzenService();

router.get('/', async (req, res, next) => {
  try {
    const { from, to, typ } = req.query;
    const limit = parseNumberParam(req.query.limit);
    const offset = parseNumberParam(req.query.offset);

    if (typ !== undefined && !isFinanzTyp(typ)) {
      return res.status(400).json({ message: 'Invalid typ parameter' });
    }

    const result = await service.list({
      from: typeof from === 'string' ? from : undefined,
      to: typeof to === 'string' ? to : undefined,
      typ: typeof typ === 'string' ? (typ as 'einnahme' | 'ausgabe') : undefined,
      limit,
      offset,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/sum', async (req, res, next) => {
  try {
    const { from, to, typ } = req.query;

    if (typ !== undefined && !isFinanzTyp(typ)) {
      return res.status(400).json({ message: 'Invalid typ parameter' });
    }

    const sum = await service.sum({
      from: typeof from === 'string' ? from : undefined,
      to: typeof to === 'string' ? to : undefined,
      typ: typeof typ === 'string' ? (typ as 'einnahme' | 'ausgabe') : undefined,
    });

    res.json({ sum });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const record = await service.get(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Financial record not found' });
    }
    res.json(record);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = parseFinanzCreateInput(req.body);
    const finanz = await service.create(payload);
    res.status(201).json(finanz);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = parseFinanzUpdateInput(req.body);
    const finanz = await service.update(req.params.id, payload);
    if (!finanz) {
      return res.status(404).json({ message: 'Financial record not found' });
    }
    res.json(finanz);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await service.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Financial record not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
