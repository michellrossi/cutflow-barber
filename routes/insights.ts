import { Router } from 'express';
import * as aiController from '../controllers/aiController';
const router = Router();

router.post('/insights', aiController.getInsights);

export default router;
