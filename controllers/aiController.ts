import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Singleton lazy para a instância do GoogleGenerativeAI
let genAIInstance: GoogleGenerativeAI | null = null;

const getGenAI = (): GoogleGenerativeAI => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY não configurada');
    }
    if (!genAIInstance) {
        genAIInstance = new GoogleGenerativeAI(apiKey);
    }
    return genAIInstance;
};

export const generateTemplate = async (req: Request, res: Response) => {
    try {
        const { trigger, shopName, tone } = req.body;
        
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `Você é um copywriter especializado em marketing para barbearias. 
        Crie uma mensagem de WhatsApp para o gatilho de automação "${trigger}" de uma barbearia chamada "${shopName}". 
        O tom de voz deve ser ${tone || 'amigável e profissional'}. 
        Use obrigatoriamente as variáveis entre colchetes quando apropriado: [CLIENTE], [SERVICO], [DATA], [HORA], [BARBEIRO], [BARBEARIA]. 
        Retorne APENAS o texto final da mensagem, sem explicações ou aspas.`;

        // AbortController para cancelar a chamada ao Gemini se o cliente desconectar
        const ac = new AbortController();
        if (typeof req.on === 'function') {
            req.on('close', () => ac.abort());
        }

        const result = await model.generateContent(prompt, { 
            timeout: 15000,
            signal: ac.signal
        });

        if (!res.headersSent) {
            res.json({ success: true, text: result.response.text().trim() });
        }
    } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') {
            console.log('[AI] Chamada generateTemplate cancelada devido à desconexão do cliente.');
            return;
        }
        console.error('[AI] Error in generateTemplate:', e);
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        if (!res.headersSent) {
            res.status(500).json({ error });
        }
    }
};

export const generateImage = async (req: Request, res: Response) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt é obrigatório' });

        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
        
        // Baixa a imagem no servidor para evitar bloqueio de CSP no frontend (timeout de 10s)
        const imageResponse = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!imageResponse.ok) {
            return res.status(502).json({ error: 'Falha ao gerar imagem com o serviço externo' });
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

        res.json({ success: true, image: `data:${contentType};base64,${base64}` });
    } catch (e: unknown) {
        console.error('[AI] Error in generateImage:', e);
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        res.status(500).json({ error });
    }
};

export const getInsights = async (req: Request, res: Response) => {
    try {
        const { prompt, context, history } = req.body;
        
        const genAI = getGenAI();

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
            model: "gemini-2.5-flash",
            systemInstruction 
        });

        // Filtra o histórico para garantir que a primeira mensagem seja do role 'user'
        interface ChatMessage {
            role: 'user' | 'assistant';
            content: string;
        }

        const limitedHistory = (history || []).slice(-10) as ChatMessage[];
        const formattedHistory = limitedHistory
            .filter((m: ChatMessage) => m.content && m.content.trim())
            .map((m: ChatMessage) => ({
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

        // AbortController para cancelar a chamada ao Gemini se o cliente desconectar
        const ac = new AbortController();
        if (typeof req.on === 'function') {
            req.on('close', () => ac.abort());
        }

        const result = await chat.sendMessage(prompt, { 
            timeout: 15000,
            signal: ac.signal
        });

        if (!res.headersSent) {
            res.json({ success: true, answer: result.response.text().trim() });
        }
    } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') {
            console.log('[AI] Chamada getInsights cancelada devido à desconexão do cliente.');
            return;
        }
        console.error('[AI] Error in getInsights:', e);
        const error = e instanceof Error ? e.message : 'Erro desconhecido';
        
        // Retorna 429 se for estouro de cota da API da Gemini
        const statusCode = (e as any)?.status === 429 ? 429 : 500;
        if (!res.headersSent) {
            res.status(statusCode).json({ 
                error: statusCode === 429 
                    ? 'Limite de IA atingido. Aguarde alguns minutos.' 
                    : error 
            });
        }
    }
};
