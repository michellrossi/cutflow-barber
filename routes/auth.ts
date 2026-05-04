import { Router } from 'express';
import * as authController from '../controllers/authController';

const router = Router();

router.post('/client-request', authController.requestClientLogin);
router.post('/client-validate', authController.validateClientToken);

export default router;
