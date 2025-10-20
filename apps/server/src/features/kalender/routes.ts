import { Router } from 'express';
import { KalenderService } from './service';
import { parseCalendarEventCreateInput, parseCalendarEventUpdateInput } from './schemas';

const router = Router();
const service = new KalenderService();

router.get('/', async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const result = await service.list({ page, pageSize });
    res.json(result);
  } catch (error) {
    next(error);
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
    const payload = parseCalendarEventCreateInput(req.body);
    const event = await service.create(payload);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = parseCalendarEventUpdateInput(req.body);
    const event = await service.update(req.params.id, payload);
    if (!event) {
      return res.status(404).json({ message: 'Calendar event not found' });
    }
    res.json(event);
  } catch (error) {
    next(error);
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
