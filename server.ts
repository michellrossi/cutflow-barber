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

/**
 * GERA MENSAGEM COM IA (GEMINI)
 * Corrigido para o padrão ai.models.generateContent
 */
async function generateWhatsAppMessage(type: string, data: any) {
    try {
        let prompt = `Crie uma mensagem de ${type} curta e profissional para uma barbearia. Cliente: ${data.clientName}, Serviço: ${data.services}, Data: ${data.date}, Hora: ${data.time}. Use emojis.`;

        const result = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        // O SDK @google/genai retorna o texto dentro de result.text ou na estrutura de candidatos
        const messageText = result.text || `Olá ${data.clientName}, confirmamos seu agendamento de ${data.services} para ${data.date} às ${data.time}.`;
        return messageText;
    } catch (error) {
        console.error("Erro ao gerar mensagem com Gemini:", error);
        return `Olá ${data.clientName}, confirmamos seu agendamento de ${data.services} para ${data.date} às ${data.time}.`;
    }
}

/**
 * ENVIA WHATSAPP (EVOLUTION API V2)
 * Corrigido para tratar o 9º dígito e evitar PENDING infinito
 */
async function sendWhatsApp(phone: string, message: string) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instance = process.env.WHATSAPP_INSTANCE || 'cutflow';

    if (!apiUrl || !apiKey) return false;

    // Limpeza e formatação do número (Lógica do 9º dígito para DDDs 11-28)
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) cleanPhone = `55${cleanPhone}`;
    
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
        
        console.log(`[WhatsApp] Status: ${response.status} | Enviado para: ${phoneToSubmit}`);
        return response.ok;
    } catch (error) {
        console.error("Erro na requisição WhatsApp:", error);
        return false;
    }
}

async function startServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Rota de Notificação
    app.post('/api/notify/confirmation', async (req, res) => {
        const { appointmentId } = req.body;
        
        const { data: apt, error } = await supabase
            .from('appointments')
            .select('*, professionals(name, phone)')
            .eq('id', appointmentId)
            .single();

        if (error || !apt) return res.status(404).json({ error: "Agendamento não encontrado" });

        const clientMessage = await generateWhatsAppMessage('confirmação', {
            clientName: apt.client_name,
            services: "seu serviço",
            date: apt.date,
            time: apt.time,
            proName: apt.professionals?.name
        });

        const success = await sendWhatsApp(apt.client_phone, clientMessage);
        res.json({ success });
    });

    if (process.env.NODE_ENV === 'production') {
        const distPath = path.join(__dirname, 'dist');
        app.use(express.static(distPath));
        
        // CORREÇÃO DO CRASH: Usando '/*' em vez de '*' para evitar o PathError
        app.get('/*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    } else {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}

startServer().catch(console.error);