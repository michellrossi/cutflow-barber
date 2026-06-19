import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.post('/client-request', authController.requestClientLogin);
router.post('/client-validate', authController.validateClientToken);
router.post('/welcome', authController.triggerWelcomeEmail);
router.post('/logout', authenticate, authController.logout);

export default router;
