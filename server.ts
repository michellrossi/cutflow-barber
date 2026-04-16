import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createAsaasCustomer, createAsaasSubscription, getAsaasSubscriptions, createAsaasPayment, getAsaasPixQrCode } from './utils/asaas.js';

// Configurações base
const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const geminiKey = process.env.GEMINI_API_KEY || '';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validação de Segurança (antes de criar o client para evitar crash)
if (!supabaseUrl) {
    console.error("❌ ERRO CRÍTICO: supabaseUrl faltando!");
}
if (!serviceRoleKey) {
    console.warn("⚠️ AVISO: SUPABASE_SERVICE_ROLE_KEY não configurada. O Cron Job pode falhar devido a RLS.");
}

// 2. Cliente Administrativo (Usa SERVICE_ROLE - Ignora RLS)
export const supabaseAdmin = createClient(supabaseUrl || 'https://placeholder.supabase.co', serviceRoleKey || 'placeholder');

// =====================================================================
// FIX 1: Rate Limiting em memória por remoteJid (proteção anti-flood)
// Rejeita mensagens do mesmo número com intervalo menor que 3 segundos
// =====================================================================
const chatRateLimitMap = new Map<string, number>(); // { jid: lastTimestampMs }
const CHAT_RATE_LIMIT_MS = 3000; // 3 segundos entre mensagens

// FIX 4: Cache de status de instâncias no escopo do módulo (fora do cron)
// TTL de 5 minutos — evita N chamadas HTTP por execução do cron
const instanceStatusCacheModule = new Map<string, { connected: boolean; expiresAt: number }>();

function isRateLimited(remoteJid: string): boolean {
    const now = Date.now();
    const last = chatRateLimitMap.get(remoteJid);
    if (last && (now - last) < CHAT_RATE_LIMIT_MS) {
        return true;
    }
    chatRateLimitMap.set(remoteJid, now);
    // Limpeza do Map a cada 10.000 entradas para evitar vazamento de memória
    if (chatRateLimitMap.size > 10_000) {
        const cutoff = now - 60_000; // remove entradas com mais de 1 minuto
        for (const [jid, ts] of chatRateLimitMap.entries()) {
            if (ts < cutoff) chatRateLimitMap.delete(jid);
        }
    }
    return false;
}

// Frases que indicam que o cliente quer falar com um humano
const HANDOFF_PHRASES = [
    'falar com humano', 'falar com atendente', 'falar com responsável', 'falar com o responsável',
    'quero um atendente', 'preciso de um atendente', 'atendimento humano', 'quero falar com alguém',
    'me coloca com alguém', 'chama o dono', 'fala com o dono', 'falar com o dono',
    'falar com pessoa', 'atendente por favor', 'responsável', 'gerente'
];

function detectsHandoff(message: string): boolean {
    const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return HANDOFF_PHRASES.some(phrase => {
        const normalizedPhrase = phrase.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return lower.includes(normalizedPhrase);
    });
}

/**
 * GERA MENSAGEM (TEMPLATE)
 * Busca do banco de dados usando supabaseAdmin para evitar bloqueios de RLS
 */
async function generateWhatsAppMessage(triggerId: string, data: any, shopId: string, target: string = 'client') {
    console.log(`[MessageGen] Buscando template para Gatilho: ${triggerId} | Loja: ${shopId} | Alvo: ${target}`);

    // 1. Tenta identificar se o triggerId é um slug (ex: 'appointment_reminder')
    // Se for um slug, tentamos encontrar um gatilho UUID correspondente no banco
    let effectiveTriggerId = triggerId;

    if (triggerId.length < 30) {
        const { data: relatedTriggers } = await supabaseAdmin
            .from('automation_triggers')
            .select('id, name')
            .eq('shop_id', shopId)
            .eq('active', true);

        if (relatedTriggers) {
            // Busca um gatilho cujo nome combine com o slug
            const match = relatedTriggers.find(t => {
                const name = t.name.toLowerCase();
                if (triggerId === 'appointment_reminder') return name.includes('lembrete');
                if (triggerId === 'immediate_confirmation') return name.includes('confirmação');
                if (triggerId === 'post_sale') return name.includes('pós-venda') || name.includes('avaliação');
                if (triggerId === 'rescheduling_request') return name.includes('reagendamento');
                if (triggerId === 'retention_30d') return name.includes('retenção') || name.includes('30 dias');
                if (triggerId === 'birthday') return name.includes('aniversário') || name.includes('birthday');
                if (triggerId === 'loyalty_reward') return name.includes('fidelidade') || name.includes('recompensa');
                return false;
            });

            if (match) {
                console.log(`[MessageGen] Slug '${triggerId}' mapeado para Gatilho ID: ${match.id} (${match.name})`);
                effectiveTriggerId = match.id;
            }
        }
    }

    // 2. Busca o modelo de mensagem
    let query = supabaseAdmin
        .from('message_templates')
        .select('content, title')
        .eq('shop_id', shopId)
        .eq('target', target)
        .eq('active', true);

    if (effectiveTriggerId.length > 30) {
        query = query.eq('trigger_id', effectiveTriggerId);
    } else {
        query = query.eq('trigger', effectiveTriggerId);
    }

    const { data: templateData } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    let content = templateData?.content;
    if (content) {
        console.log(`[MessageGen] Modelo encontrado: "${templateData?.title}"`);
    } else {
        console.log(`[MessageGen] Nenhum modelo customizado encontrado. Usando padrão do sistema.`);
    }


    // 3. Fallback: Se não achou no banco, usa padrões
    if (!content) {
        // Tenta obter o nome do gatilho para o fallback
        let triggerName = triggerId.toLowerCase();

        if (effectiveTriggerId.length > 30) {
            const { data: triggerObj } = await supabaseAdmin.from('automation_triggers').select('name').eq('id', effectiveTriggerId).maybeSingle();
            if (triggerObj) triggerName = triggerObj.name.toLowerCase();
        }

        if (triggerName.includes('confirmação') || triggerId === 'immediate_confirmation' || triggerId === 'link de acesso') {
            if (triggerId === 'link de acesso') {
                content = `Olá [CLIENTE]!\nAqui está seu link de acesso único para a barbearia: [URL].\nEle expira em 15 minutos e não deve ser compartilhado. 🔐💈`;
            } else {
                content = `Olá [CLIENTE]!\nSeu horário de [SERVICO] com [BARBEIRO] no dia [DATA] às [HORA] foi pré-agendado na [BARBEARIA]. Até logo! ✂️💈`;
            }
        } else if (triggerName.includes('lembrete') || triggerId === 'appointment_reminder') {
            content = `Olá [CLIENTE]!\nPassando para lembrar do seu horário de [SERVICO] com [BARBEIRO] em [DATA] às [HORA] na [BARBEARIA]. Nos vemos lá! ✂️💈`;
        } else if (triggerName.includes('pós-venda') || triggerName.includes('avaliação') || triggerId === 'post_sale') {
            content = `Olá [CLIENTE]!\nO que achou do seu atendimento hoje com [BARBEIRO]? Sua opinião é muito importante para nós da [BARBEARIA].`;
        } else if (triggerName.includes('reagendamento') || triggerId === 'rescheduling_request') {
            content = `Olá [CLIENTE], notamos que você não conseguiu comparecer ao seu horário de [SERVICO].\nGostaria de escolher uma nova data para seu atendimento na [BARBEARIA]?`;
        } else if (triggerId === 'retention_30d') {
            content = `Olá [CLIENTE]!\nFaz um tempo que não nos vemos na [BARBEARIA]. Que tal agendar um novo horário para manter o visual em dia?\n✂️💈`;
        } else if (triggerId === 'loyalty_reward') {
            content = `Olá [CLIENTE], parabéns!\nVocê atingiu a meta de fidelidade e ganhou um cupom de [DESCONTO]! Use o código: [CODIGO]. Validade: [VALIDADE] dias.`;
        } else if (triggerId === 'birthday') {
            content = `Parabéns, [CLIENTE]! 🎈\nA equipe da [BARBEARIA] deseja a você um feliz aniversário e muito sucesso! Que tal vir dar um trato no visual hoje? ✂️💈`;
        } else {
            if (target === 'professional') {
                content = `💇‍♂️ *Novo Agendamento!*\nOlá [BARBEIRO], você tem um novo horário com [CLIENTE] para [SERVICO] no dia [DATA] às [HORA].`;
            } else {
                content = `Olá [CLIENTE]!\nSeu horário de [SERVICO] com [BARBEIRO] no dia [DATA] às [HORA] foi pré-agendado. Até logo! ✂️💈`;
            }
        }
    }

    if (!content) return ''; // Segurança final

    // Substituição de variáveis
    return content
        .replace(/\[CLIENTE\]/g, data.clientName || 'Cliente')
        .replace(/\[SERVICO\]/g, data.services || 'serviço')
        .replace(/\[DATA\]/g, data.date || '')
        .replace(/\[HORA\]/g, data.time || '')
        .replace(/\[BARBEIRO\]/g, data.proName || 'um de nossos profissionais')
        .replace(/\[BARBEARIA\]/g, data.shopName || 'nossa barbearia')
        .replace(/\[URL\]/g, data.url || '')
        .replace(/\[DESCONTO\]/g, data.discount || '')
        .replace(/\[CODIGO\]/g, data.code || '')
        .replace(/\[VALIDADE\]/g, data.validity || '');
}

