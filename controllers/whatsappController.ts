import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { handleChatbotAI } from './chatbotController';
import { isRateLimited } from '../lib/helpers';

export const getQRCode = async (req: Request, res: Response) => {
    try {
        const { instanceName } = req.body;
        const response = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connect/${instanceName}`, {
            headers: { 'apikey': process.env.WHATSAPP_API_KEY || '' }
        });
        const data = await response.json();
        res.json(data);
    } catch (e: unknown) {
        const error = e as Error;
        res.status(500).json({ error: error.message });
    }
};

export const getStatus = async (req: Request, res: Response) => {
    try {
        const { instanceName } = req.body;
        const response = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': process.env.WHATSAPP_API_KEY || '' }
        });
        const data = await response.json();
        res.json(data);
    } catch (e: unknown) {
        const error = e as Error;
        res.status(500).json({ error: error.message });
    }
};

export const disconnect = async (req: Request, res: Response) => {
    try {
        const { instanceName } = req.body;
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
    if (process.env.NODE_ENV === 'production' && secret !== process.env.EVOLUTION_WEBHOOK_SECRET) {
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
