import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { generateWhatsAppMessage, sendWhatsApp, logAutomatedMessage } from '../lib/helpers';

export const sendConfirmationClient = async (req: Request, res: Response) => {
    try {
        const { appointmentId } = req.body;
        const { data: apt, error } = await supabaseAdmin
            .from('appointments')
            .select('*, professionals(name), shops(id, name, whatsapp_instance, whatsapp_connected)')
            .eq('id', appointmentId)
            .single();

        if (error || !apt) return res.status(404).json({ error: 'Agendamento não encontrado' });

        const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
        if (!shop?.whatsapp_connected) return res.status(400).json({ error: 'WhatsApp da loja não conectado' });

        // Busca nomes dos serviços
        const { data: svcs } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
        const servicesNames = svcs?.map(s => s.name).join(', ') || 'serviços';

        const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const formattedTime = apt.time.substring(0, 5);

        const msg = await generateWhatsAppMessage('immediate_confirmation', {
            clientName: apt.client_name,
            services: servicesNames,
            date: formattedDate,
            time: formattedTime,
            proName: apt.professionals?.name || "seu barbeiro",
            shopName: shop.name
        }, shop.id);

        if (!msg) return res.status(400).json({ error: 'Template de confirmação não encontrado' });

        const ok = await sendWhatsApp(apt.client_phone, msg, shop.whatsapp_instance);
        
        if (ok) {
            await logAutomatedMessage(shop.id, apt.client_name, apt.client_phone, 'Confirmação Imediata', 'sent');
            res.json({ success: true });
        } else {
            await logAutomatedMessage(shop.id, apt.client_name, apt.client_phone, 'Confirmação Imediata', 'failed');
            res.status(500).json({ error: 'Falha ao enviar WhatsApp' });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const testTemplate = async (req: Request, res: Response) => {
    try {
        const { phone, templateId } = req.body;
        const { data: template, error } = await supabaseAdmin.from('message_templates').select('*').eq('id', templateId).single();
        if (error || !template) return res.status(404).json({ error: 'Template não encontrado' });

        const { data: shop } = await supabaseAdmin.from('shops').select('name, whatsapp_instance').eq('id', template.shop_id).single();

        let content = template.content;
        content = content
            .replace(/\[CLIENTE\]/g, 'Cliente Teste')
            .replace(/\[SERVICO\]/g, 'Corte de Teste')
            .replace(/\[DATA\]/g, '01/01/26')
            .replace(/\[HORA\]/g, '14:00')
            .replace(/\[BARBEIRO\]/g, 'Barbeiro Teste')
            .replace(/\[BARBEARIA\]/g, shop?.name || 'Nossa Barbearia');

        const ok = await sendWhatsApp(phone, content, shop?.whatsapp_instance);
        if (ok) {
            res.json({ success: true, message: 'Teste enviado com sucesso!' });
        } else {
            res.status(500).json({ error: 'Falha ao enviar WhatsApp' });
        }
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};
