import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import * as dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações base
const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

// 1. Cliente comum (Usa ANON_KEY - Respeita RLS)
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Cliente Administrativo (Usa SERVICE_ROLE - Ignora RLS)
export const supabaseAdmin = createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Validação de Segurança
if (!supabaseUrl || !supabaseKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ ERRO CRÍTICO: Variáveis de ambiente faltando!");
}

/**
 * GERA MENSAGEM (TEMPLATE)
 */
async function generateWhatsAppMessage(trigger: string, data: any, shopId: string, delayValue?: number, delayUnit?: string) {
    let query = supabaseAdmin
        .from('message_templates')
        .select('content')
        .eq('shop_id', shopId)
        .eq('trigger', trigger)
        .eq('active', true);

    if (delayValue !== undefined) query = query.eq('delay_value', delayValue);
    if (delayUnit !== undefined) query = query.eq('delay_unit', delayUnit);

    const { data: templateData } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    let content = templateData?.content;

    if (!content) {
        if (trigger === 'link de acesso') {
            content = `Olá [CLIENTE]!\nAqui está seu link de acesso único para a barbearia: [URL].`;
        } else if (trigger === 'appointment_reminder' || trigger === 'lembrete de 24 horas' || trigger === 'lembrete de 1 hora') {
            content = `Olá [CLIENTE]!\nLembrando do seu horário de [SERVICO] com [BARBEIRO] em [DATA] às [HORA].`;
        } else {
            content = `Olá [CLIENTE]!\nConfirmação do seu horário de [SERVICO] na [BARBEARIA].`;
        }
    }

    return content
        .replace(/\[CLIENTE\]/g, data.clientName || 'Cliente')
        .replace(/\[SERVICO\]/g, data.services || 'serviço')
        .replace(/\[DATA\]/g, data.date || '')
        .replace(/\[HORA\]/g, data.time || '')
        .replace(/\[BARBEIRO\]/g, data.proName || 'barbeiro')
        .replace(/\[BARBEARIA\]/g, data.shopName || 'barbearia')
        .replace(/\[URL\]/g, data.url || '');
}

/**
 * ENVIA WHATSAPP
 */
async function sendWhatsApp(phone: string, message: string, instanceName?: string) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instance = instanceName || process.env.WHATSAPP_INSTANCE || 'cutflow';

    if (!apiUrl || !apiKey) return false;

    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) cleanPhone = `55${cleanPhone}`;

    try {
        const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({ number: cleanPhone, text: message })
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

/**
 * LÓGICA DO CRON
 */
async function runCronLogic() {
    console.log("[Cron] Verificando lembretes...");
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Lembretes de 24h
    const { data: apts24h } = await supabaseAdmin
        .from('appointments')
        .select('*, professionals(name), shops(id, name, whatsapp_instance)')
        .in('status', ['confirmed', 'scheduled'])
        .eq('confirmation_sent', true)
        .eq('reminder_24h_sent', false)
        .lte('date', tomorrowStr);

    if (apts24h) {
        for (const apt of apts24h) {
            const msg = await generateWhatsAppMessage('appointment_reminder', {
                clientName: apt.client_name,
                shopName: apt.shops?.name
            }, apt.shop_id);
            const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);
            if (ok) await supabaseAdmin.from('appointments').update({ reminder_24h_sent: true }).eq('id', apt.id);
        }
    }
}

/**
 * INICIALIZAÇÃO DO SERVIDOR
 */
async function startServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    // Rota Cron protegida
    app.get('/api/notify/cron', async (req, res) => {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: "Não autorizado" });
        }
        try {
            await runCronLogic();
            res.json({ success: true });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // Insights IA
    app.post('/api/admin/insights', async (req, res) => {
        const { prompt, context } = req.body;
        try {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(`Contexto: Barbearia ${context.shopName}. Pergunta: ${prompt}`);
            res.json({ success: true, answer: result.response.text() });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // Configuração de Produção
    if (process.env.NODE_ENV === 'production') {
        const distPath = path.resolve(__dirname, 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            if (req.accepts('html')) res.sendFile(path.join(distPath, 'index.html'));
        });
    } else {
        const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
        app.use(vite.middlewares);
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`Servidor ativo na porta ${PORT}`);
    });
}

// Execução
startServer().catch(err => console.error("Erro ao iniciar servidor:", err));