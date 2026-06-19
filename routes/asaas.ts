import { Router } from 'express';
import * as asaasController from '../controllers/asaasController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.post('/customers', authenticate, asaasController.createCustomer);
router.post('/subscriptions', authenticate, asaasController.createSubscription);
router.post('/checkout', authenticate, asaasController.checkout);
router.post('/webhook', asaasController.handleWebhook);

export default router;
