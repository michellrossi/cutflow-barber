import { Router, Request, Response, NextFunction } from 'express';
import { runCronLogic } from '../controllers/cronController';

const router = Router();

const cronGuard = (req: Request, res: Response, next: NextFunction) => {
    const secret = req.headers['x-cron-secret'];
    const expected = process.env.CRON_SECRET;
    if (!expected || secret !== expected) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

router.get('/run', cronGuard, async (req, res) => {
    try {
        await runCronLogic();
        res.json({ success: true });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Erro interno';
        res.status(500).json({ error: message });
    }
});

export default router;
