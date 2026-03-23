
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

async function generateWhatsAppMessage(type: 'confirmation' | 'reminder_24h' | 'reminder_1h', data: any) {
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
        } else {
            prompt = `Crie um lembrete urgente de agendamento para daqui a 1 hora. 
            Cliente: ${data.clientName}, Serviço: ${data.services}, Hora: ${data.time}.
            Diga que estamos ansiosos para vê-lo(a). Use emojis.`;
        }

        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
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

    if (!apiUrl || !apiKey) {
        console.log("--- SIMULAÇÃO WHATSAPP ---");
        console.log(`Para: ${phone}`);
        console.log(`Mensagem: ${message}`);
        console.log("--------------------------");
        return true;
    }

    try {
        // Exemplo genérico de integração com API de WhatsApp
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ phone, message })
        });
        return response.ok;
    } catch (error) {
        console.error("Erro ao enviar WhatsApp:", error);
        return false;
    }
}

async function startServer() {
    const app = express();
    app.use(express.json());

    // API: Enviar Confirmação Imediata
    app.post('/api/notify/confirmation', async (req, res) => {
        const { appointmentId } = req.body;
        
        const { data: apt, error } = await supabase
            .from('appointments')
            .select('*, shops(name), professionals(name)')
            .eq('id', appointmentId)
            .single();

        if (error || !apt) return res.status(404).json({ error: "Agendamento não encontrado" });

        // Buscar nomes dos serviços (simplificado para o exemplo)
        const servicesText = "seus serviços selecionados"; 

        const message = await generateWhatsAppMessage('confirmation', {
            clientName: apt.client_name,
            services: servicesText,
            date: apt.date,
            time: apt.time,
            proName: apt.professionals?.name
        });

        const sent = await sendWhatsApp(apt.client_phone, message);
        if (sent) {
            await supabase.from('appointments').update({ confirmation_sent: true }).eq('id', appointmentId);
        }

        res.json({ success: sent });
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
                const message = await generateWhatsAppMessage('reminder_24h', {
                    clientName: apt.client_name,
                    services: "seu horário",
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
                    const message = await generateWhatsAppMessage('reminder_1h', {
                        clientName: apt.client_name,
                        services: "seu horário",
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
