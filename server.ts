import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import dayjs from 'dayjs';
import cron from 'node-cron';

// Configuração de Timezone
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
dayjs.extend(utc);
dayjs.extend(timezone);

dotenv.config();

// Rotas
import asaasRouter from './routes/asaas';
import whatsappRouter from './routes/whatsapp';
import saasRouter from './routes/saas-admin';
import cronRouter from './routes/cron';
import notifyRouter from './routes/notify';
import authRouter from './routes/auth';
import loyaltyRouter from './routes/loyalty';
import aiRouter from './routes/ai';
import insightsRouter from './routes/insights';
import { authenticate, requirePlan } from './middlewares/auth';
import { requireAdmin } from './middlewares/requireAdmin';

// Controllers (apenas para o node-cron interno)
import { runCronLogic } from './controllers/cronController';
import { supabaseAdmin } from './lib/supabase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

async function startServer() {
    const app = express();
    app.set('trust proxy', 1);

    // CORS
    const allowedOrigins = [
        'https://www.insightbarber.com.br',
        'https://insightbarber.com.br',
        process.env.SERVER_URL,
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
    ].filter(Boolean) as string[];

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.some(allowed => origin.startsWith(allowed))) return callback(null, true);
            return callback(new Error('Bloqueado pela política de CORS'), false);
        },
        credentials: true
    }));

    app.use(express.json());

    // Rate Limiting para rotas críticas
    const notifyLimiter = rateLimit({
        windowMs: 60_000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Muitas requisições. Aguarde 1 minuto.' }
    });

    app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

    // Registro das Rotas
    app.use('/api/asaas', asaasRouter);
    app.use('/api/whatsapp', whatsappRouter);
    app.use('/api/saas', requireAdmin, saasRouter);
    app.use('/api/cron', cronRouter);
    app.use('/api/notify', notifyLimiter, notifyRouter);
    app.use('/api/auth', authRouter); // Público
    app.use('/api/loyalty', authenticate, loyaltyRouter);
    app.use('/api/ai', authenticate, requirePlan('profissional'), aiRouter);
    app.use('/api/admin', authenticate, requirePlan('profissional'), insightsRouter);

    // Configuração de Ambiente (Vite vs Produção)
    if (process.env.NODE_ENV === 'production') {
        const distPath = path.join(__dirname, 'dist');
        app.use(express.static(distPath));
        app.use((req, res, next) => {
            if (req.accepts('html')) res.sendFile(path.join(distPath, 'index.html'));
            else next();
        });
    } else {
        const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
        app.use(vite.middlewares);
    }

    // Inicialização do Servidor
    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`🚀 Servidor ativo na porta ${PORT}`);

        // Agendamentos Internos (node-cron)
        // 1. Lembretes e Notificações (a cada 10 min)
        cron.schedule('*/10 * * * *', async () => {
            try { await runCronLogic(); } catch (err: any) { console.error('[node-cron] Erro no cron logic:', err.message); }
        });

        // 2. Limpeza de Rate Limit (a cada hora)
        cron.schedule('0 * * * *', async () => {
            const oneHourAgo = dayjs().subtract(1, 'hour').toISOString();
            await supabaseAdmin.from('whatsapp_chat_sessions').update({ message_count: 0 }).lt('last_message_at', oneHourAgo);
        });

        console.log('📅 Agendamentos internos (node-cron) iniciados.');
    });
}

startServer().catch(err => console.error("❌ Erro fatal ao iniciar o servidor:", err));