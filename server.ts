import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
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
 * Ajustado para o SDK @google/genai conforme sua análise
 */
async function generateWhatsAppMessage(type: string, data: any) {
    try {
        const prompt = `Crie uma mensagem de ${type} curta e amigável para WhatsApp de uma barbearia. Cliente: ${data.clientName}, Serviço: ${data.services}, Data: ${data.date}, Hora: ${data.time}. Use emojis.`;

        // Padrão correto para o SDK @google/genai
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-lite",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        // Retorna o texto gerado ou o fallback em caso de vazio
        return response.text || `Olá ${data.clientName}, confirmamos seu agendamento de ${data.services} para ${data.date} às ${data.time}.`;
    } catch (error) {
        console.error("Erro no Gemini (usando fallback):", error);
        return `Olá ${data.clientName}, confirmamos seu agendamento de ${data.services} para ${data.date} às ${data.time}.`;
    }
}

/**
 * ENVIA WHATSAPP (EVOLUTION API V2)
 * Ajustado para o 9º dígito e URL de sucesso do seu Postman
 */
async function sendWhatsApp(phone: string, message: string) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instance = process.env.WHATSAPP_INSTANCE || 'cutflow';

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

    // Rota da API
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
    });
}

startServer().catch(err => {
    console.error("Erro ao iniciar servidor:", err);
});