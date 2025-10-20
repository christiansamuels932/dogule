import { Router } from 'express';
import { FinanzenService } from './service';
import { parseFinancialRecordCreateInput, parseFinancialRecordUpdateInput } from './schemas';

const router = Router();
const service = new FinanzenService();

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
    const payload = parseFinancialRecordCreateInput(req.body);
    const record = await service.create(payload);
    res.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = parseFinancialRecordUpdateInput(req.body);
    const record = await service.update(req.params.id, payload);
    if (!record) {
      return res.status(404).json({ message: 'Financial record not found' });
    }
    res.json(record);
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
