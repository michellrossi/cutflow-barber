
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const PORT = 3000;
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiKey });

async function generateWhatsAppMessage(type: 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'pro_notification', data: any) {
    try {
        let prompt = "";
        if (type === 'confirmation') {
            prompt = `Crie uma mensagem de confirmação de agendamento curta e amigável para WhatsApp. 
            Cliente: ${data.clientName}, Serviço: ${data.services}, Data: ${data.date}, Hora: ${data.time}, Profissional: ${data.proName}.
            Inclua um tom acolhedor e profissional. Use emojis.`;
        } else if (type === 'reminder_24h') {
            prompt = `Crie um lembrete de agendamento para daqui a 24 horas. 
            Cliente: ${data.clientName}, Serviço: ${data.services}, Data: ${data.date}, Hora: ${data.time}.
            Peça para avisar com antecedência caso precise desmarcar. Use emojis.`;
        } else if (type === 'reminder_1h') {
            prompt = `Crie um lembrete urgente de agendamento para daqui a 1 hora. 
            Cliente: ${data.clientName}, Serviço: ${data.services}, Hora: ${data.time}.
            Diga que estamos ansiosos para vê-lo(a). Use emojis.`;
        } else if (type === 'pro_notification') {
            prompt = `Crie uma notificação para o profissional sobre um NOVO agendamento. 
            Profissional: ${data.proName}, Cliente: ${data.clientName}, Serviço: ${data.services}, Data: ${data.date}, Hora: ${data.time}.
            Seja direto e informativo. Use emojis.`;
        }

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
        });
        return response.text;
    } catch (error) {
        console.error("Erro ao gerar mensagem com Gemini:", error);
        return `Olá ${data.clientName}, confirmamos seu agendamento de ${data.services} para ${data.date} às ${data.time}.`;
    }
}

