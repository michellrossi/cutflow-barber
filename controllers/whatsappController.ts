import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { handleChatbotAI } from './chatbotController.js';
import { isRateLimited } from '../lib/helpers.js';

export const getQRCode = async (req: Request, res: Response) => {
    try {
        const { shopId } = req.body;
        const { data: shop } = await supabaseAdmin.from('shops').select('whatsapp_instance').eq('id', shopId).single();
        const instanceName = shop?.whatsapp_instance;
        
        if (!instanceName) return res.status(404).json({ error: 'Instância não encontrada para esta loja' });

        const response = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connect/${instanceName}`, {
            headers: { 'apikey': process.env.WHATSAPP_API_KEY || '' }
        });
        const data = await response.json();
        
        // Normaliza a resposta da Evolution API v2
        const qrcode = data.base64 || data.qrcode?.base64 || data.instance?.qrcode?.base64;
        const connected = data.instance?.state === 'open' || data.status === 'open';
        
        res.json({ qrcode, connected, ...data });
    } catch (e: unknown) {
        const error = e as Error;
        res.status(500).json({ error: error.message });
    }
};

export const getStatus = async (req: Request, res: Response) => {
    try {
        const { shopId } = req.body;
        const { data: shop } = await supabaseAdmin.from('shops').select('whatsapp_instance').eq('id', shopId).single();
        const instanceName = shop?.whatsapp_instance;

        if (!instanceName) return res.status(404).json({ error: 'Instância não encontrada' });

        const response = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': process.env.WHATSAPP_API_KEY || '' }
        });
        const data = await response.json();
        
        const connected = data.instance?.state === 'open' || data.state === 'open';
        res.json({ connected, ...data });
    } catch (e: unknown) {
        const error = e as Error;
        res.status(500).json({ error: error.message });
    }
};

export const disconnect = async (req: Request, res: Response) => {
    try {
        const { shopId } = req.body;
        const { data: shop } = await supabaseAdmin.from('shops').select('whatsapp_instance').eq('id', shopId).single();
        const instanceName = shop?.whatsapp_instance;

        if (!instanceName) return res.status(404).json({ error: 'Instância não encontrada' });

        const response = await fetch(`${process.env.WHATSAPP_API_URL}/instance/logout/${instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': process.env.WHATSAPP_API_KEY || '' }
        });
        const data = await response.json();
        res.json(data);
    } catch (e: unknown) {
        const error = e as Error;
        res.status(500).json({ error: error.message });
    }
};

interface EvolutionWebhookBody {
    event: string;
    instance: string;
    data: {
        message: {
            fromMe: boolean;
            key: {
                remoteJid: string;
            };
            message?: {
                conversation?: string;
                extendedTextMessage?: {
                    text: string;
                };
            };
        };
        pushName?: string;
    };
}

export const handleWebhook = async (req: Request, res: Response) => {
    const secret = req.headers['x-evolution-webhook-secret'];
    const expected = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (expected && secret !== expected) {
        return res.status(401).send('Unauthorized');
    }

    const { event, data, instance } = req.body as EvolutionWebhookBody;
    if (event === 'MESSAGES_UPSERT') {
        const message = data.message;
        if (!message || message.fromMe) return res.status(200).send('OK');

        const remoteJid = message.key.remoteJid;
        const content = message.message?.conversation || message.message?.extendedTextMessage?.text;

        if (!content || isRateLimited(remoteJid)) return res.status(200).send('OK');

        // Busca shopId pela instancia
        const { data: shop } = await supabaseAdmin.from('shops').select('id').eq('whatsapp_instance', instance).single();
        if (shop) {
            await handleChatbotAI(shop.id, remoteJid, data.pushName || 'Cliente', content, instance);
        }
    }

    res.status(200).send('OK');
};
