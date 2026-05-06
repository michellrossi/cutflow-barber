import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { generateWhatsAppMessage, sendWhatsApp, logAutomatedMessage } from '../lib/helpers';

export const sendAppointmentConfirmation = async (req: Request, res: Response) => {
    try {
        const { appointmentId } = req.body;
        const { data: apt, error } = await supabaseAdmin
            .from('appointments')
            .select('*, professionals(name, phone), shops(id, name, whatsapp_instance, whatsapp_connected)')
            .eq('id', appointmentId)
            .single();
        
        if (error || !apt) return res.status(404).json({ error: 'Agendamento não encontrado' });

        const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
        if (!shop?.whatsapp_connected) return res.status(400).json({ error: 'WhatsApp da loja não conectado' });

        const pro = Array.isArray(apt.professionals) ? apt.professionals[0] : apt.professionals;

        // Busca nomes dos serviços
        const { data: svcs } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
        const servicesNames = svcs?.map(s => s.name).join(', ') || 'serviços';

        const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const formattedTime = apt.time.substring(0, 5);

        const dataForMessage = {
            clientName: apt.client_name,
            services: servicesNames,
            date: formattedDate,
            time: formattedTime,
            proName: pro?.name || "seu barbeiro",
            shopName: shop.name
        };

        // 1. Enviar para o Cliente
        const msgClient = await generateWhatsAppMessage('immediate_confirmation', dataForMessage, shop.id, 'client');
        let clientOk = false;
        if (msgClient) {
            clientOk = await sendWhatsApp(apt.client_phone, msgClient, shop.whatsapp_instance);
            if (clientOk) {
                await logAutomatedMessage(shop.id, apt.client_name, apt.client_phone, 'Confirmação Imediata (Cliente)', 'sent');
            } else {
                await logAutomatedMessage(shop.id, apt.client_name, apt.client_phone, 'Confirmação Imediata (Cliente)', 'failed');
            }
        }

        // 2. Enviar para o Profissional (se tiver telefone)
        if (pro?.phone) {
            const msgPro = await generateWhatsAppMessage('immediate_confirmation', dataForMessage, shop.id, 'professional');
            if (msgPro) {
                const proOk = await sendWhatsApp(pro.phone, msgPro, shop.whatsapp_instance);
                if (proOk) {
                    await logAutomatedMessage(shop.id, pro.name, pro.phone, 'Notificação Profissional', 'sent');
                } else {
                    await logAutomatedMessage(shop.id, pro.name, pro.phone, 'Notificação Profissional', 'failed');
                }
            }
        }

        res.json({ success: clientOk });
    } catch (e: unknown) {
        console.error("Erro em sendAppointmentConfirmation:", e);
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};

export const testTemplate = async (req: Request, res: Response) => {
    try {
        const { phone, templateId } = req.body;
        const user = req.user;
        if (!user) return res.status(401).json({ error: 'Não autorizado' });

        const { data: template, error } = await supabaseAdmin.from('message_templates').select('*').eq('id', templateId).single();
        if (error || !template) return res.status(404).json({ error: 'Template não encontrado' });

        // Verificação de permissão: o usuário deve ser o dono da loja do template
        const { data: shop } = await supabaseAdmin.from('shops').select('name, owner_id, whatsapp_instance').eq('id', template.shop_id).single();
        
        if (!shop || shop.owner_id !== user.id) {
            return res.status(403).json({ error: 'Sem permissão para testar este template.' });
        }

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
    } catch (e: unknown) {
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};
