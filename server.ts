import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações base
const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validação de Segurança (antes de criar o client para evitar crash)
if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO CRÍTICO: Variáveis de ambiente faltando!");
}
if (!serviceRoleKey) {
    console.warn("⚠️ AVISO: SUPABASE_SERVICE_ROLE_KEY não configurada. O Cron Job pode falhar devido a RLS.");
}

// 2. Cliente Administrativo (Usa SERVICE_ROLE - Ignora RLS)
export const supabaseAdmin = createClient(supabaseUrl || 'https://placeholder.supabase.co', serviceRoleKey || 'placeholder');

/**
 * GERA MENSAGEM (TEMPLATE)
 * Busca do banco de dados usando supabaseAdmin para evitar bloqueios de RLS
 */
async function generateWhatsAppMessage(triggerId: string, data: any, shopId: string, target: string = 'client') {
    console.log(`[MessageGen] Buscando template para Gatilho: ${triggerId} | Loja: ${shopId} | Alvo: ${target}`);

    // 1. Tenta identificar se o triggerId é um slug (ex: 'appointment_reminder')
    // Se for um slug, tentamos encontrar um gatilho UUID correspondente no banco
    let effectiveTriggerId = triggerId;

    if (triggerId.length < 30) {
        const { data: relatedTriggers } = await supabaseAdmin
            .from('automation_triggers')
            .select('id, name')
            .eq('shop_id', shopId)
            .eq('active', true);

        if (relatedTriggers) {
            // Busca um gatilho cujo nome combine com o slug
            const match = relatedTriggers.find(t => {
                const name = t.name.toLowerCase();
                if (triggerId === 'appointment_reminder') return name.includes('lembrete');
                if (triggerId === 'immediate_confirmation') return name.includes('confirmação');
                if (triggerId === 'post_sale') return name.includes('pós-venda') || name.includes('avaliação');
                if (triggerId === 'rescheduling_request') return name.includes('reagendamento');
                if (triggerId === 'retention_30d') return name.includes('retenção') || name.includes('30 dias');
                return false;
            });

            if (match) {
                console.log(`[MessageGen] Slug '${triggerId}' mapeado para Gatilho ID: ${match.id} (${match.name})`);
                effectiveTriggerId = match.id;
            }
        }
    }

    // 2. Busca o modelo de mensagem
    let query = supabaseAdmin
        .from('message_templates')
        .select('content, title')
        .eq('shop_id', shopId)
        .eq('target', target)
        .eq('active', true);

    if (effectiveTriggerId.length > 30) {
        query = query.eq('trigger_id', effectiveTriggerId);
    } else {
        query = query.eq('trigger', effectiveTriggerId);
    }

    const { data: templateData } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    let content = templateData?.content;
    if (content) {
        console.log(`[MessageGen] Modelo encontrado: "${templateData?.title}"`);
    } else {
        console.log(`[MessageGen] Nenhum modelo customizado encontrado. Usando padrão do sistema.`);
    }


    // 3. Fallback: Se não achou no banco, usa padrões
    if (!content) {
        // Tenta obter o nome do gatilho para o fallback
        let triggerName = triggerId.toLowerCase();

        if (effectiveTriggerId.length > 30) {
            const { data: triggerObj } = await supabaseAdmin.from('automation_triggers').select('name').eq('id', effectiveTriggerId).maybeSingle();
            if (triggerObj) triggerName = triggerObj.name.toLowerCase();
        }

        if (triggerName.includes('confirmação') || triggerId === 'immediate_confirmation' || triggerId === 'link de acesso') {
            if (triggerId === 'link de acesso') {
                content = `Olá [CLIENTE]!\nAqui está seu link de acesso único para a barbearia: [URL].\nEle expira em 15 minutos e não deve ser compartilhado. 🔐💈`;
            } else {
                content = `Olá [CLIENTE]!\nSeu horário de [SERVICO] com [BARBEIRO] no dia [DATA] às [HORA] foi pré-agendado na [BARBEARIA]. Até logo! ✂️💈`;
            }
        } else if (triggerName.includes('lembrete') || triggerId === 'appointment_reminder') {
            content = `Olá [CLIENTE]!\nPassando para lembrar do seu horário de [SERVICO] com [BARBEIRO] em [DATA] às [HORA] na [BARBEARIA]. Nos vemos lá! ✂️💈`;
        } else if (triggerName.includes('pós-venda') || triggerName.includes('avaliação') || triggerId === 'post_sale') {
            content = `Olá [CLIENTE]!\nO que achou do seu atendimento hoje com [BARBEIRO]? Sua opinião é muito importante para nós da [BARBEARIA].`;
        } else if (triggerName.includes('reagendamento') || triggerId === 'rescheduling_request') {
            content = `Olá [CLIENTE], notamos que você não conseguiu comparecer ao seu horário de [SERVICO].\nGostaria de escolher uma nova data para seu atendimento na [BARBEARIA]?`;
        } else if (triggerId === 'retention_30d') {
            content = `Olá [CLIENTE]!\nFaz um tempo que não nos vemos na [BARBEARIA]. Que tal agendar um novo horário para manter o visual em dia?\n✂️💈`;
        } else if (triggerId === 'loyalty_reward') {
            content = `Olá [CLIENTE], parabéns!\nVocê atingiu a meta de fidelidade e ganhou um cupom de [DESCONTO]! Use o código: [CODIGO]. Validade: [VALIDADE] dias.`;
        } else {
            if (target === 'professional') {
                content = `💇‍♂️ *Novo Agendamento!*\nOlá [BARBEIRO], você tem um novo horário com [CLIENTE] para [SERVICO] no dia [DATA] às [HORA].`;
            } else {
                content = `Olá [CLIENTE]!\nSeu horário de [SERVICO] com [BARBEIRO] no dia [DATA] às [HORA] foi pré-agendado. Até logo! ✂️💈`;
            }
        }
    }

    if (!content) return ''; // Segurança final

    // Substituição de variáveis
    return content
        .replace(/\[CLIENTE\]/g, data.clientName || 'Cliente')
        .replace(/\[SERVICO\]/g, data.services || 'serviço')
        .replace(/\[DATA\]/g, data.date || '')
        .replace(/\[HORA\]/g, data.time || '')
        .replace(/\[BARBEIRO\]/g, data.proName || 'um de nossos profissionais')
        .replace(/\[BARBEARIA\]/g, data.shopName || 'nossa barbearia')
        .replace(/\[URL\]/g, data.url || '')
        .replace(/\[DESCONTO\]/g, data.discount || '')
        .replace(/\[CODIGO\]/g, data.code || '')
        .replace(/\[VALIDADE\]/g, data.validity || '');
}