/**
 * ENVIA WHATSAPP (EVOLUTION API V2)
 */
async function sendWhatsApp(phone: string, message: string, instanceName?: string) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instance = instanceName || process.env.WHATSAPP_INSTANCE || 'insightbarber';

    if (!apiUrl || !apiKey) {
        console.warn("[WhatsApp] API não configurada (WHATSAPP_API_URL ou WHATSAPP_API_KEY ausente)");
        return false;
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) cleanPhone = `55${cleanPhone}`;

    try {
        let baseUrl = apiUrl.trim();
        if (!baseUrl.startsWith('http')) {
            baseUrl = `https://${baseUrl}`;
        }
        baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = `${baseUrl}/message/sendText/${instance}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({
                number: cleanPhone,
                text: message,
                delay: 1200,
                linkPreview: false
            })
        });
        const resData = await response.json().catch(() => ({}));
        console.log(`[WhatsApp] Status: ${response.status} | Destino: ${cleanPhone} | Resposta:`, resData);
        return response.ok;
    } catch (error) {
        console.error("Erro na Evolution API:", error);
        return false;
    }
}

/**
 * LOGICA DO CHATBOT AI
 * FIX 2: Expiração de sessão (2h) + reset de contexto
 * FIX 4: Handoff humano + retry com backoff no Gemini
 * FIX 8: Usa RPC book_appointment em vez de INSERT direto
 */
async function handleChatbotAI(shopId: string, remoteJid: string, clientName: string, message: string, instance: string) {
    console.log(`[Chatbot] Processando para ${clientName} (${remoteJid}) na loja ${shopId}`);

    // -------------------------------------------------------
    // FIX 4: Detecção de handoff — verifica ANTES de qualquer IA
    // -------------------------------------------------------
    if (detectsHandoff(message)) {
        console.log(`[Chatbot] Handoff detectado para ${remoteJid}. Pausando bot.`);

        // Pausa o bot para esta sessão
        await supabaseAdmin
            .from('whatsapp_chat_sessions')
            .upsert(
                { shop_id: shopId, remote_jid: remoteJid, bot_paused: true, last_message_at: new Date().toISOString() },
                { onConflict: 'shop_id,remote_jid' }
            );

        // Notifica o cliente que o sistema vai acionar o dono
        await sendWhatsApp(remoteJid.split('@')[0],
            '✅ Entendido! Vou chamar um de nossos atendentes. Aguarde um momento, por favor.',
            instance
        );

        // Notifica o dono da loja via WhatsApp
        try {
            const { data: shop } = await supabaseAdmin
                .from('shops')
                .select('name, whatsapp_instance')
                .eq('id', shopId)
                .single();
            const { data: ownerSettings } = await supabaseAdmin
                .from('settings')
                .select('phone')
                .eq('shop_id', shopId)
                .single();
            if (ownerSettings?.phone) {
                const ownerMsg = `🔔 *Atendimento Humano Solicitado*\n\nCliente: *${clientName}*\nNúmero: *${remoteJid.split('@')[0]}*\nÚltima mensagem: "${message}"\n\nAcesse o WhatsApp para retomar o atendimento.`;
                await sendWhatsApp(ownerSettings.phone, ownerMsg, shop?.whatsapp_instance || instance);
            }
        } catch (e) {
            console.error('[Chatbot] Erro ao notificar dono sobre handoff:', e);
        }
        return;
    }

    // 1. Busca ou cria sessão do chat
    let { data: session } = await supabaseAdmin
        .from('whatsapp_chat_sessions')
        .select('*')
        .eq('shop_id', shopId)
        .eq('remote_jid', remoteJid)
        .maybeSingle();

    if (!session) {
        const { data: newSession } = await supabaseAdmin
            .from('whatsapp_chat_sessions')
            .insert({ shop_id: shopId, remote_jid: remoteJid, context: {}, messages: [], message_count: 0 })
            .select('*')
            .single();
        session = newSession;
    }

    // -------------------------------------------------------
    // Verifica se o bot está pausado para handoff
    // FIX 5: Reativa automaticamente após 24h de inatividade
    // -------------------------------------------------------
    if (session?.bot_paused) {
        const lastMsg = session.last_message_at ? dayjs(session.last_message_at) : null;
        const hoursInactive = lastMsg ? dayjs().diff(lastMsg, 'hour', true) : 999;
        if (hoursInactive >= 24) {
            console.log(`[Chatbot] Bot reativado automaticamente para ${remoteJid} (${hoursInactive.toFixed(1)}h inativo)`);
            await supabaseAdmin
                .from('whatsapp_chat_sessions')
                .update({ bot_paused: false, last_message_at: new Date().toISOString() })
                .eq('id', session.id);
            session = { ...session, bot_paused: false };
        } else {
            console.log(`[Chatbot] Bot pausado para ${remoteJid}. Ignorando mensagem.`);
            return;
        }
    }

    // -------------------------------------------------------
    // FIX 2: Verificação de expiração de sessão (2 horas)
    // -------------------------------------------------------
    const SESSION_EXPIRY_HOURS = 2;
    if (session?.last_message_at) {
        const lastMsg = dayjs(session.last_message_at);
        const hoursSinceLastMsg = dayjs().diff(lastMsg, 'hour', true);
        if (hoursSinceLastMsg >= SESSION_EXPIRY_HOURS) {
            console.log(`[Chatbot] Sessão expirada para ${remoteJid} (${hoursSinceLastMsg.toFixed(1)}h). Resetando contexto.`);
            await supabaseAdmin
                .from('whatsapp_chat_sessions')
                .update({ messages: [], context: {}, message_count: 0, last_message_at: new Date().toISOString() })
                .eq('id', session.id);
            session = { ...session, messages: [], context: {}, message_count: 0 };
        }
    }

    // FIX 3: Rate limit persistente no banco (segunda linha de defesa)
    // Rejeita se message_count > 20 na mesma sessão sem reset horário
    const MSG_LIMIT_PER_SESSION = 20;
    if ((session?.message_count || 0) >= MSG_LIMIT_PER_SESSION) {
        const lastMsg = session?.last_message_at ? dayjs(session.last_message_at) : null;
        const hoursSinceFirst = lastMsg ? dayjs().diff(lastMsg, 'hour', true) : 0;
        if (hoursSinceFirst < 1) {
            console.warn(`[Chatbot] Rate limit DB atingido para ${remoteJid} (${session.message_count} msgs). Descartando.`);
            await sendWhatsApp(remoteJid.split('@')[0],
                '⏳ Muitas mensagens em pouco tempo. Por favor aguarde alguns minutos antes de continuar.',
                instance
            );
            return;
        }
        // Reset do contador após 1 hora
        await supabaseAdmin.from('whatsapp_chat_sessions')
            .update({ message_count: 0 })
            .eq('id', session.id);
        session = { ...session, message_count: 0 };
    }

    // 2. Busca dados da loja para o contexto
    const { data: shop } = await supabaseAdmin.from('shops').select('name').eq('id', shopId).single();

    // 3. Prepara Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    
    // Ferramentas do Agendamento
    const tools = [
        {
            functionDeclarations: [
                {
                    name: "list_services",
                    description: "Retorna a lista de serviços oferecidos pela barbearia com preços e durações.",
                },
                {
                    name: "list_professionals",
                    description: "Retorna a lista de barbeiros/profissionais disponíveis.",
                },
                {
                    name: "check_availability",
                    description: "Verifica horários livres para um barbeiro em uma data específica.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            professional_id: { type: "STRING", description: "O ID do profissional." },
                            date: { type: "STRING", description: "A data no formato YYYY-MM-DD." }
                        },
                        required: ["professional_id", "date"]
                    }
                },
                {
                    name: "book_appointment",
                    description: "Efetiva o agendamento no sistema.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            service_ids: { type: "ARRAY", items: { type: "STRING" }, description: "Lista de IDs dos serviços selecionados." },
                            professional_id: { type: "STRING", description: "O ID do barbeiro selecionado." },
                            date: { type: "STRING", description: "Data escolhida (YYYY-MM-DD)." },
                            time: { type: "STRING", description: "Hora escolhida (HH:mm)." },
                            total_value: { type: "NUMBER", description: "Valor total calculado dos serviços." }
                        },
                        required: ["service_ids", "professional_id", "date", "time"]
                    }
                }
            ]
        }
    ];

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        tools,
    });

    const chat = model.startChat({
        history: (session.messages || []).slice(-10).map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })),
        systemInstruction: `Você é a IA assistente da barbearia "${shop?.name}". Seu objetivo é ajudar o cliente a agendar um serviço pelo WhatsApp.
        Seja educado, breve e eficiente.
        Fluxo Sugerido:
        1. Se for a primeira vez, dê as boas-vindas e mostre os serviços.
        2. Peça para o cliente escolher o barbeiro (se houver mais de um).
        3. Peça a data.
        4. Verifique a disponibilidade e mostre os horários livres.
        5. Confirme os detalhes finais e agende.
        
        Sempre use as ferramentas disponíveis para obter informações reais do banco de dados. Nunca invente horários ou preços.
        Linguagem: Português do Brasil de forma amigável.
        Hoje é: ${dayjs().tz('America/Sao_Paulo').format('dddd, DD [de] MMMM [de] YYYY')}.
        O número do cliente é ${remoteJid.split('@')[0]}.`,
    });

    // -------------------------------------------------------
    // FIX 4: Retry com backoff exponencial no Gemini
    // -------------------------------------------------------
    const MAX_RETRIES = 3;
    const RETRY_DELAYS_MS = [1000, 3000, 7000]; // backoff: 1s, 3s, 7s

    let reply = '';
    let lastError: any = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            let result = await chat.sendMessage(message);
            let response = result.response;
            
            // Loop para lidar com chamadas de funções
            const call = response.functionCalls();
            if (call && call.length > 0) {
                const toolResults: any[] = [];
                
                for (const fn of call) {
                    console.log(`[Chatbot] Executando ferramenta: ${fn.name} | Args:`, fn.args);
                    
                    let data: any;
                    if (fn.name === "list_services") {
                        const { data: res } = await supabaseAdmin.from('services').select('id, name, price, duration').eq('shop_id', shopId);
                        data = res;
                    } else if (fn.name === "list_professionals") {
                        const { data: res } = await supabaseAdmin.from('professionals').select('id, name, role').eq('shop_id', shopId);
                        data = res;
                    } else if (fn.name === "check_availability") {
                        const args: any = fn.args;
                        data = await getAvailableSlotsForAI(shopId, args.professional_id, args.date);
                    } else if (fn.name === "book_appointment") {
                        // -----------------------------------------------
                        // FIX 8: Usa RPC book_appointment em vez de INSERT
                        // Herda: limite de 3 agendamentos/dia + anti-conflito
                        // -----------------------------------------------
                        const args: any = fn.args;
                        const phone = remoteJid.split('@')[0];
                        
                        // Garante que o cliente existe no banco
                        let { data: client } = await supabaseAdmin
                            .from('clients').select('id').eq('shop_id', shopId).eq('phone', phone).maybeSingle();
                        if (!client) {
                            const { data: newClient } = await supabaseAdmin
                                .from('clients')
                                .insert({ shop_id: shopId, name: clientName, phone })
                                .select('id').single();
                            client = newClient;
                        }

                        // Calcula total_value somando os serviços
                        let totalValue = args.total_value || 0;
                        if (!totalValue && args.service_ids?.length) {
                            const { data: svcData } = await supabaseAdmin
                                .from('services').select('price').in('id', args.service_ids);
                            totalValue = svcData?.reduce((sum: number, s: any) => sum + (s.price || 0), 0) || 0;
                        }

                        // Chama a RPC transacional (trata conflito e limite diário)
                        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('book_appointment', {
                            p_shop_id: shopId,
                            p_client_name: clientName,
                            p_client_phone: phone,
                            p_service_ids: args.service_ids,
                            p_professional_id: args.professional_id,
                            p_date: args.date,
                            p_time: args.time,
                            p_total_value: totalValue
                        });

                        if (rpcError || !rpcResult) {
                            console.error('[Chatbot] Erro na RPC book_appointment:', rpcError);
                            data = { success: false, error: 'Erro ao criar agendamento.' };
                        } else if (rpcResult.status === 'conflict') {
                            data = { success: false, error: 'Horário já reservado. Por favor, escolha outro horário.' };
                        } else if (rpcResult.status === 'success') {
                            data = { success: true, appointmentId: rpcResult.id };
                            // Dispara confirmação assíncrona
                            fetch(`http://localhost:${process.env.PORT || 3000}/api/notify/confirmation`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ appointmentId: rpcResult.id })
                            }).catch(e => console.error('[Chatbot] Erro ao disparar notificação:', e));
                        } else {
                            data = { success: false, error: rpcResult.message || 'Erro desconhecido.' };
                        }
                    }
                    
                    toolResults.push({
                        functionResponse: {
                            name: fn.name,
                            response: { content: data }
                        }
                    });
                }

                // Envia os resultados das funções de volta para o Gemini
                const finalResult = await chat.sendMessage(toolResults);
                response = finalResult.response;
            }

            reply = response.text();
            lastError = null;
            break; // Sucesso — sai do loop de retry

        } catch (error: any) {
            lastError = error;
            const isLastAttempt = attempt === MAX_RETRIES - 1;
            console.warn(`[Gemini Chatbot] Tentativa ${attempt + 1}/${MAX_RETRIES} falhou:`, error.message);
            if (!isLastAttempt) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
            }
        }
    }

    if (lastError || !reply) {
        console.error('[Gemini Chatbot] Todas as tentativas falharam:', lastError);
        await sendWhatsApp(
            remoteJid.split('@')[0],
            '⚠️ Tive uma dificuldade técnica momentânea. Tente novamente em alguns instantes ou escreva "atendente" para falar com nossa equipe.',
            instance
        );
        return;
    }

    // 4. Salva histórico e incrementa contador de mensagens
    const updatedMessages = [...(session.messages || []), { role: 'user', content: message }, { role: 'assistant', content: reply }];
    await supabaseAdmin.from('whatsapp_chat_sessions')
        .update({
            messages: updatedMessages,
            last_message_at: new Date().toISOString(),
            message_count: (session.message_count || 0) + 1
        })
        .eq('id', session.id);

    // 5. Envia resposta via WhatsApp
    await sendWhatsApp(remoteJid.split('@')[0], reply, instance);
}

