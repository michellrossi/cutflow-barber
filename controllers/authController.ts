import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { sendWhatsApp } from '../lib/helpers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const requestClientLogin = async (req: Request, res: Response) => {
    try {
        const { shopId, phone, name, birthDate, justCheck } = req.body;
        if (!shopId || !phone) return res.status(400).json({ error: 'ShopId e Telefone são obrigatórios' });

        const cleanPhone = phone.replace(/\D/g, '');
        
        let { data: client } = await supabaseAdmin.from('clients').select('*').eq('shop_id', shopId).eq('phone', cleanPhone).maybeSingle();
        
        if (!client) {
            if (justCheck) return res.json({ success: false, needsRegistration: true });
            if (!name) return res.status(400).json({ error: 'Nome é obrigatório para novo cadastro' });
            
            const { data: newClient, error } = await supabaseAdmin.from('clients').insert({ shop_id: shopId, name, phone: cleanPhone, birth_date: birthDate }).select('*').single();
            if (error) throw error;
            client = newClient;
        }

        const token = jwt.sign({ clientId: client.id, shopId, phone: cleanPhone }, JWT_SECRET, { expiresIn: '15m' });
        const { data: shop } = await supabaseAdmin.from('shops').select('name, slug, whatsapp_instance').eq('id', shopId).single();
        
        const clientAppUrl = process.env.CLIENT_APP_URL || 'https://agendar.insightbarber.com.br';
        const loginUrl = `${clientAppUrl}/${shop?.slug}?token=${token}`;
        const msg = `Olá ${client.name}!\nAcesse sua conta na ${shop?.name} clicando no link abaixo:\n\n${loginUrl}\n\nEste link expira em 15 minutos. 🔐💈`;
        
        const ok = await sendWhatsApp(cleanPhone, msg, shop?.whatsapp_instance);
        res.json({ success: ok });
    } catch (e: any) {
        console.error('[Auth] Error in requestClientLogin:', e);
        res.status(500).json({ error: e.message });
    }
};

export const validateClientToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token é obrigatório' });

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        
        const { data: client } = await supabaseAdmin.from('clients').select('*').eq('id', decoded.clientId).single();
        if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
        
        res.json({ success: true, client, session: { token } });
    } catch (e: any) {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
};
