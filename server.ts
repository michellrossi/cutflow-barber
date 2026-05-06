import { createApp } from './app';

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        const app = await createApp();
        
        // Inicialização do Servidor
        app.listen(Number(PORT), '0.0.0.0', () => {
            console.log(`🚀 Servidor ativo na porta ${PORT}`);
            console.log('📅 Servidor pronto para receber triggers externos via /api/cron/run.');
        });
    } catch (err) {
        console.error("❌ Erro fatal ao iniciar o servidor:", err);
        process.exit(1);
    }
}

startServer();