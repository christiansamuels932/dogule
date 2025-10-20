import { Router } from 'express';
import { HundeService } from './service';
import { parseDogCreateInput, parseDogUpdateInput } from './schemas';

const router = Router();
const service = new HundeService();

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
    const dog = await service.get(req.params.id);
    if (!dog) {
      return res.status(404).json({ message: 'Dog not found' });
    }
    res.json(dog);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = parseDogCreateInput(req.body);
    const dog = await service.create(payload);
    res.status(201).json(dog);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = parseDogUpdateInput(req.body);
    const dog = await service.update(req.params.id, payload);
    if (!dog) {
      return res.status(404).json({ message: 'Dog not found' });
    }
    res.json(dog);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await service.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Dog not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
