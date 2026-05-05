import { Router } from 'express';
import * as aiController from '../controllers/aiController';
import { authenticate, requirePlan } from '../middlewares/auth';

const router = Router();

router.post('/insights', authenticate, requirePlan('profissional'), aiController.getInsights);

export default router;
