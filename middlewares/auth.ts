import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    (req as any).user = user;
    next();
};

export const requirePlan = (minTier: 'essencial' | 'profissional' | 'premium') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ error: 'Unauthorized' });

            const { data: shop } = await supabaseAdmin
                .from('shops')
                .select('plan, plan_tier')
                .eq('owner_id', user.id)
                .single();

            if (!shop || shop.plan !== 'active') {
                return res.status(403).json({ error: 'Assinatura inativa ou não encontrada.', code: 'PLAN_REQUIRED' });
            }

            const tiers = ['essencial', 'profissional', 'premium'];
            if (tiers.indexOf(shop.plan_tier) < tiers.indexOf(minTier)) {
                return res.status(403).json({ error: `Este recurso requer o plano ${minTier}.`, code: 'UPGRADE_REQUIRED' });
            }

            next();
        } catch (e) {
            res.status(500).json({ error: 'Erro ao verificar plano.' });
        }
    };
};