async function getAvailableSlotsForAI(shopId: string, proId: string, date: string) {
    // 1. Horário da Loja
    const { data: settings } = await supabaseAdmin.from('settings').select('business_hours').eq('shop_id', shopId).single();
    const dayOfWeek = dayjs(date).format('dddd').toLowerCase() as keyof typeof INITIAL_STATE.settings.businessHours;
    const dayNames: any = { 'monday': 'segunda-feira', 'tuesday': 'terça-feira', 'wednesday': 'quarta-feira', 'thursday': 'quinta-feira', 'friday': 'sexta-feira', 'saturday': 'sábado', 'sunday': 'domingo' };
    
    // Mapeia o dia do inglês para a chave do DB se necessário (nosso settings usa chaves em inglês)
    const hours = settings?.business_hours?.[dayOfWeek];
    if (!hours || !hours.active) return { error: "A barbearia não abre nesta data." };

    // 2. Agendamentos e Bloqueios
    const { data: appointments } = await supabaseAdmin.from('appointments').select('time').eq('professional_id', proId).eq('date', date).not('status', 'eq', 'cancelled');
    const { data: blocks } = await supabaseAdmin.from('blocked_slots').select('start_time, end_time').eq('professional_id', proId).eq('date', date);

    // Gerar horários (slot de 30 em 30 min)
    const slots = [];
    let current = dayjs(`${date}T${hours.start}`);
    const end = dayjs(`${date}T${hours.end}`);

    while (current.isBefore(end)) {
        const timeStr = current.format('HH:mm');
        const isOccupied = appointments?.some(a => a.time.substring(0, 5) === timeStr);
        const isBlocked = blocks?.some(b => timeStr >= b.start_time.substring(0, 5) && timeStr < b.end_time.substring(0, 5));
        
        if (!isOccupied && !isBlocked) {
            slots.push(timeStr);
        }
        current = current.add(30, 'minute');
    }

    return { available_slots: slots };
}

