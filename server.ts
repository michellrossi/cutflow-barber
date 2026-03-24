
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiKey });

// 1. Ajuste da IA (Gemini)
async function generateWhatsAppMessage(type: 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'pro_notification', data: any) {
    try {
        // Usando o formato compatível com sua inicialização
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" }); 

        let prompt = `Crie uma mensagem de ${type} curta e profissional para barbearia. Cliente: ${data.clientName}, Serviço: ${data.services}, Data: ${data.date}, Hora: ${data.time}. Use emojis.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        return responseText;
    } catch (error) {
        console.error("Erro na IA (usando padrão):", error);
        // Fallback: Se a IA falhar, enviamos o texto básico para não dar erro 400 no WhatsApp
        return `Olá ${data.clientName}, confirmamos seu agendamento de ${data.services} para o dia ${data.date} às ${data.time}.`;
    }
}

// 2. Ajuste do Envio (WhatsApp)
async function sendWhatsApp(phone: string, message: string) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instance = process.env.WHATSAPP_INSTANCE;

    if (!apiUrl || !apiKey || !instance) return false;

    // LIMPEZA E AJUSTE DO NÚMERO (Problema do 9º dígito no Brasil)
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) cleanPhone = `55${cleanPhone}`;
    
    // Se o número tem 13 dígitos (55 + DDD + 9 dígitos), tentamos remover o 9 para o WhatsApp
    // Muitos JIDs de WhatsApp no Brasil não usam o 9 para DDDs baixos (11 a 28)
    let phoneToSubmit = cleanPhone;
    if (cleanPhone.length === 13) {
        const ddd = parseInt(cleanPhone.substring(2, 4));
        if (ddd <= 28) {
            phoneToSubmit = cleanPhone.substring(0, 4) + cleanPhone.substring(5);
        }
    }

    try {
        const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const url = `${baseUrl}/message/sendText/${instance}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({
                number: phoneToSubmit, // Número ajustado
                text: message,
                delay: 1200
            })
        });

        const result = await response.json();
        console.log(`[WhatsApp] Status: ${response.status} | Destino: ${phoneToSubmit}`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function startServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Logger global para depuração
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });

    const handleConfirmation = async (req: any, res: any) => {
        const { appointmentId } = req.body;
        console.log(`[API] Recebido pedido de notificação para agendamento: ${appointmentId}`);
        
        if (!appointmentId) {
            console.error("[API] Erro: appointmentId não fornecido no corpo da requisição");
            return res.status(400).json({ error: "appointmentId é obrigatório" });
        }

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
    };

    // API: Notificação de Confirmação
    app.route('/api/notify/confirmation')
        .get((req, res) => {
            res.send('API de Notificação está ativa! Use POST para disparar.');
        })
        .post(handleConfirmation);

    // Cron Job: Verificar Lembretes (Roda a cada 15 minutos)
    cron.schedule('*/15 * * * *', async () => {
        try {
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
        } catch (error) {
            console.error("Erro crítico no Cron Job:", error);
        }
    });

    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(__dirname, 'dist');
        console.log(`[Prod] Servindo arquivos estáticos de: ${distPath}`);
        app.use(express.static(distPath));
        app.get('*all', (req, res) => {
            const indexPath = path.join(distPath, 'index.html');
            res.sendFile(indexPath, (err) => {
                if (err) {
                    console.error(`[Prod] Erro ao enviar index.html: ${err.message}`);
                    res.status(500).send("Erro ao carregar a aplicação. Verifique se o build foi executado.");
                }
            });
        });
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
        console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
}

startServer().catch(err => {
    console.error("ERRO FATAL NA INICIALIZAÇÃO DO SERVIDOR:", err);
    process.exit(1);
});
