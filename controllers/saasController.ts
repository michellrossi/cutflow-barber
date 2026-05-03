import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';

const validateAdminKey = (req: Request) => {
    return req.headers['x-saas-admin-key'] === process.env.SAAS_ADMIN_KEY;
};

export const getStats = async (req: Request, res: Response) => {
    if (!validateAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { data: shops } = await supabaseAdmin.from('shops').select('id, plan, plan_tier, created_at');
        const { data: appointments } = await supabaseAdmin.from('appointments').select('id, total_value, status, created_at');
        
        const stats = {
            totalShops: shops?.length || 0,
            activeShops: shops?.filter(s => s.plan === 'active').length || 0,
            totalRevenue: appointments?.filter(a => a.status === 'completed').reduce((acc, a) => acc + (a.total_value || 0), 0) || 0,
            totalAppointments: appointments?.length || 0
        };
        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const getShops = async (req: Request, res: Response) => {
    if (!validateAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { data } = await supabaseAdmin.from('shops').select('*').order('created_at', { ascending: false });
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const getShopById = async (req: Request, res: Response) => {
    if (!validateAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { data } = await supabaseAdmin.from('shops').select('*').eq('id', req.params.id).single();
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const updateShopStatus = async (req: Request, res: Response) => {
    if (!validateAdminKey(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const { plan, plan_tier } = req.body;
        const { data } = await supabaseAdmin.from('shops').update({ plan, plan_tier }).eq('id', req.params.id).select();
        res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};
