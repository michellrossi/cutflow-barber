import { supabaseAdmin } from './supabase';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
dayjs.extend(utc);
dayjs.extend(timezone);
const CHAT_RATE_LIMIT_MS = 3000;
const chatRateLimitMap = new Map();
export function isRateLimited(remoteJid) {
    const now = Date.now();
    const last = chatRateLimitMap.get(remoteJid);
    if (last && (now - last) < CHAT_RATE_LIMIT_MS) {
        return true;
    }
    chatRateLimitMap.set(remoteJid, now);
    if (chatRateLimitMap.size > 10_000) {
        const cutoff = now - 60_000;
        for (const [jid, ts] of chatRateLimitMap.entries()) {
            if (ts < cutoff)
                chatRateLimitMap.delete(jid);
        }
    }
    return false;
}
const HANDOFF_PHRASES = [
    'falar com humano', 'falar com atendente', 'falar com responsável', 'falar com o responsável',
    'quero um atendente', 'preciso de um atendente', 'atendimento humano', 'quero falar com alguém',
    'me coloca com alguém', 'chama o dono', 'fala com o dono', 'falar com o dono',
    'falar com pessoa', 'atendente por favor', 'responsável', 'gerente'
];
export function detectsHandoff(message) {
    const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return HANDOFF_PHRASES.some(phrase => {
        const normalizedPhrase = phrase.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return lower.includes(normalizedPhrase);
    });
}
export async function generateWhatsAppMessage(triggerId, data, shopId, target = 'client') {
    let effectiveTriggerId = triggerId;
    if (triggerId.length < 30) {
        const { data: relatedTriggers } = await supabaseAdmin
            .from('automation_triggers')
            .select('id, name')
            .eq('shop_id', shopId)
            .eq('active', true);
        if (relatedTriggers) {
            const match = relatedTriggers.find(t => {
                const name = t.name.toLowerCase();
                if (triggerId === 'appointment_reminder_24h')
                    return name.includes('lembrete') && (name.includes('24h') || name.includes('24 h') || name.includes('dia'));
                if (triggerId === 'appointment_reminder_1h')
                    return name.includes('lembrete') && (name.includes('1h') || name.includes('1 h') || name.includes('hora'));
                if (triggerId === 'appointment_reminder' || triggerId === 'lembrete')
                    return name.includes('lembrete');
                if (triggerId === 'immediate_confirmation')
                    return name.includes('confirmação');
                if (triggerId === 'post_sale')
                    return name.includes('pós-venda') || name.includes('avaliação');
                if (triggerId === 'rescheduling_request')
                    return name.includes('reagendamento');
                if (triggerId === 'retention_30d')
                    return name.includes('retenção') || name.includes('30 dias');
                if (triggerId === 'birthday')
                    return name.includes('aniversário') || name.includes('birthday');
                if (triggerId === 'loyalty_reward')
                    return name.includes('fidelidade') || name.includes('recompensa');
                return false;
            });
            if (match)
                effectiveTriggerId = match.id;
        }
    }
    let query = supabaseAdmin
        .from('message_templates')
        .select('content, title')
        .eq('shop_id', shopId)
        .eq('target', target)
        .eq('active', true);
    if (effectiveTriggerId.length > 30) {
        query = query.eq('trigger_id', effectiveTriggerId);
    }
    else {
        query = query.eq('trigger', effectiveTriggerId);
    }
    const { data: templateData } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    let content = templateData?.content;
    if (!content) {
        let triggerName = triggerId.toLowerCase();
        if (effectiveTriggerId.length > 30) {
            const { data: triggerObj } = await supabaseAdmin.from('automation_triggers').select('name').eq('id', effectiveTriggerId).maybeSingle();
            if (triggerObj)
                triggerName = triggerObj.name.toLowerCase();
        }
        if (triggerName.includes('confirmação') || triggerId === 'immediate_confirmation' || triggerId === 'link de acesso') {
            if (triggerId === 'link de acesso') {
                content = `Olá [CLIENTE]!\nAqui está seu link de acesso único para a barbearia: [URL].\nEle expira em 15 minutos e não deve ser compartilhado.\n🔐💈`;
            }
            else {
                content = `Olá [CLIENTE]!\nSeu horário de [SERVICO] com [BARBEIRO] no dia [DATA] às [HORA] foi pré-agendado na [BARBEARIA].\nAté logo! ✂️💈`;
            }
        }
        else if (triggerName.includes('lembrete') || triggerId.startsWith('appointment_reminder')) {
            if (triggerId.includes('1h')) {
                content = `Olá [CLIENTE]!\nFalta apenas 1 HORA para seu horário de [SERVICO] com [BARBEIRO] na [BARBEARIA].\nNos vemos às [HORA]! ✂️💈`;
            }
            else {
                content = `Olá [CLIENTE]!\nPassando para lembrar do seu horário de [SERVICO] com [BARBEIRO] em [DATA] às [HORA] na [BARBEARIA].\nNos vemos lá! ✂️💈`;
            }
        }
        else if (triggerName.includes('pós-venda') || triggerName.includes('avaliação') || triggerId === 'post_sale') {
            content = `Olá [CLIENTE]!\nO que achou do seu atendimento hoje com [BARBEIRO]?\nSua opinião é muito importante para nós da [BARBEARIA].`;
        }
        else if (triggerName.includes('reagendamento') || triggerId === 'rescheduling_request') {
            content = `Olá [CLIENTE], notamos que você não conseguiu comparecer ao seu horário de [SERVICO].\nGostaria de escolher uma nova data para seu atendimento na [BARBEARIA]?`;
        }
        else if (triggerId === 'retention_30d') {
            content = `Olá [CLIENTE]!\nFaz um tempo que não nos vemos na [BARBEARIA].\nQue tal agendar um novo horário para manter o visual em dia?\n✂️💈`;
        }
        else if (triggerId === 'loyalty_reward') {
            content = `Olá [CLIENTE], parabéns!\nVocê atingiu a meta de fidelidade e ganhou um cupom de [DESCONTO]!\nUse o código: [CODIGO]. Validade: [VALIDADE] dias.`;
        }
        else if (triggerId === 'birthday') {
            content = `Parabéns, [CLIENTE]!\n🎈\nA equipe da [BARBEARIA] deseja a você um feliz aniversário e muito sucesso!\nQue tal vir dar um trato no visual hoje? ✂️💈`;
        }
        else {
            if (target === 'professional') {
                content = `💇‍♂️ *Novo Agendamento!*\nOlá [BARBEIRO], você tem um novo horário com [CLIENTE] para [SERVICO] no dia [DATA] às [HORA].`;
            }
            else {
                content = `Olá [CLIENTE]!\nSeu horário de [SERVICO] com [BARBEIRO] no dia [DATA] às [HORA] foi pré-agendado.\nAté logo! ✂️💈`;
            }
        }
    }
    if (!content)
        return '';
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
export async function sendWhatsApp(phone, message, instanceName) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instance = instanceName || process.env.WHATSAPP_INSTANCE || 'insightbarber';
    if (!apiUrl || !apiKey) {
        console.error("[WhatsApp] API URL ou Key não configurada!");
        return false;
    }
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55'))
        cleanPhone = `55${cleanPhone}`;
    try {
        let baseUrl = apiUrl.trim();
        if (!baseUrl.startsWith('http'))
            baseUrl = `https://${baseUrl}`;
        baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = `${baseUrl}/message/sendText/${instance}`;
        const payload = {
            number: cleanPhone,
            textMessage: { text: message }, // Evolution API usually prefers this structure in newer versions
            text: message, // keeping for backwards compatibility
            options: {
                delay: 1200,
                linkPreview: false
            }
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error(`[WhatsApp] Evolution API Error: Status ${response.status} - ${errText}`);
            return false;
        }
        return true;
    }
    catch (error) {
        console.error("[WhatsApp] Erro de rede ou ao conectar na Evolution API:", error);
        return false;
    }
}
export async function logAutomatedMessage(shopId, clientName, clientPhone, triggerType, status = 'sent') {
    try {
        // [PROTEÇÃO] Evita log duplicado se ocorrer em menos de 10 segundos (clique duplo ou retry)
        const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
        const { data: existing } = await supabaseAdmin
            .from('automated_messages_log')
            .select('id')
            .eq('shop_id', shopId)
            .eq('client_phone', clientPhone)
            .eq('trigger_type', triggerType)
            .gte('sent_at', tenSecondsAgo)
            .maybeSingle();
        if (existing) {
            console.log("[Log] Mensagem já registrada recentemente, pulando duplicata.");
            return;
        }
        await supabaseAdmin.from('automated_messages_log').insert({
            shop_id: shopId,
            client_name: clientName,
            client_phone: clientPhone,
            trigger_type: triggerType,
            status: status
        });
    }
    catch (error) {
        console.error("Erro ao registrar log de mensagem:", error);
    }
}
export const isInstanceConnected = async (shopId, instanceName) => {
    if (!instanceName)
        return false;
    const now = Date.now();
    const { data: cached } = await supabaseAdmin
        .from('instance_status_cache')
        .select('connected, expires_at')
        .eq('instance_name', instanceName)
        .maybeSingle();
    if (cached && Number(cached.expires_at) > now) {
        return cached.connected;
    }
    try {
        const r = await fetch(`${process.env.WHATSAPP_API_URL}/instance/connectionState/${instanceName}`, { headers: { apikey: process.env.WHATSAPP_API_KEY || '' } });
        const d = await r.json();
        const connected = d.instance?.state === 'open';
        await supabaseAdmin.from('instance_status_cache').upsert({
            instance_name: instanceName,
            connected,
            expires_at: now + 5 * 60 * 1000
        });
        return connected;
    }
    catch (e) {
        await supabaseAdmin.from('instance_status_cache').upsert({
            instance_name: instanceName,
            connected: false,
            expires_at: now + 60 * 1000
        });
        return false;
    }
};
