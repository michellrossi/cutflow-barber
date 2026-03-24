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

// Configurações de Ambiente
const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiKey });

/**
 * GERA MENSAGEM COM IA (GEMINI)
 */
async function generateWhatsAppMessage(type: 'confirmation' | 'reminder_24h' | 'reminder_1h' | 'pro_notification', data: any) {
    try {
        let prompt = "";
        if (type === 'confirmation') {
            prompt = `Crie uma mensagem de confirmação de agendamento curta e amigável para WhatsApp. Cliente: ${data.clientName}, Serviço: ${data.services}, Data: ${data.date}, Hora: ${data.time}, Profissional: ${data.proName}. Use emojis.`;
        } else if (type === 'reminder_24h') {
            prompt = `Crie um lembrete de agendamento para amanhã. Cliente: ${data.clientName}, Serviço: ${data.services}, Hora: ${data.time}. Peça para avisar se precisar desmarcar. Use emojis.`;
        } else if (type === 'reminder_1h') {
            prompt = `Crie um lembrete urgente: falta 1 hora para o agendamento de ${data.clientName} (${data.services}) às ${data.time}. Use emojis.`;
        } else {
            prompt = `Notifique o profissional ${data.proName} sobre um novo agendamento de ${data.clientName} para ${data.services} em ${data.date} às ${data.time}.`;
        }

        // Padrão correto para o SDK @google/genai
        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        return result.text || `Olá ${data.clientName}, confirmamos seu agendamento de ${data.services} para ${data.date} às ${data.time}.`;
    } catch (error) {
        console.error("Erro ao gerar mensagem com Gemini:", error);
        return `Olá ${data.clientName}, confirmamos seu agendamento de ${data.services} para ${data.date} às ${data.time}.`;
    }
}

/**
 * ENVIA WHATSAPP VIA EVOLUTION API v2
 */
async function sendWhatsApp(phone: string, message: string) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instance = process.env.WHATSAPP_INSTANCE;

    if (!apiUrl || !apiKey || !instance) {
        console.error("ERRO: Variáveis de ambiente do WhatsApp não configuradas!");
        return false;
    }

    // 1. Limpeza do número
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) cleanPhone = `55${cleanPhone}`;

    // 2. Lógica do 9º Dígito (Evita PENDING infinito no WhatsApp)
    // Se o número tem 13 dígitos (55 + DDD + 9 dígitos), remove o 9 para DDDs 11-28
    let phoneToSubmit = cleanPhone;
    if (cleanPhone.length === 13) {
        const ddd = parseInt(cleanPhone.substring(2, 4));
        if (ddd <= 28) {
            phoneToSubmit = cleanPhone.substring(0, 4) + cleanPhone.substring(5);
        }
    }

    try {
        const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        // URL que funcionou no Postman (padrão v2.3.7)
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
        
        const result = await response.json();
        console.log(`[WhatsApp] Status: ${response.status} | Destino: ${phoneToSubmit}`);
        return response.ok;
    } catch (error) {
        console.error("Erro na requisição para Evolution API:", error);
        return false;
    }
}

async function startServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // API: Rota de Notificação
    app.post('/api/notify/confirmation', async (req, res) => {
        const { appointmentId } = req.body;
        console.log(`[API] Processando confirmação: ${appointmentId}`);
        
        const { data: apt, error } = await supabase
            .from('appointments')
            .select('*, professionals(name, phone)')
            .eq('id', appointmentId)
            .single();

        if (error || !apt) return res.status(404).json({ error: "Agendamento não encontrado" });

        // Gera e envia para o Cliente
        const clientMessage = await generateWhatsAppMessage('confirmation', {
            clientName: apt.client_name,
            services: "seu serviço",
            date: apt.date,
            time: apt.time,
            proName: apt.professionals?.name
        });
        const clientSent = await sendWhatsApp(apt.client_phone, clientMessage);

        // Notifica Profissional
        if (apt.professionals?.phone) {
            const proMessage = await generateWhatsAppMessage('pro_notification', {
                proName: apt.professionals.name,
                clientName: apt.client_name,
                services: "novo serviço",
                date: apt.date,
                time: apt.time
            });
            await sendWhatsApp(apt.professionals.phone, proMessage);
        }

        res.json({ success: clientSent });
    });

    // Configuração de Produção vs Desenvolvimento (Vite)
    if (process.env.NODE_ENV === 'production') {
        const distPath = path.join(__dirname, 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
    } else {
        const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
        app.use(vite.middlewares);
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}

startServer();