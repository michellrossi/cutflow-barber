import { Router, Request, Response, NextFunction } from 'express';
import { runCronLogic } from '../controllers/cronController';
import * as notifyController from '../controllers/notifyController';
import { authenticate } from '../middlewares/auth';

const router = Router();

const cronGuard = (req: Request, res: Response, next: NextFunction) => {
    const secret = req.headers['x-cron-secret'];
    const expected = process.env.CRON_SECRET;
    if (!expected || secret !== expected) {
        console.warn('[Cron] Tentativa de acesso não autorizado ao trigger.');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Endpoint que geralmente é chamado por um cron job externo (ex: EasyCron, GitHub Actions)
router.get('/cron', cronGuard, async (req, res) => {
    try {
        console.log('[API] Trigger manual do Cron via /api/notify/cron');
        await runCronLogic();
        res.json({ success: true, message: 'Cron executado com sucesso' });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Erro interno';
        res.status(500).json({ error: message });
    }
});

router.post('/confirmation-client', authenticate, notifyController.sendAppointmentConfirmation);
// Rota PÚBLICA — chamada pelo BookingFlow do cliente (sem autenticação)
router.post('/confirmation', notifyController.sendAppointmentConfirmation);
router.post('/test', authenticate, notifyController.testTemplate);

export default router;
