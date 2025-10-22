import { Router, Response } from 'express';
import { ZodError } from 'zod';

import { ErrorCode } from '@dogule/domain';

import { KundenService } from './service';
import { parseCustomerCreateInput, parseCustomerUpdateInput } from './schemas';

const router = Router();
const service = new KundenService();

const handleValidationError = (error: unknown, res: Response) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: ErrorCode.ERR_KUNDEN_INVALID_PAYLOAD,
      details: error.flatten(),
    });
    return true;
  }

  return false;
};

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
    const customer = await service.get(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = parseCustomerCreateInput(req.body);
    const customer = await service.create(payload);
    res.status(201).json(customer);
  } catch (error) {
    if (!handleValidationError(error, res)) {
      next(error);
    }
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const payload = parseCustomerUpdateInput(req.body);
    const customer = await service.update(req.params.id, payload);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
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
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
