import { createApp } from './app.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        const app = await createApp();
        
        // Inicialização do Servidor
        const server = app.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`🚀 Servidor ativo na porta ${PORT}`);
            console.log('📅 Servidor pronto para receber triggers externos via /api/cron/run.');
        });

        // Captura rejeições de promessas assíncronas globais
        process.on('unhandledRejection', (reason) => {
            console.error('[FATAL] Unhandled Rejection não tratada:', reason);
        });

        // Captura exceções síncronas fatais
        process.on('uncaughtException', (err) => {
            console.error('[FATAL] Uncaught Exception síncrona fatal:', err);
            server.close(() => process.exit(1));
        });

        // Desligamento gradual (Graceful shutdown)
        process.on('SIGTERM', () => {
            console.log('[SIGTERM] Sinal de encerramento recebido. Fechando conexões do servidor de forma gradual...');
            server.close(() => {
                console.log('💤 Servidor encerrado de forma limpa.');
                process.exit(0);
            });
        });
        
        process.on('SIGINT', () => {
            console.log('[SIGINT] Sinal de interrupção recebido (Ctrl+C). Fechando conexões do servidor...');
            server.close(() => {
                console.log('💤 Servidor encerrado de forma limpa.');
                process.exit(0);
            });
        });
    } catch (err) {
        console.error("❌ Erro fatal ao iniciar o servidor:", err);
        process.exit(1);
    }
}

startServer();