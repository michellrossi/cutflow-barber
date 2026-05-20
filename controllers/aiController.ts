import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateTemplate = async (req: Request, res: Response) => {
    try {
        const { trigger, shopName, tone } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Você é um copywriter especializado em marketing para barbearias. 
        Crie uma mensagem de WhatsApp para o gatilho de automação "${trigger}" de uma barbearia chamada "${shopName}". 
        O tom de voz deve ser ${tone || 'amigável e profissional'}. 
        Use obrigatoriamente as variáveis entre colchetes quando apropriado: [CLIENTE], [SERVICO], [DATA], [HORA], [BARBEIRO], [BARBEARIA]. 
        Retorne APENAS o texto final da mensagem, sem explicações ou aspas.`;

        const result = await model.generateContent(prompt);
        res.json({ success: true, text: result.response.text().trim() });
    } catch (e: unknown) {
        console.error('[AI] Error in generateTemplate:', e);
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};

export const generateImage = async (req: Request, res: Response) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt é obrigatório' });

        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
        res.json({ success: true, url });
    } catch (e: unknown) {
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};

export const getInsights = async (req: Request, res: Response) => {
    try {
        const { prompt, context, history } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });

        const genAI = new GoogleGenerativeAI(apiKey);

        const contextStr = JSON.stringify(context).slice(0, 12000);

        const systemInstruction = `Você é o "CutFlow Analytics AI", um consultor de inteligência de negócios especializado em barbearias.
        Analise os dados reais fornecidos abaixo e responda às perguntas do dono da barbearia de forma estratégica, objetiva e motivadora.
        
        DADOS DA BARBEARIA:
        ${contextStr}
        
        REGRAS:
        - Nunca invente dados. Use apenas o que foi fornecido no contexto.
        - Se o usuário pedir para gerar insights, destaque faturamento, conversão e performance dos barbeiros.
        - Seja direto ao ponto.`;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction 
        });

        // Filtra o histórico para garantir que a primeira mensagem seja do role 'user'
        const limitedHistory = (history || []).slice(-10);
        const formattedHistory = limitedHistory
            .filter((m: any) => m.content && m.content.trim())
            .map((m: any) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        // Garante que o histórico começa com 'user' (exigência da API Gemini)
        const safeHistory = formattedHistory.length > 0 && formattedHistory[0].role === 'model'
            ? formattedHistory.slice(1)
            : formattedHistory;

        const chat = model.startChat({
            history: safeHistory
        });

        const result = await chat.sendMessage(prompt);
        res.json({ success: true, answer: result.response.text().trim() });
    } catch (e: unknown) {
        console.error('[AI] Error in getInsights:', e);
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};