async function runCronLogic() {
    console.log("[Cron] Iniciando verificação de lembretes (Timezone SP - GMT-3)...");

    const now = dayjs().tz('America/Sao_Paulo');

    const todayStr = now.format('YYYY-MM-DD');
    const tomorrowStr = now.add(1, 'day').format('YYYY-MM-DD');
    const thirtyDaysAgoStr = now.subtract(30, 'day').format('YYYY-MM-DD');
    const thirtyThreeDaysAgoStr = now.subtract(33, 'day').format('YYYY-MM-DD');

    const maxRetries = 3;

    // FIX 4: Cache de instâncias migrado para o escopo do módulo (instanceStatusCacheModule)
    // com TTL de 5 minutos — sem reset a cada execução do cron
    
    // Função auxiliar para verificar status real da API
    const isInstanceConnected = async (shopId: string, instanceName: string): Promise<boolean> => {
        if (!instanceName) return false;
        const cached = instanceStatusCacheModule.get(instanceName);
        if (cached && cached.expiresAt > Date.now()) return cached.connected;
        
        try {
            const r = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connectionState/${instanceName}`, { headers: { apikey: process.env.WHATSAPP_API_KEY || '' }});
            const d = await r.json();
            const connected = d.instance?.state === 'open';
            instanceStatusCacheModule.set(instanceName, { connected, expiresAt: Date.now() + 5 * 60 * 1000 });
            if (!connected) console.warn(`[Cron] Instância ${instanceName} da loja ${shopId} está offline na API. Pulando.`);
            return connected;
        } catch (e) {
            console.error(`[Cron] Erro ao checar status da API para ${instanceName}:`, e);
            instanceStatusCacheModule.set(instanceName, { connected: false, expiresAt: Date.now() + 60 * 1000 }); // TTL reduzido para falha
            return false;
        }
    };


    // 1. Lembretes de 24 Horas
    const { data: apts24h } = await supabaseAdmin
        .from('appointments')
        .select('*, professionals(name), shops(id, name, whatsapp_instance, whatsapp_connected)')
        .in('status', ['confirmed', 'scheduled'])
        .eq('reminder_24h_sent', false)
        .lte('send_attempts_24h', maxRetries - 1)
        .lte('date', tomorrowStr);

    if (apts24h) {
        for (const apt of apts24h) {
            if (!apt.shops?.whatsapp_connected) {
                console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando lembrete 24h.`);
                continue;
            }
            if (!(await isInstanceConnected(apt.shop_id, apt.shops.whatsapp_instance))) continue;

            const aptDateTime = dayjs.tz(`${apt.date}T${apt.time}`, 'America/Sao_Paulo');
            const diffHours = aptDateTime.diff(now, 'hour', true);
            
            // Janela de precisão de 24h (entre 23h e 25h de antecedência)
            if (diffHours <= 25 && diffHours >= 23) {
                const { data: servicesData } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
                const servicesNames = servicesData?.map((s: any) => s.name).join(', ') || "serviços";
                const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const formattedTime = apt.time.substring(0, 5);

                const msg = await generateWhatsAppMessage('appointment_reminder', {
                    clientName: apt.client_name,
                    services: servicesNames,
                    date: formattedDate,
                    time: formattedTime,
                    proName: apt.professionals?.name || "seu barbeiro",
                    shopName: apt.shops?.name
                }, apt.shop_id);
                if (!msg) continue;
                const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);

                if (ok) {
                    await supabaseAdmin.from('appointments').update({ reminder_24h_sent: true }).eq('id', apt.id);
                } else {
                    const attempts = (apt.send_attempts_24h || 0) + 1;
                    await supabaseAdmin.from('appointments').update({ send_attempts_24h: attempts }).eq('id', apt.id);
                }
            }
        }
    }

    // 2. Lembretes de 1 Hora
    const { data: apts1h } = await supabaseAdmin
        .from('appointments')
        .select('*, professionals(name), shops(id, name, whatsapp_instance, whatsapp_connected)')
        .in('status', ['confirmed', 'scheduled'])
        .eq('reminder_1h_sent', false)
        .lte('send_attempts_1h', maxRetries - 1)
        .eq('date', todayStr);

    if (apts1h) {
        for (const apt of apts1h) {
            if (!apt.shops?.whatsapp_connected) {
                console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando lembrete 1h.`);
                continue;
            }
            if (!(await isInstanceConnected(apt.shop_id, apt.shops.whatsapp_instance))) continue;

            const aptDateTime = dayjs.tz(`${apt.date}T${apt.time}`, 'America/Sao_Paulo');
            const diffMinutes = aptDateTime.diff(now, 'minute', true);

            // Janela de precisão de 1h (entre 50 e 70 minutos de antecedência)
            if (diffMinutes <= 70 && diffMinutes >= 50) {
                const { data: servicesData } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
                const servicesNames = servicesData?.map((s: any) => s.name).join(', ') || "serviços";
                const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const formattedTime = apt.time.substring(0, 5);

                const msg = await generateWhatsAppMessage('appointment_reminder', {
                    clientName: apt.client_name,
                    services: servicesNames,
                    date: formattedDate,
                    time: formattedTime,
                    proName: apt.professionals?.name || "seu barbeiro",
                    shopName: apt.shops?.name
                }, apt.shop_id);
                if (!msg) continue;
                const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);

                if (ok) {
                    await supabaseAdmin.from('appointments').update({ reminder_1h_sent: true }).eq('id', apt.id);
                } else {
                    const attempts = (apt.send_attempts_1h || 0) + 1;
                    await supabaseAdmin.from('appointments').update({ send_attempts_1h: attempts }).eq('id', apt.id);
                }
            }
        }
    }

    // 3. Reagendamento
    const twoDaysAgoStr = now.subtract(2, 'day').format('YYYY-MM-DD');

    const { data: aptsReschedule } = await supabaseAdmin
        .from('appointments')
        .select('*, professionals(name), shops(id, name, whatsapp_instance, whatsapp_connected)')
        .in('status', ['cancelled', 'noshow'])
        .eq('rescheduling_sent', false)
        .lte('send_attempts_reschedule', maxRetries - 1)
        .gte('date', twoDaysAgoStr);

    if (aptsReschedule) {
        for (const apt of aptsReschedule) {
            if (!apt.shops?.whatsapp_connected) {
                console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando reagendamento.`);
                continue;
            }
            if (!(await isInstanceConnected(apt.shop_id, apt.shops.whatsapp_instance))) continue;

            const { data: servicesData } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
            const servicesNames = servicesData?.map((s: any) => s.name).join(', ') || "serviços";
            const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const formattedTime = apt.time.substring(0, 5);

            const msg = await generateWhatsAppMessage('rescheduling_request', {
                clientName: apt.client_name,
                services: servicesNames,
                date: formattedDate,
                time: formattedTime,
                proName: apt.professionals?.name || "seu barbeiro",
                shopName: apt.shops?.name
            }, apt.shop_id);
            if (!msg) continue;
            const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);

            if (ok) {
                await supabaseAdmin.from('appointments').update({ rescheduling_sent: true }).eq('id', apt.id);
            } else {
                const attempts = (apt.send_attempts_reschedule || 0) + 1;
                await supabaseAdmin.from('appointments').update({ send_attempts_reschedule: attempts }).eq('id', apt.id);
            }
        }
    }

    // 4. Pós-venda
    const { data: aptsPostSale } = await supabaseAdmin
        .from('appointments')
        .select('*, professionals(name), shops(id, name, whatsapp_instance, whatsapp_connected)')
        .eq('status', 'completed')
        .eq('post_sale_sent', false)
        .lte('send_attempts_postsale', maxRetries - 1)
        .eq('date', todayStr);

    if (aptsPostSale) {
        for (const apt of aptsPostSale) {
            if (!apt.shops?.whatsapp_connected) {
                console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando pós-venda.`);
                continue;
            }
            if (!(await isInstanceConnected(apt.shop_id, apt.shops.whatsapp_instance))) continue;

            const aptDateTime = dayjs.tz(`${apt.date}T${apt.time}`, 'America/Sao_Paulo');
            const diffMinutes = now.diff(aptDateTime, 'minute', true);
            
            if (diffMinutes >= 120 && diffMinutes < 1440) {
                const { data: servicesData } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
                const servicesNames = servicesData?.map((s: any) => s.name).join(', ') || "serviços";
                const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const formattedTime = apt.time.substring(0, 5);

                const msg = await generateWhatsAppMessage('post_sale', {
                    clientName: apt.client_name,
                    services: servicesNames,
                    date: formattedDate,
                    time: formattedTime,
                    proName: apt.professionals?.name || "seu barbeiro",
                    shopName: apt.shops?.name
                }, apt.shop_id);
                if (!msg) continue;
                const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);

                if (ok) {
                    await supabaseAdmin.from('appointments').update({ post_sale_sent: true }).eq('id', apt.id);
                } else {
                    const attempts = (apt.send_attempts_postsale || 0) + 1;
                    await supabaseAdmin.from('appointments').update({ send_attempts_postsale: attempts }).eq('id', apt.id);
                }
            }
        }
    }

    // 5. Retenção 30 Dias
    const { data: apts30d } = await supabaseAdmin
        .from('appointments')
        .select('*, shops(id, name, whatsapp_instance, whatsapp_connected)')
        .eq('status', 'completed')
        .eq('reminder_30d_sent', false)
        .lte('send_attempts_30d', maxRetries - 1)
        .lte('date', thirtyDaysAgoStr)
        .gte('date', thirtyThreeDaysAgoStr);

    if (apts30d) {
        for (const apt of apts30d) {
            if (!apt.shops?.whatsapp_connected) continue;
            if (!(await isInstanceConnected(apt.shop_id, apt.shops.whatsapp_instance))) continue;
            
            const msg = await generateWhatsAppMessage('retention_30d', {
                clientName: apt.client_name,
                shopName: apt.shops?.name
            }, apt.shop_id);
            if (!msg) continue;
            const ok = await sendWhatsApp(apt.client_phone, msg, apt.shops?.whatsapp_instance);

            if (ok) {
                await supabaseAdmin.from('appointments').update({ reminder_30d_sent: true }).eq('id', apt.id);
            } else {
                const attempts = (apt.send_attempts_30d || 0) + 1;
                await supabaseAdmin.from('appointments').update({ send_attempts_30d: attempts }).eq('id', apt.id);
            }
        }
    }

    // 6. Aniversariantes do Dia
    // FIX 5: Usa RPC com índice de expressão em vez de ilike sem índice
    // Guarda de horário: envia aniversários apenas a partir das 9h (horário de SP)
    const currentHourSP = now.hour();
    if (currentHourSP < 9) {
        console.log(`[Cron] Aniversários aguardando janela das 9h (hora atual SP: ${currentHourSP}h). Pulando.`);
    } else {

    const { data: bdayClients, error: bdayError } = await supabaseAdmin
        .rpc('get_birthday_clients_today');

    if (bdayError) {
        console.error('[Cron] Erro ao buscar aniversariantes via RPC:', bdayError.message);
    }

    if (bdayClients && bdayClients.length > 0) {
        // Busca dados das lojas para os aniversariantes (join manual)
        const shopIds = [...new Set(bdayClients.map((c: any) => c.shop_id))];
        const { data: shopList } = await supabaseAdmin
            .from('shops')
            .select('id, name, whatsapp_instance, whatsapp_connected')
            .in('id', shopIds);
        const shopMap = new Map((shopList || []).map((s: any) => [s.id, s]));

        for (const client of bdayClients) {
            const shop = shopMap.get(client.shop_id);
            if (!shop?.whatsapp_connected) continue;
            if (!(await isInstanceConnected(client.shop_id, shop.whatsapp_instance))) continue;
            
            const msg = await generateWhatsAppMessage('birthday', {
                clientName: client.name,
                shopName: shop.name
            }, client.shop_id);

            if (msg) {
                const ok = await sendWhatsApp(client.phone, msg, shop.whatsapp_instance);
                if (ok) {
                    await supabaseAdmin.from('clients').update({ birthday_last_sent_year: now.year() }).eq('id', client.id);
                }
            }
        }
    }

    } // fim do bloco de guarda de horário (aniversários)

    // FIX 2 (Cron Semanal): Limpa sessões de chatbot inativas há mais de 7 dias
    // Executa apenas às segundas-feiras (dia 1 da semana no dayjs)
    if (now.day() === 1) {
        const sevenDaysAgo = now.subtract(7, 'day').toISOString();
        const { error: cleanupError, count } = await supabaseAdmin
            .from('whatsapp_chat_sessions')
            .delete({ count: 'exact' })
            .lt('last_message_at', sevenDaysAgo);
        if (cleanupError) {
            console.error('[Cron] Erro ao limpar sessões expiradas:', cleanupError.message);
        } else {
            console.log(`[Cron] Sessões de chatbot expiradas removidas: ${count ?? 0}`);
        }
    }
}

async function startServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    const notifyLimiter = rateLimit({
        windowMs: 60_000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Muitas requisições. Aguarde 1 minuto.' }
    });
    app.use('/api/notify/', notifyLimiter);
    app.use('/api/loyalty/', notifyLimiter);

    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    app.post('/api/notify/test', async (req, res) => {
        const { phone, templateId } = req.body;
        if (!phone || !templateId) return res.status(400).json({ error: "Telefone e ID do modelo são obrigatórios" });

        try {
            const { data: template } = await supabaseAdmin.from('message_templates').select('*').eq('id', templateId).single();
            if (!template) return res.status(404).json({ error: "Modelo não encontrado" });

            const { data: shop } = await supabaseAdmin.from('shops').select('name, whatsapp_instance').eq('id', template.shop_id).single();

            const testData = {
                clientName: "Cliente de Teste",
                services: "Corte e Barba (Teste)",
                date: new Date().toLocaleDateString('pt-BR'),
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                proName: "Barbeiro de Teste",
                shopName: shop?.name || "Minha Barbearia",
                url: "https://google.com"
            };
            const message = await generateWhatsAppMessage(template.trigger_id || template.trigger, testData, template.shop_id);
            const ok = await sendWhatsApp(phone, message, shop?.whatsapp_instance);
            res.json({ success: ok });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/admin/insights', async (req, res) => {
        const { prompt, context, history } = req.body;
        try {
            const systemInstruction = `Você é um consultor de negócios especializado em barbearias. Use os dados de "${context.shopName}".`;
            const chatHistory = history.map((msg: any) => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] }));

            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
                systemInstruction
            });

            const result = await model.generateContent({
                contents: [...chatHistory, { role: 'user', parts: [{ text: prompt }] }],
            });
            const response = await result.response;

            res.json({ success: true, answer: response.text() || '' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/ai/generate-template', async (req, res) => {
        const { trigger, shopName, tone } = req.body;
        try {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const promptContent = `Crie um modelo de mensagem de WhatsApp para uma barbearia chamada "${shopName}". 
            O gatilho da mensagem é: "${trigger}". 
            O tom deve ser: "${tone}".
            Use as seguintes variáveis: [CLIENTE], [SERVICO], [DATA], [HORA], [BARBEIRO], [BARBEARIA].
            Retorne apenas o texto da mensagem, sem explicações.`;

            const result = await model.generateContent(promptContent);
            const response = await result.response;

            res.json({ success: true, text: response.text() || '' });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/ai/generate-image', async (req, res) => {
        const { serviceName } = req.body;
        try {
            console.log(`[AI Image] Gerando imagem Premium (Flux) para: ${serviceName}`);

            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

            const promptContext = `Create a high-end, realistic photography prompt for an AI image generator (Flux model). 
            The subject is a professional barbershop service: "${serviceName}".
            Technical details: Cinematic lighting, shallow depth of field, 8k resolution, professional photography, hyper-realistic, elegant atmosphere.
            Rule: Return ONLY the prompt in English, no introductory text.`;

            const result = await model.generateContent(promptContext);
            const generatedPrompt = result.response.text().trim();

            console.log(`[AI Image] Prompt Flux: ${generatedPrompt}`);

            // Usando o modelo FLUX que é consideravelmente superior para temas realistas
            const encodedPrompt = encodeURIComponent(generatedPrompt);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux&seed=${Math.floor(Math.random() * 999999)}`;

            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) throw new Error("Falha ao gerar imagem premium");

            const buffer = await imageResponse.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const dataUrl = `data:image/png;base64,${base64}`;

            res.json({ success: true, image: dataUrl });
        } catch (error: any) {
            console.error("[AI Image] Erro:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/notify/confirmation', async (req, res) => {
        const { appointmentId } = req.body;
        const { data: apt } = await supabaseAdmin.from('appointments').select('*, professionals(name, phone), shops(id, name, whatsapp_instance)').eq('id', appointmentId).single();

        if (!apt || apt.confirmation_sent) return res.json({ success: true });

        const { data: servicesData } = await supabaseAdmin.from('services').select('name').in('id', apt.service_ids || []);
        const servicesNames = servicesData?.map(s => s.name).join(', ') || "serviços";
        const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const formattedTime = apt.time.substring(0, 5);

        const clientMessage = await generateWhatsAppMessage('immediate_confirmation', {
            clientName: apt.client_name,
            services: servicesNames,
            date: formattedDate,
            time: formattedTime,
            proName: apt.professionals?.name || "um de nossos profissionais",
            shopName: apt.shops?.name
        }, apt.shop_id, 'client');

        if (clientMessage) {
            const clientOk = await sendWhatsApp(apt.client_phone, clientMessage, apt.shops?.whatsapp_instance);
            if (clientOk) await supabaseAdmin.from('appointments').update({ confirmation_sent: true }).eq('id', appointmentId);
        }

        if (apt.professionals?.phone) {
            const proMessage = await generateWhatsAppMessage('immediate_confirmation', {
                clientName: apt.client_name,
                services: servicesNames,
                date: formattedDate,
                time: formattedTime,
                proName: apt.professionals.name,
                shopName: apt.shops?.name
            }, apt.shop_id, 'professional');

            if (proMessage) {
                await sendWhatsApp(apt.professionals.phone, proMessage, apt.shops?.whatsapp_instance);
            }
        }

        res.json({ success: true });
    });

    app.post('/api/loyalty/check-reward', async (req, res) => {
        const { clientId, shopId } = req.body;
        try {
            const { data: result, error } = await supabaseAdmin.rpc('award_loyalty_reward', { p_client_id: clientId, p_shop_id: shopId });

            if (error || !result?.success) {
                console.error(`[Loyalty] Erro RPC para cliente ${clientId}:`, error || result?.message);
                return res.json({ success: false, error: error?.message || result?.message });
            }

            // Busca dados da loja de forma robusta
            const { data: shop } = await supabaseAdmin
                .from('shops')
                .select('name, whatsapp_instance, whatsapp_connected')
                .eq('id', shopId)
                .single();

            const msg = await generateWhatsAppMessage('loyalty_reward', {
                clientName: result.clientName,
                discount: `${result.discount}${result.discountType === 'percentage' ? '%' : ' R$'}`,
                code: result.couponCode,
                validity: result.validityDays,
                shopName: shop?.name || "Nossa Barbearia"
            }, shopId);

            if (msg && shop?.whatsapp_connected) {
                console.log(`[Loyalty] Enviando prêmio para ${result.clientPhone} via instância ${shop.whatsapp_instance}`);
                await sendWhatsApp(result.clientPhone, msg, shop.whatsapp_instance);
            } else {
                console.warn(`[Loyalty] Mensagem não enviada: Template vazio ou WhatsApp desconectado.`);
            }

            res.json({ success: true, couponCode: result.couponCode });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/notify/login-link', async (req, res) => {
        const { phone, url, shopId } = req.body;
        const { data: shop } = await supabaseAdmin.from('shops').select('name, whatsapp_instance').eq('id', shopId).single();
        const { data: client } = await supabaseAdmin.from('clients').select('name').eq('shop_id', shopId).eq('phone', phone).maybeSingle();

        if (!shop) return res.status(404).json({ error: "Loja não encontrada" });

        const msg = await generateWhatsAppMessage('link de acesso', { clientName: client?.name || "Cliente", url, shopName: shop.name }, shopId);
        if (msg) {
            const ok = await sendWhatsApp(phone, msg, shop.whatsapp_instance);
            res.json({ success: ok });
        } else {
            res.json({ success: false, error: "Gatilho desativado" });
        }
    });

    app.get('/api/notify/cron', async (req, res) => {
        if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) return res.status(401).end();
        try {
            await runCronLogic();
            res.json({ status: "Cron executado com sucesso" });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/whatsapp/qrcode', async (req, res) => {
        const { shopId } = req.body;
        const instanceName = `shop-${shopId}`;
        try {
            await fetch(`${process.env.WHATSAPP_API_URL}/instance/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': process.env.WHATSAPP_API_KEY || '' },
                body: JSON.stringify({ 
                    instanceName, 
                    integration: "WHATSAPP-BAILEYS",
                    webhook: `${process.env.SERVER_URL || 'https://sua-url-do-servidor.com'}/api/whatsapp/webhook`,
                    webhook_by_events: true,
                    events: ["MESSAGES_UPSERT"]
                })
            });
            await supabaseAdmin.from('shops').update({ whatsapp_instance: instanceName }).eq('id', shopId);
            const response = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connect/${instanceName}`, { headers: { 'apikey': process.env.WHATSAPP_API_KEY || '' } });
            const data = await response.json();
            res.json({ qrcode: data.base64, connected: data.instance?.state === 'open' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/whatsapp/status', async (req, res) => {
        const { shopId } = req.body;
        try {
            const { data: shop } = await supabaseAdmin.from('shops').select('whatsapp_instance, whatsapp_connected').eq('id', shopId).single();
            if (!shop?.whatsapp_instance) return res.json({ connected: false });
            const r = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connectionState/${shop.whatsapp_instance}`,
                { headers: { apikey: process.env.WHATSAPP_API_KEY || '' } });
            const d = await r.json();
            const connected = d.instance?.state === 'open';

            // ALERT TRIGGER: Status drops from connected -> disconnected
            if (shop.whatsapp_connected === true && !connected) {
                console.log(`[ALERT] CRITICAL Notificação de E-mail Despachada para o Dono da Barbearia ${shopId}: A instância do WhatsApp Desconectou! Acesso imediato necessário para retomada das automações.`);
                // NOTE: Implementação do SendGrid / Resend webhook call passaria aqui.
            }

            if (shop.whatsapp_connected !== connected) {
                await supabaseAdmin.from('shops').update({ whatsapp_connected: connected }).eq('id', shopId);
            }

            res.json({ connected });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/whatsapp/disconnect', async (req, res) => {
        const { shopId } = req.body;
        try {
            const { data: shop } = await supabaseAdmin.from('shops').select('whatsapp_instance').eq('id', shopId).single();
            if (!shop?.whatsapp_instance) return res.json({ success: true });
            await fetch(`${process.env.WHATSAPP_API_URL}/instance/logout/${shop.whatsapp_instance}`,
                { method: 'DELETE', headers: { apikey: process.env.WHATSAPP_API_KEY || '' } });
            await supabaseAdmin.from('shops').update({ whatsapp_connected: false }).eq('id', shopId);
            res.json({ success: true });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    // ==========================================
    // ROTAS DO ASAAS (PAGAMENTOS & ASSINATURAS)
    // ==========================================

    // 1. Criar Cliente no Asaas
    app.post('/api/asaas/customers', async (req, res) => {
        try {
            // Requer name, cpfCnpj, email, phone...
            const customer = await createAsaasCustomer(req.body);
            // Salvar customer.id (asaas_customer_id) no banco (referente à barbearia/shop)
            res.json({ success: true, customer });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // 2. Criar Assinatura Recorrente
    app.post('/api/asaas/subscriptions', async (req, res) => {
        try {
            const subscription = await createAsaasSubscription(req.body);
            // Salvar a assinatura no banco se necessário
            res.json({ success: true, subscription });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // 4. Checkout Transparente (Cartão e PIX)
    app.post('/api/asaas/checkout', async (req, res) => {
        try {
            const { shopId, customerParams, paymentParams } = req.body;

            // 1. Criar Cliente
            const customer = await createAsaasCustomer(customerParams);

            // 2. Criar Pagamento
            const payload = {
                customer: customer.id,
                billingType: paymentParams.billingType,
                value: paymentParams.value || 59.90,
                dueDate: paymentParams.dueDate || new Date().toISOString().split('T')[0],
            };

            if (paymentParams.billingType === 'CREDIT_CARD') {
                Object.assign(payload, {
                    creditCard: paymentParams.creditCard,
                    creditCardHolderInfo: paymentParams.creditCardHolderInfo
                });
            }

            const payment = await createAsaasPayment(payload);

            let qrCode = null;
            if (payment.billingType === 'PIX') {
                qrCode = await getAsaasPixQrCode(payment.id);
            }

            if (shopId) {
                let updates: any = { asaas_customer_id: customer.id };

                // Se for cartão de crédito e já aprovar na mesma hora, libera o acesso imediatamente
                if (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED') {
                    updates.plan = 'active';
                }

                await supabaseAdmin.from('shops').update(updates).eq('id', shopId);
            }

            res.json({ success: true, payment, qrCode });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.post('/api/asaas/webhook', async (req, res) => {
        if (req.headers['asaas-access-token'] !== process.env.ASAAS_WEBHOOK_TOKEN) return res.status(401).json({ error: 'Unauthorized' });

        const event = req.body.event;
        const payment = req.body.payment;

        console.log(`[Asaas Webhook] Evento recebido: ${event}`);

        try {
            if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
                const asaasCustomerId = payment.customer;
                if (asaasCustomerId) {
                    await supabaseAdmin.from('shops').update({ plan: 'active' }).eq('asaas_customer_id', asaasCustomerId);
                }
            }
            res.json({ success: true });
        } catch (error: any) {
            console.error('[Asaas Webhook] Erro ao processar:', error.message);
            res.status(500).json({ error: error.message });
        }
    });

    // ==========================================
    // WHATSAPP CHATBOT AI (EVOLUTION API WEBHOOK)
    // ==========================================
    app.post('/api/whatsapp/webhook', async (req, res) => {
        const body = req.body;

        // FIX 2: Validação de assinatura do webhook
        // Configure EVOLUTION_WEBHOOK_SECRET no .env e no painel da Evolution API
        const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
        if (webhookSecret) {
            const receivedSecret = req.headers['authorization'] || req.headers['apikey'];
            if (receivedSecret !== webhookSecret) {
                console.warn(`[Chatbot Webhook] Requisição rejeitada: assinatura inválida. Recebido: "${receivedSecret}"`);
                return res.status(401).end();
            }
        }
        if (body.event !== 'MESSAGES_UPSERT') return res.status(200).send('OK');

        const messageData = body.data;
        if (!messageData || messageData.key.fromMe) return res.status(200).send('OK');

        const remoteJid = messageData.key.remoteJid;
        if (remoteJid.includes('@g.us')) return res.status(200).send('OK'); // Ignora grupos

        const pushName     = messageData.pushName || 'Cliente';
        const messageText  = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text;

        if (!messageText) return res.status(200).send('OK');

        const instanceName = body.instance;
        console.log(`[Chatbot Webhook] Evento recebido. Instância: "${instanceName}" | JID: ${remoteJid}`);

        // -------------------------------------------------------
        // FIX CRÍTICO: Busca o shopId pelo whatsapp_instance no banco.
        // Antes tentava derivar o shopId pelo prefixo "shop-<uuid>",
        // o que falha quando a instância tem nome livre (ex: "minhabarbearia").
        // -------------------------------------------------------
        let shopId: string | null = null;

        // 1. Tenta pelo nome da instância salvo em shops.whatsapp_instance
        if (instanceName) {
            const { data: shopByInstance } = await supabaseAdmin
                .from('shops')
                .select('id')
                .eq('whatsapp_instance', instanceName)
                .maybeSingle();

            if (shopByInstance?.id) {
                shopId = shopByInstance.id;
                console.log(`[Chatbot] shopId "${shopId}" encontrado via whatsapp_instance = "${instanceName}"`);
            }
        }

        // 2. Fallback: convenção legada "shop-<uuid>"
        if (!shopId && instanceName?.startsWith('shop-')) {
            shopId = instanceName.replace('shop-', '');
            console.log(`[Chatbot] shopId "${shopId}" derivado pela convenção shop-<id> (fallback)`);
        }

        if (!shopId) {
            console.warn(`[Chatbot] Webhook de instância desconhecida: "${instanceName}". Nenhuma loja encontrada. Configure whatsapp_instance nas Settings da loja.`);
            return res.status(200).send('OK');
        }

        // FIX 1: Rate limiting em memória — rejeita flood de mensagens
        if (isRateLimited(remoteJid)) {
            console.warn(`[Chatbot] Rate limit atingido para ${remoteJid}. Mensagem descartada.`);
            return res.status(200).send('OK'); // 200 para não causar retry no webhook
        }

        // Responde imediatamente ao webhook para evitar timeout da Evolution API
        res.status(200).send('OK');

        // Processa de forma assíncrona (não bloqueia resposta HTTP)
        handleChatbotAI(shopId, remoteJid, pushName, messageText, instanceName)
            .catch((error: any) => {
                console.error(`[Chatbot Error] Shop: ${shopId} | User: ${remoteJid} | Error:`, error.message);
            });
    });

    if (process.env.NODE_ENV === 'production') {
        const distPath = path.resolve(__dirname, 'dist');
        app.use(express.static(distPath));
        app.use((req, res, next) => {
            if (req.accepts('html')) res.sendFile(path.join(distPath, 'index.html'));
            else next();
        });
    } else {
        const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
        app.use(vite.middlewares);
    }

    app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`Servidor ativo na porta ${PORT}`);
    });
}

startServer().catch(err => console.error("Erro ao iniciar servidor:", err));