/**
 * ENVIA WHATSAPP (EVOLUTION API V2)
 */
async function sendWhatsApp(phone: string, message: string, instanceName?: string) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instance = instanceName || process.env.WHATSAPP_INSTANCE || 'cutflow';

    if (!apiUrl || !apiKey) {
        console.warn("[WhatsApp] API não configurada (WHATSAPP_API_URL ou WHATSAPP_API_KEY ausente)");
        return false;
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) cleanPhone = `55${cleanPhone}`;

    try {
        const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const url = `${baseUrl}/message/sendText/${instance}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({
                number: cleanPhone,
                text: message,
                delay: 1200,
                linkPreview: false
            })
        });
        const resData = await response.json().catch(() => ({}));
        console.log(`[WhatsApp] Status: ${response.status} | Destino: ${cleanPhone} | Resposta:`, resData);
        return response.ok;
    } catch (error) {
        console.error("Erro na Evolution API:", error);
        return false;
    }
}

async function runCronLogic() {
    console.log("[Cron] Iniciando verificação de lembretes (Timezone SP - GMT-3)...");

    const nowUtc = new Date();
    const spTimeString = nowUtc.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const now = new Date(spTimeString);

    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgoStr = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;
    const thirtyThreeDaysAgo = new Date(now.getTime() - 33 * 24 * 60 * 60 * 1000);
    const thirtyThreeDaysAgoStr = `${thirtyThreeDaysAgo.getFullYear()}-${String(thirtyThreeDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyThreeDaysAgo.getDate()).padStart(2, '0')}`;

    const maxRetries = 3;

    // 1. Lembretes de 24 Horas
    const { data: apts24h } = await supabaseAdmin
        .from('appointments')
        .select('*, professionals(name), shops(id, name, whatsapp_instance)')
        .in('status', ['confirmed', 'scheduled'])
        .eq('reminder_24h_sent', false)
        .lte('send_attempts_24h', maxRetries - 1)
        .lte('date', tomorrowStr);

    if (apts24h) {
        for (const apt of apts24h) {
            const aptDateTime = new Date(`${apt.date}T${apt.time}`);
            const diffHours = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            if (diffHours <= 24 && diffHours > 1) {
                const { data: servicesData } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
                const servicesNames = servicesData?.map((s: any) => s.name).join(', ') || "serviços";
                const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const formattedTime = apt.time.substring(0, 5);

                const msg = await generateWhatsAppMessage('appointment_reminder', {
                    clientName: apt.client_name,
                    services: servicesNames,
                    date: formattedDate,
                    time: formattedTime,
                    proName: apt.professionals?.name || "seu barbeiro",
                    shopName: apt.shops?.name
                }, apt.shop_id);
                if (!msg) continue;
                const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);

                if (ok) {
                    await supabaseAdmin.from('appointments').update({ reminder_24h_sent: true }).eq('id', apt.id);
                } else {
                    const attempts = (apt.send_attempts_24h || 0) + 1;
                    await supabaseAdmin.from('appointments').update({ send_attempts_24h: attempts }).eq('id', apt.id);
                }
            }
        }
    }

    // 2. Lembretes de 1 Hora
    const { data: apts1h } = await supabaseAdmin
        .from('appointments')
        .select('*, professionals(name), shops(id, name, whatsapp_instance)')
        .in('status', ['confirmed', 'scheduled'])
        .eq('reminder_1h_sent', false)
        .lte('send_attempts_1h', maxRetries - 1)
        .eq('date', todayStr);

    if (apts1h) {
        for (const apt of apts1h) {
            const aptDateTime = new Date(`${apt.date}T${apt.time}`);
            const diffMinutes = (aptDateTime.getTime() - now.getTime()) / (1000 * 60);
            if (diffMinutes <= 65 && diffMinutes > 0) {
                const { data: servicesData } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
                const servicesNames = servicesData?.map((s: any) => s.name).join(', ') || "serviços";
                const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const formattedTime = apt.time.substring(0, 5);

                const msg = await generateWhatsAppMessage('appointment_reminder', {
                    clientName: apt.client_name,
                    services: servicesNames,
                    date: formattedDate,
                    time: formattedTime,
                    proName: apt.professionals?.name || "seu barbeiro",
                    shopName: apt.shops?.name
                }, apt.shop_id);
                if (!msg) continue;
                const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);

                if (ok) {
                    await supabaseAdmin.from('appointments').update({ reminder_1h_sent: true }).eq('id', apt.id);
                } else {
                    const attempts = (apt.send_attempts_1h || 0) + 1;
                    await supabaseAdmin.from('appointments').update({ send_attempts_1h: attempts }).eq('id', apt.id);
                }
            }
        }
    }

    // 3. Reagendamento
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    const { data: aptsReschedule } = await supabaseAdmin
        .from('appointments')
        .select('*, professionals(name), shops(id, name, whatsapp_instance)')
        .in('status', ['cancelled', 'noshow'])
        .eq('rescheduling_sent', false)
        .lte('send_attempts_reschedule', maxRetries - 1)
        .gte('date', twoDaysAgoStr);

    if (aptsReschedule) {
        for (const apt of aptsReschedule) {
            const { data: servicesData } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
            const servicesNames = servicesData?.map((s: any) => s.name).join(', ') || "serviços";
            const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const formattedTime = apt.time.substring(0, 5);

            const msg = await generateWhatsAppMessage('rescheduling_request', {
                clientName: apt.client_name,
                services: servicesNames,
                date: formattedDate,
                time: formattedTime,
                proName: apt.professionals?.name || "seu barbeiro",
                shopName: apt.shops?.name
            }, apt.shop_id);
            if (!msg) continue;
            const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);

            if (ok) {
                await supabaseAdmin.from('appointments').update({ rescheduling_sent: true }).eq('id', apt.id);
            } else {
                const attempts = (apt.send_attempts_reschedule || 0) + 1;
                await supabaseAdmin.from('appointments').update({ send_attempts_reschedule: attempts }).eq('id', apt.id);
            }
        }
    }

    // 4. Pós-venda
    const { data: aptsPostSale } = await supabaseAdmin
        .from('appointments')
        .select('*, professionals(name), shops(id, name, whatsapp_instance)')
        .eq('status', 'completed')
        .eq('post_sale_sent', false)
        .lte('send_attempts_postsale', maxRetries - 1)
        .eq('date', todayStr);

    if (aptsPostSale) {
        for (const apt of aptsPostSale) {
            const aptDateTime = new Date(`${apt.date}T${apt.time}`);
            const diffMinutes = (now.getTime() - aptDateTime.getTime()) / (1000 * 60);
            if (diffMinutes >= 120 && diffMinutes < 1440) {
                const { data: servicesData } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
                const servicesNames = servicesData?.map((s: any) => s.name).join(', ') || "serviços";
                const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const formattedTime = apt.time.substring(0, 5);

                const msg = await generateWhatsAppMessage('post_sale', {
                    clientName: apt.client_name,
                    services: servicesNames,
                    date: formattedDate,
                    time: formattedTime,
                    proName: apt.professionals?.name || "seu barbeiro",
                    shopName: apt.shops?.name
                }, apt.shop_id);
                if (!msg) continue;
                const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);

                if (ok) {
                    await supabaseAdmin.from('appointments').update({ post_sale_sent: true }).eq('id', apt.id);
                } else {
                    const attempts = (apt.send_attempts_postsale || 0) + 1;
                    await supabaseAdmin.from('appointments').update({ send_attempts_postsale: attempts }).eq('id', apt.id);
                }
            }
        }
    }

    // 5. Retenção 30 Dias
    const { data: apts30d } = await supabaseAdmin
        .from('appointments')
        .select('*, shops(id, name, whatsapp_instance)')
        .eq('status', 'completed')
        .eq('reminder_30d_sent', false)
        .lte('send_attempts_30d', maxRetries - 1)
        .lte('date', thirtyDaysAgoStr)
        .gte('date', thirtyThreeDaysAgoStr);

    if (apts30d) {
        for (const apt of apts30d) {
            const msg = await generateWhatsAppMessage('retention_30d', {
                clientName: apt.client_name,
                shopName: apt.shops?.name
            }, apt.shop_id);
            if (!msg) continue;
            const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);

            if (ok) {
                await supabaseAdmin.from('appointments').update({ reminder_30d_sent: true }).eq('id', apt.id);
            } else {
                const attempts = (apt.send_attempts_30d || 0) + 1;
                await supabaseAdmin.from('appointments').update({ send_attempts_30d: attempts }).eq('id', apt.id);
            }
        }
    }
}

async function startServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    const notifyLimiter = rateLimit({
        windowMs: 60_000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Muitas requisições. Aguarde 1 minuto.' }
    });
    app.use('/api/notify/', notifyLimiter);
    app.use('/api/loyalty/', notifyLimiter);

    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    app.post('/api/notify/test', async (req, res) => {
        const { phone, templateId } = req.body;
        if (!phone || !templateId) return res.status(400).json({ error: "Telefone e ID do modelo são obrigatórios" });

        try {
            const { data: template } = await supabaseAdmin.from('message_templates').select('*').eq('id', templateId).single();
            if (!template) return res.status(404).json({ error: "Modelo não encontrado" });

            const { data: shop } = await supabaseAdmin.from('shops').select('name, whatsapp_instance').eq('id', template.shop_id).single();

            const testData = {
                clientName: "Cliente de Teste",
                services: "Corte e Barba (Teste)",
                date: new Date().toLocaleDateString('pt-BR'),
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                proName: "Barbeiro de Teste",
                shopName: shop?.name || "Minha Barbearia",
                url: "https://google.com"
            };
            const message = await generateWhatsAppMessage(template.trigger_id || template.trigger, testData, template.shop_id);
            const ok = await sendWhatsApp(phone, message, shop?.whatsapp_instance);
            res.json({ success: ok });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/admin/insights', async (req, res) => {
        const { prompt, context, history } = req.body;
        try {
            const systemInstruction = `Você é um consultor de negócios especializado em barbearias. Use os dados de "${context.shopName}".`;
            const chatHistory = history.map((msg: any) => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] }));

            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-3-flash-preview",
                systemInstruction
            });

            const result = await model.generateContent({
                contents: [...chatHistory, { role: 'user', parts: [{ text: prompt }] }],
            });
            const response = await result.response;

            res.json({ success: true, answer: response.text() || '' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/ai/generate-template', async (req, res) => {
        const { trigger, shopName, tone } = req.body;
        try {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

            const promptContent = `Crie um modelo de mensagem de WhatsApp para uma barbearia chamada "${shopName}". 
            O gatilho da mensagem é: "${trigger}". 
            O tom deve ser: "${tone}".
            Use as seguintes variáveis: [CLIENTE], [SERVICO], [DATA], [HORA], [BARBEIRO], [BARBEARIA].
            Retorne apenas o texto da mensagem, sem explicações.`;

            const result = await model.generateContent(promptContent);
            const response = await result.response;

            res.json({ success: true, text: response.text() || '' });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/notify/confirmation', async (req, res) => {
        const { appointmentId } = req.body;
        const { data: apt } = await supabaseAdmin.from('appointments').select('*, professionals(name, phone), shops(id, name, whatsapp_instance)').eq('id', appointmentId).single();

        if (!apt || apt.confirmation_sent) return res.json({ success: true });

        const { data: servicesData } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
        const servicesNames = servicesData?.map(s => s.name).join(', ') || "serviços";
        const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const formattedTime = apt.time.substring(0, 5);

        const clientMessage = await generateWhatsAppMessage('immediate_confirmation', {
            clientName: apt.client_name,
            services: servicesNames,
            date: formattedDate,
            time: formattedTime,
            proName: apt.professionals?.name || "um de nossos profissionais",
            shopName: apt.shops?.name
        }, apt.shop_id, 'client');

        if (clientMessage) {
            const clientOk = await sendWhatsApp(apt.client_phone, clientMessage, apt.shops?.whatsapp_instance);
            if (clientOk) await supabaseAdmin.from('appointments').update({ confirmation_sent: true }).eq('id', appointmentId);
        }

        if (apt.professionals?.phone) {
            const proMessage = await generateWhatsAppMessage('immediate_confirmation', {
                clientName: apt.client_name,
                services: servicesNames,
                date: formattedDate,
                time: formattedTime,
                proName: apt.professionals.name,
                shopName: apt.shops?.name
            }, apt.shop_id, 'professional');

            if (proMessage) {
                await sendWhatsApp(apt.professionals.phone, proMessage, apt.shops?.whatsapp_instance);
            }
        }

        res.json({ success: true });
    });

    app.post('/api/loyalty/check-reward', async (req, res) => {
        const { clientId, shopId } = req.body;
        try {
            const { data: client } = await supabaseAdmin.from('clients').select('*').eq('id', clientId).single();
            const { data: settings } = await supabaseAdmin.from('settings').select('*').eq('shop_id', shopId).single();
            const { data: shop } = await supabaseAdmin.from('shops').select('name, whatsapp_instance').eq('id', shopId).single();

            if (!client || !settings?.loyalty_enabled || client.loyalty_points < settings.loyalty_points_goal) return res.json({ success: false });

            const couponCode = `${client.name.split(' ')[0]}${client.phone.slice(-4)}${new Date().getDate()}`.toUpperCase();
            await supabaseAdmin.from('coupons').insert({
                shop_id: shopId, client_id: clientId, code: couponCode,
                discount_value: settings.loyalty_reward_value, discount_type: settings.loyalty_reward_type,
                expires_at: new Date(Date.now() + settings.loyalty_reward_validity_days * 24 * 60 * 60 * 1000).toISOString(),
                is_loyalty_reward: true
            });
            await supabaseAdmin.from('clients').update({ loyalty_points: 0 }).eq('id', clientId);

            const msg = await generateWhatsAppMessage('loyalty_reward', {
                clientName: client.name, discount: `${settings.loyalty_reward_value}${settings.loyalty_reward_type === 'percentage' ? '%' : ' R$'}`,
                code: couponCode, validity: settings.loyalty_reward_validity_days, shopName: shop?.name
            }, shopId);
            if (msg) {
                await sendWhatsApp(client.phone, msg, shop?.whatsapp_instance);
            }
            res.json({ success: true, couponCode });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/notify/login-link', async (req, res) => {
        const { phone, url, shopId } = req.body;
        const { data: shop } = await supabaseAdmin.from('shops').select('name, whatsapp_instance').eq('id', shopId).single();
        const { data: client } = await supabaseAdmin.from('clients').select('name').eq('shop_id', shopId).eq('phone', phone).maybeSingle();

        if (!shop) return res.status(404).json({ error: "Loja não encontrada" });

        const msg = await generateWhatsAppMessage('link de acesso', { clientName: client?.name || "Cliente", url, shopName: shop.name }, shopId);
        if (msg) {
            const ok = await sendWhatsApp(phone, msg, shop.whatsapp_instance);
            res.json({ success: ok });
        } else {
            res.json({ success: false, error: "Gatilho desativado" });
        }
    });

    app.get('/api/notify/cron', async (req, res) => {
        try {
            await runCronLogic();
            res.json({ status: "Cron executado com sucesso" });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/whatsapp/qrcode', async (req, res) => {
        const { shopId } = req.body;
        const instanceName = `shop-${shopId}`;
        try {
            await fetch(`${process.env.WHATSAPP_API_URL}/instance/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': process.env.WHATSAPP_API_KEY || '' },
                body: JSON.stringify({ instanceName, integration: "WHATSAPP-BAILEYS" })
            });
            await supabaseAdmin.from('shops').update({ whatsapp_instance: instanceName }).eq('id', shopId);
            const response = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connect/${instanceName}`, { headers: { 'apikey': process.env.WHATSAPP_API_KEY || '' } });
            const data = await response.json();
            res.json({ qrcode: data.base64, connected: data.instance?.state === 'open' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/whatsapp/status', async (req, res) => {
        const { shopId } = req.body;
        try {
            const { data: shop } = await supabaseAdmin.from('shops').select('whatsapp_instance').eq('id', shopId).single();
            if (!shop?.whatsapp_instance) return res.json({ connected: false });
            const r = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connectionState/${shop.whatsapp_instance}`,
                { headers: { apikey: process.env.WHATSAPP_API_KEY || '' } });
            const d = await r.json();
            const connected = d.instance?.state === 'open';
            await supabaseAdmin.from('shops').update({ whatsapp_connected: connected }).eq('id', shopId);
            res.json({ connected });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/whatsapp/disconnect', async (req, res) => {
        const { shopId } = req.body;
        try {
            const { data: shop } = await supabaseAdmin.from('shops').select('whatsapp_instance').eq('id', shopId).single();
            if (!shop?.whatsapp_instance) return res.json({ success: true });
            await fetch(`${process.env.WHATSAPP_API_URL}/instance/logout/${shop.whatsapp_instance}`,
                { method: 'DELETE', headers: { apikey: process.env.WHATSAPP_API_KEY || '' } });
            await supabaseAdmin.from('shops').update({ whatsapp_connected: false }).eq('id', shopId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    if (process.env.NODE_ENV === 'production') {
        const distPath = path.resolve(__dirname, 'dist');
        app.use(express.static(distPath));
        app.use((req, res, next) => {
            if (req.accepts('html')) res.sendFile(path.join(distPath, 'index.html'));
            else next();
        });
    } else {
        const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
        app.use(vite.middlewares);
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`Servidor ativo na porta ${PORT}`);
    });
}

startServer().catch(err => console.error("Erro ao iniciar servidor:", err));
