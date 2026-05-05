import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { sendWhatsApp } from '../lib/helpers';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET não configurado no .env');
}
const JWT_SECRET = process.env.JWT_SECRET;

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
        const { data: shop, error: shopError } = await supabaseAdmin.from('shops').select('name, slug, whatsapp_instance').eq('id', shopId).single();
        
        if (shopError || !shop) {
            console.error('[Auth] Erro ao buscar dados da loja:', shopError);
            return res.status(404).json({ error: 'Dados da loja não encontrados' });
        }

        const serverUrl = process.env.SERVER_URL || 'https://www.insightbarber.com.br';
        const loginUrl = `${serverUrl}/acesso/${token}`;
        const msg = `Olá ${client.name}!\nAcesse sua conta na ${shop.name} clicando no link abaixo:\n\n${loginUrl}\n\nEste link expira em 15 minutos. 🔐💈`;
        
        console.log(`[Auth] Enviando link de login para ${cleanPhone} (Loja: ${shop.name})`);
        const ok = await sendWhatsApp(cleanPhone, msg, shop.whatsapp_instance);
        
        if (ok) {
            res.json({ success: true, url: loginUrl });
        } else {
            console.error('[Auth] Falha ao enviar WhatsApp via Evolution API');
            res.status(500).json({ error: 'Falha ao enviar mensagem de WhatsApp. Verifique a conexão.' });
        }
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

        const { data: shop } = await supabaseAdmin.from('shops').select('slug').eq('id', decoded.shopId).single();
        
        res.json({ success: true, client, slug: shop?.slug, session: { token } });
    } catch (e: any) {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
};
