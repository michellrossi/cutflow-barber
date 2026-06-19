import { Router } from 'express';
import * as aiController from '../controllers/aiController.js';
const router = Router();

router.post('/insights', aiController.getInsights);

export default router;
