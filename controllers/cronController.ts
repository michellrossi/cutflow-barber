import { supabaseAdmin } from '../lib/supabase';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isInstanceConnected, generateWhatsAppMessage, sendWhatsApp, logAutomatedMessage } from '../lib/helpers';

dayjs.extend(utc);
dayjs.extend(timezone);

interface ShopMetrics {
    name: string;
    instance: string;
    connected: boolean;
    currentWeek: AppointmentData[];
    prevWeek: AppointmentData[];
}

interface AppointmentData {
    id: string;
    shop_id: string;
    total_value: number;
    date: string;
    status: string;
    service_ids: string[];
    shops: {
        id: string;
        name: string;
        whatsapp_instance: string;
        whatsapp_connected: boolean;
    };
}

interface BirthdayClient {
    id: string;
    name: string;
    phone: string;
    shop_id: string;
}

export async function runCronLogic() {
    console.log("[Cron] Iniciando verificação de lembretes (Timezone SP - GMT-3)...");
    const now = dayjs().tz('America/Sao_Paulo');

    const todayStr = now.format('YYYY-MM-DD');
    const tomorrowStr = now.add(1, 'day').format('YYYY-MM-DD');
    const thirtyDaysAgoStr = now.subtract(30, 'day').format('YYYY-MM-DD');
    const thirtyThreeDaysAgoStr = now.subtract(33, 'day').format('YYYY-MM-DD');

    const maxRetries = 3;
    const serviceCache = new Map<string, Map<string, string>>(); // shopId -> (serviceId -> name)

    const getServicesNamesForApt = async (shopId: string, serviceIds: string[]) => {
        if (!serviceIds || serviceIds.length === 0) return "serviços";
        
        if (!serviceCache.has(shopId)) {
            const { data } = await supabaseAdmin.from('services').select('id, name').eq('shop_id', shopId);
            const map = new Map<string, string>();
            data?.forEach(s => map.set(s.id, s.name));
            serviceCache.set(shopId, map);
        }
        
        const shopMap = serviceCache.get(shopId)!;
        return serviceIds.map(id => shopMap.get(id) || "serviço").join(', ');
    };

    // 1. Lembretes de 24 Horas
    const { data: apts24h } = await supabaseAdmin
        .from('appointments')
        .select('*, professionals(name), shops(id, name, whatsapp_instance, whatsapp_connected)')
        .in('status', ['confirmed', 'scheduled'])
        .eq('reminder_24h_sent', false)
        .lte('send_attempts_24h', maxRetries - 1)
        .gte('date', todayStr)
        .lte('date', tomorrowStr);
    if (apts24h) {
        for (const apt of apts24h) {
            const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
            if (!shop?.whatsapp_connected) {
                console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando lembrete 24h.`);
                continue;
            }
            if (!(await isInstanceConnected(apt.shop_id, shop.whatsapp_instance))) continue;
            const aptDateTime = dayjs.tz(`${apt.date}T${apt.time}`, 'America/Sao_Paulo');
            const diffHours = aptDateTime.diff(now, 'hour', true);
            if (diffHours <= 25 && diffHours >= 23) {
                const servicesNames = await getServicesNamesForApt(apt.shop_id, apt.service_ids || []);
                const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const formattedTime = apt.time.substring(0, 5);
                const msg = await generateWhatsAppMessage('appointment_reminder_24h', {
                    clientName: apt.client_name,
                    services: servicesNames,
                    date: formattedDate,
                    time: formattedTime,
                    proName: apt.professionals?.name || "seu barbeiro",
                    shopName: shop.name
                }, apt.shop_id);
                if (!msg) continue;
                const ok = await sendWhatsApp(apt.client_phone, msg, shop.whatsapp_instance);
                if (ok) {
                    await supabaseAdmin.from('appointments').update({ reminder_24h_sent: true }).eq('id', apt.id);
                    await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, 'Lembrete 24h', 'sent');
                } else {
                    const attempts = (apt.send_attempts_24h || 0) + 1;
                    await supabaseAdmin.from('appointments').update({ send_attempts_24h: attempts }).eq('id', apt.id);
                    await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, 'Lembrete 24h', 'failed');
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
            const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
            if (!shop?.whatsapp_connected) {
                console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando lembrete 1h.`);
                continue;
            }
            if (!(await isInstanceConnected(apt.shop_id, shop.whatsapp_instance))) continue;
            const aptDateTime = dayjs.tz(`${apt.date}T${apt.time}`, 'America/Sao_Paulo');
            const diffMinutes = aptDateTime.diff(now, 'minute', true);
            if (diffMinutes <= 70 && diffMinutes >= 50) {
                const servicesNames = await getServicesNamesForApt(apt.shop_id, apt.service_ids || []);
                const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const formattedTime = apt.time.substring(0, 5);
                const msg = await generateWhatsAppMessage('appointment_reminder_1h', {
                    clientName: apt.client_name,
                    services: servicesNames,
                    date: formattedDate,
                    time: formattedTime,
                    proName: apt.professionals?.name || "seu barbeiro",
                    shopName: shop.name
                }, apt.shop_id);
                if (!msg) continue;
                const ok = await sendWhatsApp(apt.client_phone, msg, shop.whatsapp_instance);
                if (ok) {
                    await supabaseAdmin.from('appointments').update({ reminder_1h_sent: true }).eq('id', apt.id);
                    await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, 'Lembrete 1h', 'sent');
                } else {
                    const attempts = (apt.send_attempts_1h || 0) + 1;
                    await supabaseAdmin.from('appointments').update({ send_attempts_1h: attempts }).eq('id', apt.id);
                    await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, 'Lembrete 1h', 'failed');
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
            const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
            if (!shop?.whatsapp_connected) {
                console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando reagendamento.`);
                continue;
            }
            if (!(await isInstanceConnected(apt.shop_id, shop.whatsapp_instance))) continue;
            const servicesNames = await getServicesNamesForApt(apt.shop_id, apt.service_ids || []);
            const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const formattedTime = apt.time.substring(0, 5);

            const msg = await generateWhatsAppMessage('rescheduling_request', {
                clientName: apt.client_name,
                services: servicesNames,
                date: formattedDate,
                time: formattedTime,
                proName: apt.professionals?.name || "seu barbeiro",
                shopName: shop.name
            }, apt.shop_id);
            if (!msg) continue;
            const ok = await sendWhatsApp(apt.client_phone, msg, shop.whatsapp_instance);
            if (ok) {
                await supabaseAdmin.from('appointments').update({ rescheduling_sent: true }).eq('id', apt.id);
                await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, 'Reagendamento', 'sent');
            } else {
                const attempts = (apt.send_attempts_reschedule || 0) + 1;
                await supabaseAdmin.from('appointments').update({ send_attempts_reschedule: attempts }).eq('id', apt.id);
                await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, 'Reagendamento', 'failed');
            }
        }
    }

    // 4. Pós-venda + NPS
    const { data: aptsPostSale } = await supabaseAdmin
        .from('appointments')
        .select('*, professionals(name), shops(id, name, whatsapp_instance, whatsapp_connected)')
        .eq('status', 'completed')
        .eq('post_sale_sent', false)
        .lte('send_attempts_postsale', maxRetries - 1)
        .eq('date', todayStr);
    if (aptsPostSale) {
        for (const apt of aptsPostSale) {
            const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
            if (!shop?.whatsapp_connected) {
                console.warn(`[Cron] Loja ${apt.shop_id} offline (DB). Pulando pós-venda.`);
                continue;
            }
            if (!(await isInstanceConnected(apt.shop_id, shop.whatsapp_instance))) continue;
            const aptDateTime = dayjs.tz(`${apt.date}T${apt.time}`, 'America/Sao_Paulo');
            const diffMinutes = now.diff(aptDateTime, 'minute', true);
            if (diffMinutes >= 120 && diffMinutes < 1440) {
                const servicesNames = await getServicesNamesForApt(apt.shop_id, apt.service_ids || []);
                const formattedDate = new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                const formattedTime = apt.time.substring(0, 5);
                const msg = await generateWhatsAppMessage('post_sale', {
                    clientName: apt.client_name,
                    services: servicesNames,
                    date: formattedDate,
                    time: formattedTime,
                    proName: apt.professionals?.name || "seu barbeiro",
                    shopName: shop.name
                }, apt.shop_id);
                if (!msg) continue;
                const ok = await sendWhatsApp(apt.client_phone, msg, shop.whatsapp_instance);
                if (ok) {
                    await supabaseAdmin.from('appointments').update({ post_sale_sent: true }).eq('id', apt.id);
                    await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, 'Pós-venda', 'sent');

                    const npsMsg =
                        `⭐ Muito obrigado pelo seu feedback, ${apt.client_name || 'cliente'}!\n\n` +
                        `De *1 a 5*, qual nota você daria para o seu atendimento de hoje?\n\n` +
                        `1️⃣ Péssimo\n2️⃣ Ruim\n3️⃣ Regular\n4️⃣ Bom\n5️⃣ Ótimo\n\n` +
                        `_Responda apenas com o número. Sua opinião nos ajuda a melhorar!_ ✏️`;

                    const npsOk = await sendWhatsApp(apt.client_phone, npsMsg, shop.whatsapp_instance);
                    if (npsOk) {
                        const remoteJid = `${apt.client_phone.replace(/\D/g, '').replace(/^(?!55)/, '55')}@s.whatsapp.net`;
                        await supabaseAdmin
                            .from('whatsapp_chat_sessions')
                            .upsert({
                                shop_id: apt.shop_id,
                                remote_jid: remoteJid,
                                context: { nps_pending: true, nps_appointment_id: apt.id },
                                last_message_at: new Date().toISOString()
                            }, { onConflict: 'shop_id,remote_jid', ignoreDuplicates: false });
                    }
                } else {
                    const attempts = (apt.send_attempts_postsale || 0) + 1;
                    await supabaseAdmin.from('appointments').update({ send_attempts_postsale: attempts }).eq('id', apt.id);
                    await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, 'Pós-venda', 'failed');
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
            const shop = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
            if (!shop?.whatsapp_connected) continue;
            if (!(await isInstanceConnected(apt.shop_id, shop.whatsapp_instance))) continue;

            const msg = await generateWhatsAppMessage('retention_30d', {
                clientName: apt.client_name,
                shopName: shop.name
            }, apt.shop_id);
            if (!msg) continue;
            const ok = await sendWhatsApp(apt.client_phone, msg, shop.whatsapp_instance);
            if (ok) {
                await supabaseAdmin.from('appointments').update({ reminder_30d_sent: true }).eq('id', apt.id);
                await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, 'Retenção 30 dias', 'sent');
            } else {
                const attempts = (apt.send_attempts_30d || 0) + 1;
                await supabaseAdmin.from('appointments').update({ send_attempts_30d: attempts }).eq('id', apt.id);
                await logAutomatedMessage(apt.shop_id, apt.client_name, apt.client_phone, 'Retenção 30 dias', 'failed');
            }
        }
    }

    // 6. Aniversariantes do Dia
    const currentHourSP = now.hour();
    if (currentHourSP >= 9) {
        const { data: bdayClients, error: bdayError } = await supabaseAdmin.rpc('get_birthday_clients_today');
        if (bdayError) console.error('[Cron] Erro bday RPC:', bdayError.message);
        
        if (bdayClients && (bdayClients as BirthdayClient[]).length > 0) {
            const clients = bdayClients as BirthdayClient[];
            const shopIds = [...new Set(clients.map(c => c.shop_id))];
            const { data: shopList } = await supabaseAdmin
                .from('shops')
                .select('id, name, whatsapp_instance, whatsapp_connected')
                .in('id', shopIds);
            
            const shopMap = new Map((shopList || []).map((s: any) => [s.id, s]));
            for (const client of clients) {
                const shop = shopMap.get(client.shop_id);
                if (!shop?.whatsapp_connected) continue;
                if (!(await isInstanceConnected(client.shop_id, shop.whatsapp_instance))) continue;

                const msg = await generateWhatsAppMessage('birthday', {
                    clientName: client.name,
                    shopName: shop.name
                }, client.shop_id);
                const sentOk = await sendWhatsApp(client.phone, msg, shop.whatsapp_instance);
                if (msg && sentOk) {
                    await supabaseAdmin.from('clients').update({ birthday_last_sent_year: now.year() }).eq('id', client.id);
                    await logAutomatedMessage(client.shop_id, client.name, client.phone, 'Aniversário', 'sent');
                } else if (msg) {
                    await logAutomatedMessage(client.shop_id, client.name, client.phone, 'Aniversário', 'failed');
                }
            }
        }
    }

    // 7. Limpeza Semanal e Relatórios (Segunda)
    if (now.day() === 1) {
        const sevenDaysAgo = now.subtract(7, 'day').toISOString();
        await supabaseAdmin.from('whatsapp_chat_sessions').delete().lt('last_message_at', sevenDaysAgo);
        
        const thirtyDaysAgoIso = now.subtract(30, 'day').toISOString();
        await supabaseAdmin.from('webhook_events').delete().lt('created_at', thirtyDaysAgoIso);

        if (now.hour() === 7 && now.minute() < 11) {
            const sevenDaysAgo = now.subtract(7, 'day').format('YYYY-MM-DD');
            const fourteenDaysAgo = now.subtract(14, 'day').format('YYYY-MM-DD');
            const { data: allApts } = await supabaseAdmin
                .from('appointments')
                .select(`id, shop_id, total_value, date, status, service_ids, shops (id, name, whatsapp_instance, whatsapp_connected)`)
                .gte('date', fourteenDaysAgo)
                .lte('date', todayStr);
            
            if (allApts && (allApts as unknown as AppointmentData[]).length > 0) {
                const appointments = allApts as unknown as AppointmentData[];
                const shopsData = new Map<string, ShopMetrics>();
                
                appointments.forEach(apt => {
                    if (!shopsData.has(apt.shop_id)) {
                        const shopRow = Array.isArray(apt.shops) ? apt.shops[0] : apt.shops;
                        shopsData.set(apt.shop_id, {
                            name: shopRow?.name,
                            instance: shopRow?.whatsapp_instance,
                            connected: shopRow?.whatsapp_connected,
                            currentWeek: [],
                            prevWeek: []
                        });
                    }
                    const shop = shopsData.get(apt.shop_id)!;
                    if (apt.date >= sevenDaysAgo) shop.currentWeek.push(apt);
                    else shop.prevWeek.push(apt);
                });

                // PONTO 7: Eliminar N+1 de settings
                const allShopIds = Array.from(shopsData.keys());
                const { data: allSettings } = await supabaseAdmin
                    .from('settings')
                    .select('shop_id, phone')
                    .in('shop_id', allShopIds);
                
                const settingsMap = new Map(allSettings?.map(s => [s.shop_id, s.phone]) || []);

                for (const [sId, data] of shopsData.entries()) {
                    if (!data.connected) continue;
                    const phone = settingsMap.get(sId);
                    if (!phone) continue;

                    const curRev = data.currentWeek.filter(a => a.status === 'completed').reduce((sum, a) => sum + (a.total_value || 0), 0);
                    const preRev = data.prevWeek.filter(a => a.status === 'completed').reduce((sum, a) => sum + (a.total_value || 0), 0);
                    const curCount = data.currentWeek.length;
                    const preCount = data.prevWeek.length;

                    const svcCounts: Record<string, number> = {};
                    data.currentWeek.forEach(a => a.service_ids?.forEach(id => svcCounts[id] = (svcCounts[id] || 0) + 1));
                    const topSvcIds = Object.entries(svcCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
                    
                    const { data: svcsNames } = topSvcIds.length ? await supabaseAdmin.from('services').select('name').in('id', topSvcIds) : { data: [] };
                    const topSvcStr = (svcsNames as { name: string }[] | null)?.map(s => s.name).join(', ') || 'N/A';

                    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
                    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
                    const prompt = `Você é um Consultor de Negócios especializado em barbearias de alto padrão. Analise os dados e escreva um parágrafo motivador (máx 400 caracteres).\n\nBarbearia: ${data.name}\nFaturamento esta semana: R$${curRev.toFixed(2)} (Semana passada: R$${preRev.toFixed(2)})\nAgendamentos: ${curCount} (Semana passada: ${preCount})\nServiços populares: ${topSvcStr}`;

                    const result = await model.generateContent(prompt);
                    const fullMsg = `📊 *Resumo Semanal - CutFlow Insights*\n\n${result.response.text()}\n\n_Para ver detalhes, acesse seu painel administrativo._`;
                    await sendWhatsApp(sets.phone, fullMsg, data.instance);
                }
            }
        }
    }
}
