import { Router } from 'express';
import { KommunikationService } from './service';
import { parseMessageCreateInput, parseMessageUpdateInput } from './schemas';

const router = Router();
const service = new KommunikationService();

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
    const message = await service.get(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.json(message);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = parseMessageCreateInput(req.body);
    const message = await service.create(payload);
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = parseMessageUpdateInput(req.body);
    const message = await service.update(req.params.id, payload);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.json(message);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await service.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
