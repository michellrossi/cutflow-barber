import { supabaseAdmin } from '../lib/supabase';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { sendWhatsApp, detectsHandoff } from '../lib/helpers';
dayjs.extend(utc);
dayjs.extend(timezone);
export async function handleChatbotAI(shopId, remoteJid, clientName, message, instance) {
    console.log(`[Chatbot] Processando para ${clientName} (${remoteJid}) na loja ${shopId}`);
    // NPS
    {
        const { data: npsSession } = await supabaseAdmin
            .from('whatsapp_chat_sessions')
            .select('context')
            .eq('shop_id', shopId)
            .eq('remote_jid', remoteJid)
            .maybeSingle();
        const ctx = npsSession?.context;
        if (ctx?.nps_pending && ctx.nps_appointment_id) {
            const score = parseInt(message.trim(), 10);
            if (score >= 1 && score <= 5) {
                await supabaseAdmin.from('appointments').update({ nps_score: score }).eq('id', ctx.nps_appointment_id);
                await supabaseAdmin.from('whatsapp_chat_sessions').update({ context: {}, last_message_at: new Date().toISOString() }).eq('shop_id', shopId).eq('remote_jid', remoteJid);
                const emojis = ['', '😞', '😕', '😐', '😊', '🤩'];
                const ackMsg = score >= 4 ? `Obrigado pela nota *${score}/5* ${emojis[score]}! Fico feliz que tenha gostado! Te esperamos em breve. ✂️💈` : `Obrigado pelo feedback! Nota *${score}/5* ${emojis[score]}. Vamos trabalhar para melhorar sempre. Qualquer dúvida, é só chamar! 🙏`;
                await sendWhatsApp(remoteJid.split('@')[0], ackMsg, instance);
                return;
            }
            else {
                await sendWhatsApp(remoteJid.split('@')[0], 'Por favor, responda apenas com um número de *1 a 5* para avaliar seu atendimento. 😊', instance);
                return;
            }
        }
    }
    // Handoff
    if (detectsHandoff(message)) {
        await supabaseAdmin.from('whatsapp_chat_sessions').upsert({ shop_id: shopId, remote_jid: remoteJid, bot_paused: true, last_message_at: new Date().toISOString() }, { onConflict: 'shop_id,remote_jid' });
        await sendWhatsApp(remoteJid.split('@')[0], '✅ Entendido! Vou chamar um de nossos atendentes. Aguarde um momento, por favor.', instance);
        try {
            const { data: shop } = await supabaseAdmin.from('shops').select('name, whatsapp_instance').eq('id', shopId).single();
            const { data: ownerSettings } = await supabaseAdmin.from('settings').select('phone').eq('shop_id', shopId).single();
            if (ownerSettings?.phone) {
                const ownerMsg = `🔔 *Atendimento Humano Solicitado*\n\nCliente: *${clientName}*\nNúmero: *${remoteJid.split('@')[0]}*\nÚltima mensagem: "${message}"\n\nAcesse o WhatsApp para retomar o atendimento.`;
                await sendWhatsApp(ownerSettings.phone, ownerMsg, shop?.whatsapp_instance || instance);
            }
        }
        catch (e) {
            console.error('[Chatbot] Erro no handoff:', e);
        }
        return;
    }
    let { data: session } = await supabaseAdmin.from('whatsapp_chat_sessions').select('*').eq('shop_id', shopId).eq('remote_jid', remoteJid).maybeSingle();
    if (!session) {
        const { data: newSession } = await supabaseAdmin.from('whatsapp_chat_sessions').insert({ shop_id: shopId, remote_jid: remoteJid, context: {}, messages: [], message_count: 0 }).select('*').single();
        session = newSession;
    }
    if (session?.bot_paused) {
        const lastMsg = session.last_message_at ? dayjs(session.last_message_at) : null;
        if (lastMsg && dayjs().diff(lastMsg, 'hour', true) >= 24) {
            await supabaseAdmin.from('whatsapp_chat_sessions').update({ bot_paused: false, last_message_at: new Date().toISOString() }).eq('id', session.id);
            session = { ...session, bot_paused: false };
        }
        else
            return;
    }
    const SESSION_EXPIRY_HOURS = 2;
    if (session?.last_message_at && dayjs().diff(dayjs(session.last_message_at), 'hour', true) >= SESSION_EXPIRY_HOURS) {
        await supabaseAdmin.from('whatsapp_chat_sessions').update({ messages: [], context: {}, message_count: 0, last_message_at: new Date().toISOString() }).eq('id', session.id);
        session = { ...session, messages: [], context: {}, message_count: 0 };
    }
    const MSG_LIMIT_PER_HOUR = 20;
    if ((session?.message_count || 0) >= MSG_LIMIT_PER_HOUR) {
        const lastMsgAt = session?.last_message_at ? dayjs(session.last_message_at) : null;
        if (lastMsgAt && dayjs().diff(lastMsgAt, 'hour') < 1) {
            await sendWhatsApp(remoteJid.split('@')[0], '⏳ Você atingiu o limite de mensagens por hora. Por favor, aguarde um momento para continuar seu agendamento.', instance);
            return;
        }
    }
    const { data: shop } = await supabaseAdmin.from('shops').select('name').eq('id', shopId).single();
    const { data: professionals } = await supabaseAdmin.from('professionals').select('id, name, role').eq('shop_id', shopId).eq('active', true);
    const { data: services } = await supabaseAdmin.from('services').select('id, name, price, duration').eq('shop_id', shopId).eq('active', true);
    const { data: settings } = await supabaseAdmin.from('settings').select('business_hours').eq('shop_id', shopId).single();
    const professionalsText = professionals?.map(p => `- ${p.name} (ID: ${p.id})`).join('\n') || '(nenhum)';
    const servicesText = services?.map(s => `- ${s.name} | R$${Number(s.price).toFixed(2)} | ${s.duration}min (ID: ${s.id})`).join('\n') || '(nenhum)';
    const daysMap = { sunday: 'Domingo', monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado' };
    const businessHoursText = settings?.business_hours ? Object.entries(settings.business_hours).map(([day, h]) => `- ${daysMap[day] || day}: ${h.active ? `${h.start} às ${h.end}` : 'FECHADO'}`).join('\n') : '(não configurado)';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const tools = [{
            functionDeclarations: [
                { name: "list_services", description: "Retorna a lista de serviços" },
                { name: "list_professionals", description: "Retorna a lista de barbeiros" },
                { name: "check_availability", description: "Verifica horários livres", parameters: { type: SchemaType.OBJECT, properties: { professional_id: { type: SchemaType.STRING }, date: { type: SchemaType.STRING }, service_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } } }, required: ["professional_id", "date"] } },
                { name: "book_appointment", description: "Efetiva o agendamento", parameters: { type: SchemaType.OBJECT, properties: { service_ids: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }, professional_id: { type: SchemaType.STRING }, date: { type: SchemaType.STRING }, time: { type: SchemaType.STRING } }, required: ["service_ids", "professional_id", "date", "time"] } }
            ]
        }];
    const systemInstruction = `Você é o assistente virtual da barbearia "${shop?.name}". Hoje é: ${dayjs().tz('America/Sao_Paulo').format('dddd, DD/MM/YYYY')}\n\nPROFISSIONAIS:\n${professionalsText}\n\nSERVIÇOS:\n${servicesText}\n\nHORÁRIOS:\n${businessHoursText}`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", tools, systemInstruction });
    const chat = model.startChat({ history: (session.messages || []).slice(-20).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) });
    const MAX_RETRIES = 3;
    const RETRY_DELAYS_MS = [1000, 3000, 7000];
    let reply = '', lastError = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            let result = await chat.sendMessage(message);
            let response = result.response;
            let call = response.functionCalls();
            while (call && call.length > 0) {
                const toolResults = [];
                for (const fn of call) {
                    let data;
                    if (fn.name === "list_services")
                        data = services;
                    else if (fn.name === "list_professionals")
                        data = professionals;
                    else if (fn.name === "check_availability") {
                        const args = fn.args;
                        data = await getAvailableSlotsForAI(shopId, args.professional_id, args.date, args.service_ids);
                    }
                    else if (fn.name === "book_appointment") {
                        const args = fn.args;
                        const phone = remoteJid.split('@')[0];
                        let { data: client } = await supabaseAdmin.from('clients').select('id').eq('shop_id', shopId).eq('phone', phone).maybeSingle();
                        if (!client) {
                            const { data: nc } = await supabaseAdmin.from('clients').insert({ shop_id: shopId, name: clientName, phone }).select('id').single();
                            client = nc;
                        }
                        let totalValue = 0;
                        if (args.service_ids?.length) {
                            const { data: sd } = await supabaseAdmin.from('services').select('id, price').in('id', args.service_ids).eq('shop_id', shopId);
                            totalValue = sd?.reduce((s, x) => s + Number(x.price), 0) || 0;
                        }
                        const { data: rpcR, error: rpcE } = await supabaseAdmin.rpc('book_appointment', { p_shop_id: shopId, p_client_name: clientName, p_client_phone: phone, p_service_ids: args.service_ids, p_professional_id: args.professional_id, p_date: args.date, p_time: args.time, p_total_value: totalValue });
                        data = rpcE ? { success: false, error: rpcE.message } : (rpcR.status === 'success' ? { success: true, appointmentId: rpcR.id } : { success: false, error: rpcR.message });
                    }
                    toolResults.push({ functionResponse: { name: fn.name, response: { content: data } } });
                }
                result = await chat.sendMessage(toolResults);
                response = result.response;
                call = response.functionCalls();
            }
            reply = response.text();
            lastError = null;
            break;
        }
        catch (error) {
            lastError = error;
            if (attempt < MAX_RETRIES - 1)
                await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        }
    }
    if (lastError || !reply) {
        await sendWhatsApp(remoteJid.split('@')[0], '⚠️ Tive uma dificuldade técnica. Tente novamente em instantes.', instance);
        return;
    }
    const updatedMessages = [...(session.messages || []), { role: 'user', content: message }, { role: 'assistant', content: reply }];
    await supabaseAdmin.from('whatsapp_chat_sessions').update({ messages: updatedMessages, last_message_at: new Date().toISOString(), message_count: (session.message_count || 0) + 1 }).eq('id', session.id);
    await sendWhatsApp(remoteJid.split('@')[0], reply, instance);
}
async function getAvailableSlotsForAI(shopId, proId, date, serviceIds) {
    const { data: proValidation } = await supabaseAdmin.from('professionals').select('id').eq('id', proId).eq('shop_id', shopId).maybeSingle();
    if (!proValidation)
        return { error: "Profissional não encontrado." };
    const { data: settings } = await supabaseAdmin.from('settings').select('business_hours').eq('shop_id', shopId).single();
    const dayOfWeek = dayjs(date).locale('en').format('dddd').toLowerCase();
    const hours = settings?.business_hours?.[dayOfWeek];
    if (!hours || !hours.active)
        return { error: "A barbearia não abre nesta data." };
    // Calcula duração total
    let totalDuration = 30; // padrão
    if (serviceIds && serviceIds.length > 0) {
        const { data: svcs } = await supabaseAdmin.from('services').select('duration').in('id', serviceIds);
        totalDuration = svcs?.reduce((acc, s) => acc + (s.duration || 30), 0) || 30;
    }
    const { data: appointments } = await supabaseAdmin.from('appointments').select('time, service_ids').eq('professional_id', proId).eq('date', date).not('status', 'eq', 'cancelled');
    const { data: blocks } = await supabaseAdmin.from('blocked_slots').select('start_time, end_time').eq('professional_id', proId).eq('date', date);
    // Cache de serviços para cálculo de fim de agendamentos existentes
    const { data: allServices } = await supabaseAdmin.from('services').select('id, duration').eq('shop_id', shopId);
    const serviceDurationMap = new Map(allServices?.map(s => [s.id, s.duration]) || []);
    const slots = [];
    let current = dayjs(`${date}T${hours.start}`);
    const endLimit = dayjs(`${date}T${hours.end}`);
    while (current.isBefore(endLimit)) {
        const timeStr = current.format('HH:mm');
        const slotEnd = current.add(totalDuration, 'minute');
        // Se o serviço ultrapassa o horário de fechamento, não é válido
        // Usando a lógica sugerida: current + duration < end + 1min
        if (slotEnd.isAfter(endLimit)) {
            current = current.add(30, 'minute');
            continue;
        }
        // Verifica se o intervalo [current, slotEnd] está livre
        let isFree = true;
        // 1. Verifica conflito com agendamentos existentes
        for (const apt of (appointments || [])) {
            const aptStart = dayjs(`${date}T${apt.time.substring(0, 5)}`);
            const aptDur = apt.service_ids?.reduce((acc, sid) => acc + (serviceDurationMap.get(sid) || 30), 0) || 30;
            const aptEnd = aptStart.add(aptDur, 'minute');
            // Sobreposição: (start1 < end2) && (end1 > start2)
            if (current.isBefore(aptEnd) && slotEnd.isAfter(aptStart)) {
                isFree = false;
                break;
            }
        }
        if (isFree) {
            // 2. Verifica conflito com bloqueios
            for (const block of (blocks || [])) {
                const blockStart = dayjs(`${date}T${block.start_time.substring(0, 5)}`);
                const blockEnd = dayjs(`${date}T${block.end_time.substring(0, 5)}`);
                if (current.isBefore(blockEnd) && slotEnd.isAfter(blockStart)) {
                    isFree = false;
                    break;
                }
            }
        }
        if (isFree)
            slots.push(timeStr);
        current = current.add(30, 'minute');
    }
    return { available_slots: slots };
}
