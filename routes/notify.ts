import { Router } from 'express';
import { runCronLogic } from '../controllers/cronController';

const router = Router();

// Endpoint que geralmente é chamado por um cron job externo (ex: EasyCron, GitHub Actions)
router.get('/cron', async (req, res) => {
    try {
        console.log('[API] Trigger manual do Cron via /api/notify/cron');
        await runCronLogic();
        res.json({ success: true, message: 'Cron executado com sucesso' });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
