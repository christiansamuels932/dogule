import { Router } from 'express';

import { DashboardService } from './service';

const router = Router();
const service = new DashboardService();

router.get('/', async (_req, res, next) => {
  try {
    const summary = await service.getSummary();
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

export default router;
