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
const ai = new GoogleGenAI({ apiKey: geminiKey });

/**
 * GERA MENSAGEM COM IA (GEMINI)
 * Ajustado para o SDK @google/genai conforme sua análise
 */
async function generateWhatsAppMessage(type: string, data: any) {
    try {
        const prompt = `Crie uma mensagem de ${type} para WhatsApp de uma barbearia. Use um tom descontraído, amigável e profissional. Use o nome do cliente: ${data.clientName} e mencione que o barbeiro ${data.proName} o está aguardando para fazer ${data.services} no dia ${data.date} às ${data.time}. Use emojis de barbearia.`;

        // Padrão correto para o SDK @google/genai
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-lite",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        // Retorna o texto gerado ou o fallback em caso de vazio
        return response.text || `Olá ${data.clientName}! Passando para confirmar seu horário de ${data.services} com ${data.proName} no dia ${data.date} às ${data.time}. Até logo! ✂️💈`;
    } catch (error) {
        console.error("Erro no Gemini (usando fallback):", error);
        return `Olá ${data.clientName}! Passando para confirmar seu horário de ${data.services} com ${data.proName} no dia ${data.date} às ${data.time}. Até logo! ✂️💈`;
    }
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

        const clientMessage = await generateWhatsAppMessage('confirmação', {
            clientName: apt.client_name,
            services: servicesNames,
            date: apt.date,
            time: apt.time,
            proName: apt.professionals?.name || "um de nossos profissionais"
        });

        const success = await sendWhatsApp(apt.client_phone, clientMessage, apt.shops?.whatsapp_instance);
        
        if (success) {
            await supabase.from('appointments').update({ confirmation_sent: true }).eq('id', appointmentId);
        }
        
        res.json({ success });
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
            .eq('status', 'confirmed')
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

                    const msg = await generateWhatsAppMessage('lembrete de 24 horas', {
                        clientName: apt.client_name,
                        services: servicesNames,
                        date: apt.date,
                        time: apt.time,
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
            .eq('status', 'confirmed')
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

                    const msg = await generateWhatsAppMessage('lembrete de 1 hora', {
                        clientName: apt.client_name,
                        services: servicesNames,
                        date: apt.date,
                        time: apt.time,
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