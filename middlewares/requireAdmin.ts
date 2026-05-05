import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const adminKey = req.headers['x-saas-admin-key'] as string;
    const masterKey = process.env.SAAS_ADMIN_KEY;

    if (!masterKey) {
        console.error('CRÍTICO: SAAS_ADMIN_KEY não configurada no .env');
        return res.status(500).json({ error: 'Erro interno de configuração' });
    }

    if (!adminKey) {
        return res.status(401).json({ error: 'Acesso negado' });
    }

    try {
        // Comparação segura para evitar timing attacks
        const keyBuffer = Buffer.from(adminKey);
        const masterBuffer = Buffer.from(masterKey);

        if (keyBuffer.length === masterBuffer.length && crypto.timingSafeEqual(keyBuffer, masterBuffer)) {
            return next();
        }
    } catch (e) {
        // Fallback simples caso os buffers falhem
    }

    return res.status(401).json({ error: 'Chave administrativa inválida' });
};
