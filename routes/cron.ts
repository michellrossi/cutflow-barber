import { Router } from 'express';
import { runCronLogic } from '../controllers/cronController';

const router = Router();

router.get('/run', async (req, res) => {
    try {
        await runCronLogic();
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
