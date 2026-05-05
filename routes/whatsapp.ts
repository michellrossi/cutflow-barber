import { Router } from 'express';
import * as whatsappController from '../controllers/whatsappController';
import { authenticate, requirePlan } from '../middlewares/auth';

const router = Router();

router.post('/qrcode', authenticate, whatsappController.getQRCode);
router.post('/status', authenticate, whatsappController.getStatus);
router.post('/disconnect', authenticate, whatsappController.disconnect);
router.post('/webhook', whatsappController.handleWebhook);

export default router;
