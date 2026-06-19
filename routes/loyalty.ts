import { Router } from 'express';
import * as loyaltyController from '../controllers/loyaltyController.js';
const router = Router();

router.post('/reward', loyaltyController.generateReward);

export default router;
