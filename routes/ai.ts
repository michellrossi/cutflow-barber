import { Router } from 'express';
import * as aiController from '../controllers/aiController';
import { authenticate, requirePlan } from '../middlewares/auth';

const router = Router();

// Geração de templates e imagens exige plano profissional
router.post('/generate-template', authenticate, requirePlan('profissional'), aiController.generateTemplate);
router.post('/generate-image', authenticate, requirePlan('profissional'), aiController.generateImage);

export default router;
