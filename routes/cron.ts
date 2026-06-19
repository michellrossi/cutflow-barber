import { Router, Request, Response, NextFunction } from 'express';
import { runCronLogic } from '../controllers/cronController.js';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

const router = Router();

const cronLimiter = rateLimit({
    windowMs: 60_000, // 1 minuto
    max: 2,           // Máximo de 2 requisições por minuto
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas requisições no endpoint de cron. Aguarde 1 minuto.' }
});

const cronGuard = (req: Request, res: Response, next: NextFunction) => {
    const secret = req.headers['x-cron-secret'] as string | undefined;
    const expected = process.env.CRON_SECRET;
    if (!expected || !secret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const secretBuffer = Buffer.from(secret);
    const expectedBuffer = Buffer.from(expected);

    if (secretBuffer.length !== expectedBuffer.length) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!crypto.timingSafeEqual(secretBuffer, expectedBuffer)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

router.get('/run', cronLimiter, cronGuard, async (req, res) => {
    try {
        await runCronLogic();
        res.json({ success: true });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Erro interno';
        res.status(500).json({ error: message });
    }
});

export default router;
