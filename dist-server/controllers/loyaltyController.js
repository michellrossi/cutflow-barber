import { supabaseAdmin } from '../lib/supabase';
import { sendWhatsApp, generateWhatsAppMessage, logAutomatedMessage } from '../lib/helpers';
export const generateReward = async (req, res) => {
    try {
        const { clientId, shopId } = req.body;
        if (!clientId || !shopId)
            return res.status(400).json({ error: 'ClientId e ShopId são obrigatórios' });
        const { data: client } = await supabaseAdmin
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .eq('shop_id', shopId)
            .single();
        if (!client)
            return res.status(404).json({ error: 'Cliente não encontrado' });
        const { data: settings } = await supabaseAdmin.from('settings').select('*').eq('shop_id', shopId).single();
        if (!settings?.loyaltyEnabled)
            return res.status(400).json({ error: 'Programa de fidelidade desativado nesta loja' });
        // Reset loyalty counters
        await supabaseAdmin.from('clients').update({
            loyalty_points: 0,
            loyalty_card_count: 0
        }).eq('id', clientId);
        // Generate Coupon
        const code = `PREMIO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const expiryDays = settings.loyaltyRewardExpiryDays || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);
        const { error: couponError } = await supabaseAdmin.from('coupons').insert({
            shop_id: shopId,
            client_id: clientId,
            code,
            type: 'fixed',
            value: settings.loyaltyRewardValue || 10,
            active: true,
            expires_at: expiresAt.toISOString(),
            max_uses: 1,
            usage_count: 0,
            is_loyalty_reward: true
        });
        if (couponError)
            throw couponError;
        // Enviar WhatsApp de Recompensa
        try {
            const { data: shop } = await supabaseAdmin
                .from('shops')
                .select('name, whatsapp_instance, whatsapp_connected')
                .eq('id', shopId)
                .single();
            if (shop?.whatsapp_connected && client.phone) {
                const msg = await generateWhatsAppMessage('loyalty_reward', {
                    clientName: client.name,
                    shopName: shop.name,
                    discount: `${settings.loyaltyRewardValue}${settings.loyaltyRewardType === 'percentage' ? '%' : ' reais'}`,
                    code: code,
                    validity: String(expiryDays)
                }, shopId);
                if (msg) {
                    const sent = await sendWhatsApp(client.phone, msg, shop.whatsapp_instance);
                    await logAutomatedMessage(shopId, client.name, client.phone, 'Recompensa Fidelidade', sent ? 'sent' : 'failed');
                }
            }
        }
        catch (wsErr) {
            console.error('[Loyalty] Erro ao enviar WhatsApp:', wsErr);
        }
        res.json({ success: true, code });
    }
    catch (e) {
        console.error('[Loyalty] Error in generateReward:', e);
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};
