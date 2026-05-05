import { Router } from 'express';
import * as loyaltyController from '../controllers/loyaltyController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/reward', authenticate, loyaltyController.generateReward);

export default router;
