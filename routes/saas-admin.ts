import { Router } from 'express';
import * as saasController from '../controllers/saasController.js';

const router = Router();

router.get('/stats', saasController.getStats);
router.get('/shops', saasController.getShops);
router.get('/shops/:id', saasController.getShopById);
router.post('/shops/:id/status', saasController.updateShopStatus);
router.post('/auth', saasController.auth);

export default router;
