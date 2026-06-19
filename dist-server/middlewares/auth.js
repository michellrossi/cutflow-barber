import { supabaseAdmin } from '../lib/supabase';
export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    // Verifica se o token foi revogado no backend
    const { data: isRevoked } = await supabaseAdmin
        .from('revoked_tokens')
        .select('token')
        .eq('token', token)
        .maybeSingle();
    if (isRevoked)
        return res.status(401).json({ error: 'Token revogado. Faça login novamente.' });
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user)
        return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
};
export const requirePlan = (minTier) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user)
                return res.status(401).json({ error: 'Unauthorized' });
            const { data: shop } = await supabaseAdmin
                .from('shops')
                .select('plan, plan_tier, trial_ends_at')
                .eq('owner_id', user.id)
                .single();
            if (!shop) {
                return res.status(403).json({ error: 'Assinatura inativa ou não encontrada.', code: 'PLAN_REQUIRED' });
            }
            // Permite 'active' e 'trial'. Se for 'trial', valida se a data expirou
            if (shop.plan === 'trial') {
                if (shop.trial_ends_at) {
                    const trialEnd = new Date(shop.trial_ends_at);
                    if (trialEnd < new Date()) {
                        return res.status(403).json({ error: 'Período de teste expirado.', code: 'TRIAL_EXPIRED' });
                    }
                }
            }
            else if (shop.plan !== 'active') {
                return res.status(403).json({ error: 'Assinatura inativa ou não encontrada.', code: 'PLAN_REQUIRED' });
            }
            const tiers = ['essencial', 'profissional', 'premium'];
            if (tiers.indexOf(shop.plan_tier) < tiers.indexOf(minTier)) {
                return res.status(403).json({ error: `Este recurso requer o plano ${minTier}.`, code: 'UPGRADE_REQUIRED' });
            }
            next();
        }
        catch (e) {
            res.status(500).json({ error: 'Erro ao verificar plano.' });
        }
    };
};
