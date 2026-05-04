import { Router, Request, Response, NextFunction } from 'express';
import { runCronLogic } from '../controllers/cronController';

const router = Router();

const cronGuard = (req: Request, res: Response, next: NextFunction) => {
    const secret = req.headers['x-cron-secret'];
    if (secret !== process.env.CRON_SECRET) return res.status(401).end();
    next();
};

router.get('/run', cronGuard, async (req, res) => {
    try {
        await runCronLogic();
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