async function sendWhatsApp(phone: string, message: string) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instance = process.env.WHATSAPP_INSTANCE;

    console.log(`[WhatsApp] Tentando enviar para ${phone}. API: ${apiUrl ? 'OK' : 'MISSING'}, Key: ${apiKey ? 'OK' : 'MISSING'}, Instance: ${instance ? 'OK' : 'MISSING'}`);

    if (!apiUrl || !apiKey || !instance) {
        console.error("ERRO: Variáveis de ambiente do WhatsApp não configuradas!");
        return false;
    }

    // Limpar URL para evitar barras duplas
    const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const url = `${cleanApiUrl}/message/sendText/${instance}`;
    
    console.log(`[WhatsApp] Tentando enviar para ${phone}. URL: ${url}`);

    // Formatação para garantir o padrão internacional (55 + DDD + Numero)
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    try {
        console.log(`[WhatsApp] Enviando POST para ${url}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'apikey': apiKey 
            },
            body: JSON.stringify({
                number: formattedPhone,
                text: message,
                delay: 1200,
                linkPreview: false
            })
        });
        
        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            result = responseText;
        }
        
        console.log(`[WhatsApp] Resposta da API (${response.status}):`, typeof result === 'string' ? result : JSON.stringify(result));
        return response.ok;
    } catch (error) {
        console.error("Erro na requisição para Evolution API:", error);
        return false;
    }
}

async function startServer() {
    const app = express();
    app.use(express.json());

    // API: Enviar Confirmação Imediata
    app.post('/api/notify/confirmation', async (req, res) => {
        const { appointmentId } = req.body;
        console.log(`[API] Recebido pedido de notificação para agendamento: ${appointmentId}`);
        
        const { data: apt, error } = await supabase
            .from('appointments')
            .select('*, shops(name), professionals(name, phone)')
            .eq('id', appointmentId)
            .single();

        if (error || !apt) {
            console.error(`[API] Erro ao buscar agendamento ${appointmentId}:`, error);
            return res.status(404).json({ error: "Agendamento não encontrado" });
        }

        // Buscar nomes dos serviços
        let servicesText = "seus serviços selecionados";
        if (apt.service_ids && apt.service_ids.length > 0) {
            const { data: services } = await supabase
                .from('services')
                .select('name')
                .in('id', apt.service_ids);
            
            if (services && services.length > 0) {
                servicesText = services.map(s => s.name).join(', ');
            }
        }

        // 1. Notificar Cliente
        const clientMessage = await generateWhatsAppMessage('confirmation', {
            clientName: apt.client_name,
            services: servicesText,
            date: apt.date,
            time: apt.time,
            proName: apt.professionals?.name
        });

        const clientSent = await sendWhatsApp(apt.client_phone, clientMessage);
        if (clientSent) {
            await supabase.from('appointments').update({ confirmation_sent: true }).eq('id', appointmentId);
            console.log(`[API] Confirmação enviada para o cliente: ${apt.client_name}`);
        }

        // 2. Notificar Profissional (se tiver telefone cadastrado)
        if (apt.professionals?.phone) {
            const proMessage = await generateWhatsAppMessage('pro_notification', {
                proName: apt.professionals.name,
                clientName: apt.client_name,
                services: servicesText,
                date: apt.date,
                time: apt.time
            });
            const proSent = await sendWhatsApp(apt.professionals.phone, proMessage);
            if (proSent) {
                console.log(`[API] Notificação enviada para o profissional: ${apt.professionals.name}`);
            }
        }

        res.json({ success: clientSent });
    });

    // Cron Job: Verificar Lembretes (Roda a cada 15 minutos)
    cron.schedule('*/15 * * * *', async () => {
        console.log("Checando lembretes automáticos...");
        const now = new Date();
        
        // Lembrete 24h
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        const { data: apts24h } = await supabase
            .from('appointments')
            .select('*, professionals(name)')
            .eq('date', tomorrowStr)
            .eq('reminder_24h_sent', false)
            .eq('status', 'scheduled');

        if (apts24h) {
            for (const apt of apts24h) {
                // Buscar nomes dos serviços
                let servicesText = "seu horário";
                if (apt.service_ids && apt.service_ids.length > 0) {
                    const { data: services } = await supabase
                        .from('services')
                        .select('name')
                        .in('id', apt.service_ids);
                    
                    if (services && services.length > 0) {
                        servicesText = services.map(s => s.name).join(', ');
                    }
                }

                const message = await generateWhatsAppMessage('reminder_24h', {
                    clientName: apt.client_name,
                    services: servicesText,
                    date: apt.date,
                    time: apt.time
                });
                if (await sendWhatsApp(apt.client_phone, message)) {
                    await supabase.from('appointments').update({ reminder_24h_sent: true }).eq('id', apt.id);
                }
            }
        }

        // Lembrete 1h (Lógica simplificada: busca agendamentos para hoje com hora próxima)
        const todayStr = now.toISOString().split('T')[0];
        const { data: apts1h } = await supabase
            .from('appointments')
            .select('*, professionals(name)')
            .eq('date', todayStr)
            .eq('reminder_1h_sent', false)
            .eq('status', 'scheduled');

        if (apts1h) {
            for (const apt of apts1h) {
                const [h, m] = apt.time.split(':').map(Number);
                const aptTime = new Date(now);
                aptTime.setHours(h, m, 0, 0);
                
                const diffMs = aptTime.getTime() - now.getTime();
                const diffMins = diffMs / (1000 * 60);

                if (diffMins > 0 && diffMins <= 60) {
                    // Buscar nomes dos serviços
                    let servicesText = "seu horário";
                    if (apt.service_ids && apt.service_ids.length > 0) {
                        const { data: services } = await supabase
                            .from('services')
                            .select('name')
                            .in('id', apt.service_ids);
                        
                        if (services && services.length > 0) {
                            servicesText = services.map(s => s.name).join(', ');
                        }
                    }

                    const message = await generateWhatsAppMessage('reminder_1h', {
                        clientName: apt.client_name,
                        services: servicesText,
                        time: apt.time
                    });
                    if (await sendWhatsApp(apt.client_phone, message)) {
                        await supabase.from('appointments').update({ reminder_1h_sent: true }).eq('id', apt.id);
                    }
                }
            }
        }
    });

    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        app.use(express.static(path.join(__dirname, 'dist')));
        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'dist', 'index.html'));
        });
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

startServer();
