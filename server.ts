import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GERA MENSAGEM (TEMPLATE)
 * Removido Gemini do backend conforme diretrizes
 */
async function generateWhatsAppMessage(type: string, data: any) {
    if (type === 'link de acesso') {
        return `Olá ${data.clientName}! Aqui está seu link de acesso único para a barbearia: ${data.url}. Ele expira em 15 minutos e não deve ser compartilhado. 🔐💈`;
    }
    
    if (type === 'lembrete de 24 horas') {
        return `Olá ${data.clientName}! Passando para lembrar do seu horário de ${data.services} com ${data.proName} amanhã, dia ${data.date} às ${data.time}. Nos vemos lá! ✂️💈`;
    }

    if (type === 'lembrete de 1 hora') {
        return `Olá ${data.clientName}! Seu horário de ${data.services} com ${data.proName} é daqui a pouco, às ${data.time}. Já estamos te esperando! ✂️💈`;
    }

    return `Olá ${data.clientName}! Passando para confirmar seu horário de ${data.services} com ${data.proName} no dia ${data.date} às ${data.time}. Até logo! ✂️💈`;
}

/**
 * ENVIA WHATSAPP (EVOLUTION API V2)
 * Ajustado para o 9º dígito e URL de sucesso do seu Postman
 */
async function sendWhatsApp(phone: string, message: string, instanceName?: string) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instance = instanceName || process.env.WHATSAPP_INSTANCE || 'cutflow';

    if (!apiUrl || !apiKey) return false;

    // 1. Limpeza do número
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) cleanPhone = `55${cleanPhone}`;
    
    // 2. Lógica do 9º dígito para DDDs 11-28 (Evita ficar PENDING)
    const phoneToSubmit = cleanPhone;

    try {
        const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const url = `${baseUrl}/message/sendText/${instance}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'apikey': apiKey 
            },
            body: JSON.stringify({
                number: phoneToSubmit,
                text: message,
                delay: 1200,
                linkPreview: false
            })
        });
        
        console.log(`[WhatsApp] Status: ${response.status} | Destino: ${phoneToSubmit}`);
        return response.ok;
    } catch (error) {
        console.error("Erro na Evolution API:", error);
        return false;
    }
}

async function startServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Rota para Insights da IA (Admin)
    app.post('/api/admin/insights', async (req, res) => {
        const { prompt, context, history } = req.body;

        try {
            const systemInstruction = `Você é um consultor de negócios especializado em barbearias. 
            Você tem acesso aos dados reais da barbearia "${context.shopName}".
            
            DADOS ATUAIS:
            - Total de Agendamentos: ${context.totalAppointments}
            - Total de Clientes: ${context.totalClients}
            - Total de Profissionais: ${context.totalProfessionals}
            - Total de Serviços: ${context.totalServices}
            - Agendamentos nos últimos 30 dias: ${context.last30Days}
            - Receita Total (estimada): R$ ${context.revenue}
            - Status dos Agendamentos: Concluídos (${context.appointmentsByStatus.completed}), Cancelados (${context.appointmentsByStatus.cancelled}), Faltas (${context.appointmentsByStatus.noshow}), Agendados (${context.appointmentsByStatus.scheduled})
            - Ranking de Barbeiros: ${JSON.stringify(context.barberRanking)}

            INSTRUÇÕES:
            1. Responda de forma profissional, mas amigável.
            2. Use os dados fornecidos para dar respostas precisas.
            3. Se perguntarem algo que não está nos dados, diga que não tem essa informação específica no momento.
            4. Dê sugestões de melhoria baseadas nos números (ex: se houver muitos cancelamentos, sugira lembretes).
            5. Mantenha as respostas concisas e úteis.
            6. Use emojis relacionados a negócios e barbearia.`;

            const chatHistory = history.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            // Instancia o cliente dentro do handler para garantir a chave mais atual
            const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

            const response = await genAI.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [
                    ...chatHistory,
                    { role: 'user', parts: [{ text: prompt }] }
                ],
                config: {
                    systemInstruction: systemInstruction
                }
            });

            res.json({ success: true, answer: response.text });
        } catch (error: any) {
            console.error("Erro ao gerar insights:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Rota para Gerar Imagem de Serviço com IA
    app.post('/api/ai/generate-image', async (req, res) => {
        const { serviceName } = req.body;

        if (!serviceName) {
            return res.status(400).json({ success: false, error: "Nome do serviço é obrigatório" });
        }

        try {
            const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
            
            const prompt = `Uma foto profissional e de alta qualidade de um serviço de barbearia chamado "${serviceName}". 
            A imagem deve ser limpa, moderna, com iluminação de estúdio, focada no detalhe do serviço. 
            Estilo barbearia premium, tons amadeirados ou industriais, visual nítido. 
            Sem textos, sem logos.`;

            const response = await genAI.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        {
                            text: prompt,
                        },
                    ],
                },
                config: {
                    imageConfig: {
                        aspectRatio: "1:1",
                    },
                },
            });

            let base64Image = '';
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    base64Image = part.inlineData.data;
                    break;
                }
            }

            if (!base64Image) {
                throw new Error("Nenhuma imagem foi gerada pelo modelo.");
            }

            res.json({ 
                success: true, 
                image: `data:image/png;base64,${base64Image}` 
            });
        } catch (error: any) {
            console.error("Erro ao gerar imagem com IA:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Rota da API de Confirmação Imediata
    app.post('/api/notify/confirmation', async (req, res) => {
        const { appointmentId } = req.body;
        
        const { data: apt, error } = await supabase
            .from('appointments')
            .select('*, professionals(name, phone), shops(whatsapp_instance)')
            .eq('id', appointmentId)
            .single();

        if (error || !apt) return res.status(404).json({ error: "Agendamento não encontrado" });

        // Busca os nomes dos serviços
        const { data: servicesData } = await supabase
            .from('services')
            .select('name')
            .in('id', apt.service_ids || []);
        
        const servicesNames = servicesData?.map(s => s.name).join(', ') || "serviços";

        const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const formattedTime = apt.time.substring(0, 5);

        const clientMessage = await generateWhatsAppMessage('confirmação', {
            clientName: apt.client_name,
            services: servicesNames,
            date: formattedDate,
            time: formattedTime,
            proName: apt.professionals?.name || "um de nossos profissionais"
        });

        // Notifica o Cliente
        const clientOk = await sendWhatsApp(apt.client_phone, clientMessage, apt.shops?.whatsapp_instance);
        
        // Notifica o Barbeiro (se tiver telefone)
        if (apt.professionals?.phone) {
            const barberMessage = `*Novo Agendamento Confirmado!*\n\nCliente: ${apt.client_name}\nServiço: ${servicesNames}\nData: ${formattedDate}\nHora: ${formattedTime}`;
            await sendWhatsApp(apt.professionals.phone, barberMessage, apt.shops?.whatsapp_instance);
        }

        if (clientOk) {
            await supabase.from('appointments').update({ confirmation_sent: true }).eq('id', appointmentId);
        }
        
        res.json({ success: clientOk });
    });

    // Rota para enviar link de login via WhatsApp
    app.post('/api/notify/login-link', async (req, res) => {
        const { phone, url, shopId } = req.body;
        
        const { data: shop, error: shopError } = await supabase
            .from('shops')
            .select('name, whatsapp_instance')
            .eq('id', shopId)
            .single();

        if (shopError || !shop) return res.status(404).json({ error: "Loja não encontrada" });

        const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('shop_id', shopId)
            .eq('phone', phone)
            .maybeSingle();

        const msg = await generateWhatsAppMessage('link de acesso', {
            clientName: client?.name || "Cliente",
            url: url
        });

        const ok = await sendWhatsApp(phone, msg, shop.whatsapp_instance);
        res.json({ success: ok });
    });

    // Rota do CRON para Lembretes (24h e 1h)
    app.get('/api/notify/cron', async (req, res) => {
        console.log("[Cron] Iniciando verificação de lembretes...");
        
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

        // 1. Lembretes de 24 Horas
        // Agendamentos para amanhã que ainda não receberam o lembrete de 24h
        const { data: apts24h } = await supabase
            .from('appointments')
            .select('*, professionals(name), shops(whatsapp_instance)')
            .in('status', ['confirmed', 'scheduled'])
            .eq('confirmation_sent', true)
            .eq('reminder_24h_sent', false)
            .lte('date', tomorrow.toISOString().split('T')[0]);

        if (apts24h) {
            for (const apt of apts24h) {
                // Verifica se falta aproximadamente 24h ou menos
                const aptDateTime = new Date(`${apt.date}T${apt.time}`);
                const diffHours = (aptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                if (diffHours <= 24 && diffHours > 1) {
                    console.log(`[Cron] Enviando lembrete 24h para ${apt.client_name}`);
                    
                    const { data: servicesData } = await supabase.from('services').select('name').in('id', apt.service_ids || []);
                    const servicesNames = servicesData?.map(s => s.name).join(', ') || "serviços";

                    const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                    const formattedTime = apt.time.substring(0, 5);

                    const msg = await generateWhatsAppMessage('lembrete de 24 horas', {
                        clientName: apt.client_name,
                        services: servicesNames,
                        date: formattedDate,
                        time: formattedTime,
                        proName: apt.professionals?.name || "seu barbeiro"
                    });

                    const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);
                    if (ok) {
                        await supabase.from('appointments').update({ reminder_24h_sent: true }).eq('id', apt.id);
                    }
                }
            }
        }

        // 2. Lembretes de 1 Hora
        // Agendamentos para hoje que ainda não receberam o lembrete de 1h
        const { data: apts1h } = await supabase
            .from('appointments')
            .select('*, professionals(name), shops(whatsapp_instance)')
            .in('status', ['confirmed', 'scheduled'])
            .eq('confirmation_sent', true)
            .eq('reminder_1h_sent', false)
            .eq('date', now.toISOString().split('T')[0]);

        if (apts1h) {
            for (const apt of apts1h) {
                const aptDateTime = new Date(`${apt.date}T${apt.time}`);
                const diffMinutes = (aptDateTime.getTime() - now.getTime()) / (1000 * 60);

                if (diffMinutes <= 65 && diffMinutes > 0) {
                    console.log(`[Cron] Enviando lembrete 1h para ${apt.client_name}`);
                    
                    const { data: servicesData } = await supabase.from('services').select('name').in('id', apt.service_ids || []);
                    const servicesNames = servicesData?.map(s => s.name).join(', ') || "serviços";

                    const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                    const formattedTime = apt.time.substring(0, 5);

                    const msg = await generateWhatsAppMessage('lembrete de 1 hora', {
                        clientName: apt.client_name,
                        services: servicesNames,
                        date: formattedDate,
                        time: formattedTime,
                        proName: apt.professionals?.name || "seu barbeiro"
                    });

                    const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);
                    if (ok) {
                        await supabase.from('appointments').update({ reminder_1h_sent: true }).eq('id', apt.id);
                    }
                }
            }
        }

        res.json({ status: "Cron executado com sucesso" });
    });

    // --- WhatsApp Multi-Instance Endpoints ---

    app.post('/api/whatsapp/qrcode', async (req, res) => {
        const { shopId } = req.body;
        const apiUrl = process.env.WHATSAPP_API_URL;
        const apiKey = process.env.WHATSAPP_API_KEY;

        if (!apiUrl || !apiKey) return res.status(500).json({ error: "API de WhatsApp não configurada" });

        try {
            // 1. Garantir que a instância existe
            const instanceName = `shop-${shopId}`;
            
            // Tenta criar (se já existir, a API costuma retornar erro ou sucesso dependendo da versão, mas garantimos o nome)
            await fetch(`${apiUrl}/instance/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
                body: JSON.stringify({ instanceName, integration: "WHATSAPP-BAILEYS" })
            });

            // Salva o nome da instância no banco se ainda não tiver
            await supabase.from('shops').update({ whatsapp_instance: instanceName }).eq('id', shopId);

            // 2. Buscar QR Code
            const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
                headers: { 'apikey': apiKey }
            });
            const data = await response.json();

            if (data.base64) {
                res.json({ qrcode: data.base64 });
            } else if (data.instance?.state === 'open') {
                res.json({ connected: true });
            } else {
                res.status(400).json({ error: "Não foi possível gerar o QR Code. Verifique se a instância já está conectada." });
            }
        } catch (error: any) {
            console.error("Erro ao gerar QR Code:", error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/whatsapp/status', async (req, res) => {
        const { shopId } = req.body;
        const apiUrl = process.env.WHATSAPP_API_URL;
        const apiKey = process.env.WHATSAPP_API_KEY;

        try {
            const { data: shop } = await supabase.from('shops').select('whatsapp_instance').eq('id', shopId).single();
            if (!shop?.whatsapp_instance) return res.json({ connected: false });

            const response = await fetch(`${apiUrl}/instance/connectionState/${shop.whatsapp_instance}`, {
                headers: { 'apikey': apiKey }
            });
            const data = await response.json();
            
            const connected = data.instance?.state === 'open';
            
            // Atualiza o status no banco
            await supabase.from('shops').update({ whatsapp_connected: connected }).eq('id', shopId);

            res.json({ connected });
        } catch (error) {
            res.json({ connected: false });
        }
    });

    app.post('/api/whatsapp/disconnect', async (req, res) => {
        const { shopId } = req.body;
        const apiUrl = process.env.WHATSAPP_API_URL;
        const apiKey = process.env.WHATSAPP_API_KEY;

        try {
            const { data: shop } = await supabase.from('shops').select('whatsapp_instance').eq('id', shopId).single();
            if (!shop?.whatsapp_instance) return res.json({ success: true });

            await fetch(`${apiUrl}/instance/logout/${shop.whatsapp_instance}`, {
                method: 'DELETE',
                headers: { 'apikey': apiKey }
            });

            await supabase.from('shops').update({ whatsapp_connected: false }).eq('id', shopId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Configuração de Produção (Hospedagem Única no Railway)
    if (process.env.NODE_ENV === 'production') {
        const distPath = path.resolve(__dirname, 'dist');
        app.use(express.static(distPath));
        
        // SOLUÇÃO PARA O CRASH 502: 
        // Usamos um middleware de captura em vez de app.get('*') para evitar erro de sintaxe no path-to-regexp
        app.use((req, res, next) => {
            if (req.accepts('html')) {
                res.sendFile(path.join(distPath, 'index.html'));
            } else {
                next();
            }
        });
    } else {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`Servidor ativo na porta ${PORT}`);
        
        // Inicia o Cron Job interno (roda a cada 30 minutos)
        cron.schedule('*/30 * * * *', async () => {
            console.log("[Internal Cron] Executando verificação de lembretes...");
            try {
                // Faz uma chamada interna para a rota de cron
                const baseUrl = `http://localhost:${PORT}`;
                await fetch(`${baseUrl}/api/notify/cron`);
            } catch (err) {
                console.error("[Internal Cron] Erro ao disparar cron:", err);
            }
        });
    });
}

startServer().catch(err => {
    console.error("Erro ao iniciar servidor:", err);
});