import { Router } from 'express';
import * as aiController from '../controllers/aiController';
const router = Router();
// Geração de templates e imagens exige plano profissional
router.post('/generate-template', aiController.generateTemplate);
router.post('/generate-image', aiController.generateImage);
export default router;
