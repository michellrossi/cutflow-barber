import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import crypto from 'crypto';

const validateAdminKey = (req: Request) => {
    const receivedKey = req.headers['x-saas-admin-key'];
    const expectedKey = process.env.SAAS_ADMIN_KEY;

    if (!receivedKey || !expectedKey) return false;

    const receivedBuffer = Buffer.from(receivedKey as string);
    const expectedBuffer = Buffer.from(expectedKey);

    if (receivedBuffer.length !== expectedBuffer.length) return false;

    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
};

// Rota de autenticação para o SaasAdminGuard
export const auth = async (req: Request, res: Response) => {
    // Se chegou aqui, o middleware requireAdmin já validou a chave master.
    // O SaasAdminGuard apenas precisa de um 200 OK para saber que a chave é válida.
    res.json({ success: true, message: 'Autenticado com sucesso' });
};

export const getStats = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabaseAdmin.rpc('get_saas_stats');
        if (error) throw error;
        res.json(data);
    } catch (e: unknown) {
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};

export const getShops = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('shops')
            .select(`
                id,
                name,
                plan,
                monthly_price,
                whatsapp_connected,
                created_at,
                owner_id,
                users:owner_id ( email )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const shops = data?.map((shop: any) => ({
            id: shop.id,
            name: shop.name,
            owner_email: shop.users?.email || undefined,
            plan: shop.plan,
            monthly_price: shop.monthly_price,
            whatsapp_connected: shop.whatsapp_connected,
            created_at: shop.created_at
        })) || [];

        res.json({ shops });
    } catch (e: unknown) {
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};

export const getShopById = async (req: Request, res: Response) => {
    try {
        const { data } = await supabaseAdmin.from('shops').select('*').eq('id', req.params.id).single();
        res.json(data);
    } catch (e: unknown) {
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};

export const updateShopStatus = async (req: Request, res: Response) => {
    try {
        const { plan, plan_tier } = req.body;
        const { data } = await supabaseAdmin.from('shops').update({ plan, plan_tier }).eq('id', req.params.id).select();
        res.json(data);
    } catch (e: unknown) {
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};
