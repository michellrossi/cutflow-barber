import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ShopState, Service, Professional, Coupon, Appointment, ShopSettings, Shop, BlockedSlot, Client, MessageTemplate, SubscriptionPlan, ClientSubscription, MessageCategory, AutomationTrigger, Product, Goal, CashSession, CashFlowEntry } from '../types';
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';
import {
    mapShop, mapSettings, mapAutomationTrigger, mapClient,
    mapService, mapProfessional, mapCoupon, mapAppointment,
    mapBlockedSlot, mapMessageTemplate, mapMessageCategory,
    mapSubscriptionPlan, mapClientSubscription,
    mapProduct, mapGoal, mapCashSession, mapCashFlowEntry,
    type ShopRow,
    type GoalRow,
    type ProductRow,
} from './mappers';

import {
    sanitize, formatCurrencyBRL, calculateTrialStatus,
    DEFAULT_SCHEDULE, PROFESSIONAL_COLORS, INITIAL_STATE,
} from './helpers';

// Compat export (alguns clients importam direto de `store.tsx`)
export { formatCurrencyBRL };

// Standard response type for mutations
type MutationResult<T = any> = Promise<{ success: boolean; data?: T; error?: string }>;

interface ShopContextType extends ShopState {
    session: Session | null;
    loading: boolean;
    userRole: 'owner' | 'barber' | null;

    // Auth Actions
    login: (email: string, password: string) => Promise<{ error: any }>;
    signup: (email: string, password: string, shopName: string, slug: string, intent: 'create_shop' | 'join_team', fullName: string, phone: string) => Promise<{ error: any }>;
    logout: () => void;
    resetPassword: (email: string) => Promise<{ success: boolean, error?: string }>;

    // Data Loading
    loadShopBySlug: (slug: string) => Promise<boolean>;
    switchShop: (shopId: string) => Promise<void>;
    addAdditionalUnit: (shopName: string, slug: string, phone: string) => MutationResult;
    deleteCurrentShop: () => MutationResult;
    refresh: () => void;

    // Actions - Now returning MutationResult
    // Appointment Actions
    updateAppointmentPaymentMethod: (id: string, paymentMethod: string, usedSubscriptionId?: string) => MutationResult;
    updateAppointmentTotalValue: (id: string, newTotal: number) => MutationResult;

    addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>) => MutationResult;
    createManualAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>) => MutationResult;
    updateAppointmentStatus: (id: string, status: string) => MutationResult;

    updateSettings: (settings: Partial<ShopSettings>) => MutationResult;

    // WhatsApp Actions
    getWhatsAppQRCode: () => Promise<{ qrcode?: string; connected?: boolean; error?: string }>;
    getWhatsAppStatus: () => Promise<{ connected: boolean; error?: string }>;
    disconnectWhatsApp: () => Promise<{ success: boolean; error?: string }>;

    formatCurrencyBRL: (value: number) => string;
    // reloadClients moved to ClientContext

    // [NOVO] SAAS ADMIN
    fetchGlobalShops: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<ShopState>(INITIAL_STATE);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'owner' | 'barber' | null>(null);

    // Load client session and theme from storage on init
    useEffect(() => {
        const savedClient = sessionStorage.getItem('currentClient');
        const savedSession = sessionStorage.getItem('clientSession');

        // Força modo claro em todas as inicializações
        setState(prev => ({ ...prev, theme: 'light' }));
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('theme', 'light');

        if (savedClient && savedSession) {
            try {
                setState(prev => ({
                    ...prev,
                    currentClient: JSON.parse(savedClient),
                    clientSession: JSON.parse(savedSession)
                }));
            } catch (e) {
                console.error("Erro ao carregar sessão do cliente:", e);
            }
        }
    }, []);

    // --- Helper to reload ONLY appointments (Lighter than fetchData) ---
    // Janela de 90 dias: cobre Dashboard (30d), Relatórios (90d) e Metas
    const APPT_WINDOW_DAYS = 90;

    const reloadAppointments = async (shopId: string) => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - APPT_WINDOW_DAYS);
        const dateLimitStr = pastDate.toISOString().split('T')[0];

        const { data: appts } = await supabase
            .from('appointments')
            .select('*')
            .eq('shop_id', shopId)
            .gte('date', dateLimitStr)
            .order('date', { ascending: false })
            .order('time', { ascending: false });

        if (appts) {
            const mapped = appts.map(mapAppointment);
            setState(prev => ({ ...prev, appointments: mapped }));
        }
    };

    const reloadClients = async (shopId: string) => {
        const { data: clients } = await supabase
            .from('clients')
            .select('*')
            .eq('shop_id', shopId)
            .order('name', { ascending: true });

        if (clients) {
            const mapped = clients.map(mapClient);
            setState(prev => ({ ...prev, clients: mapped }));
        }
    };

    const ensureClientExists = async (shopId: string, name: string, phone: string, birthDate?: string) => {
        const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .eq('shop_id', shopId)
            .eq('phone', phone)
            .maybeSingle();

        if (!existing) {
            await supabase.from('clients').insert({
                shop_id: shopId,
                name: name,
                phone: phone,
                birth_date: birthDate
            });
            await reloadClients(shopId);
        }
    };

    // --- Core Fetch Logic (Heavy - Use sparingly) ---
    const fetchData = async (targetShopId?: string) => {
        setLoading(true);

        try {
            let shopId = targetShopId;
            let currentShopData: Shop | null = state.shop;

            // Se um targetShopId foi passado, precisamos garantir que temos os dados dessa loja
            if (targetShopId) {
                const { data: targetShopData } = await supabase.from('shops').select('*').eq('id', targetShopId).single();
                if (targetShopData) {
                    shopId = targetShopId;
                    currentShopData = mapShop(targetShopData);
                }
            }

            const { data: { session: currentSession } } = await supabase.auth.getSession();

            // Só tenta descobrir o shopId se ele NÃO foi passado
            if (!shopId) {
                const userId = currentSession?.user?.id;
                const userEmail = currentSession?.user?.email;

                // 1. Tenta encontrar as lojas onde o usuário é DONO
                if (userId) {
                    const { data: shopsData } = await supabase.from('shops').select('*').eq('owner_id', userId).order('created_at', { ascending: true });
                    if (shopsData && shopsData.length > 0) {
                        const mappedShops = shopsData.map(mapShop);
                        // Pega a primeira como inicial se nenhuma estiver ativa
                        const activeShop = mappedShops.find(s => s.id === state.shop?.id) || mappedShops[0];
                        shopId = activeShop.id;
                        currentShopData = activeShop;
                        setState(prev => ({ ...prev, myShops: mappedShops }));
                    }
                }

                // 2. Se não achou como dono, verifica se é BARBEIRO em alguma loja
                if (!shopId && userEmail) {
                    const { data: proData } = await supabase.from('professionals').select('shop_id').eq('email', userEmail).single();
                    if (proData) {
                        const { data: shopData } = await supabase.from('shops').select('*').eq('id', proData.shop_id).single();
                        if (shopData) {
                            shopId = shopData.id;
                            currentShopData = mapShop(shopData);
                        }
                    }
                }

                // 3. Fallback: Se já temos um shop carregado no state (view de cliente)
                if (!shopId && state.shop?.id) {
                    shopId = state.shop.id;
                }
            }

            if (!shopId) {
                setLoading(false);
                return;
            }

            // Executa queries de configurações e dados estáticos em paralelo
            // LAZY LOAD: clients NÃO está aqui — é carregado sob demanda pela aba Clientes
            const [settingsRes] = await Promise.all([
                supabase.from('settings').select('*').eq('shop_id', shopId).single()
            ]);

            // Agendamentos: janela de 90 dias para cobrir dashboard + relatórios + metas
            const date90d = new Date();
            date90d.setDate(date90d.getDate() - 90);
            const dateLimitStr = date90d.toISOString().split('T')[0];

            let appointmentsData: Appointment[] = [];

            const { data: appts } = await supabase
                .from('appointments')
                .select('*')
                .eq('shop_id', shopId)
                .gte('date', dateLimitStr)
                .order('date', { ascending: false })
                .order('time', { ascending: false });

            if (appts) appointmentsData = appts.map(mapAppointment);


            // --- LÓGICA DE ROLES ---
            if (currentSession?.user) {
                const effectiveShopData = currentShopData || state.shop;

                if (effectiveShopData?.ownerId === currentSession.user.id) {
                    setUserRole('owner');
                } else {
                    const { data: proRecord } = await supabase
                        .from('professionals')
                        .select('id, user_id')
                        .eq('shop_id', shopId)
                        .eq('email', currentSession.user.email)
                        .maybeSingle();

                    if (proRecord) {
                        setUserRole('barber');
                        if (!proRecord.user_id) {
                            await supabase.from('professionals').update({ user_id: currentSession.user.id }).eq('id', proRecord.id);
                        }
                    } else {
                        setUserRole(null);
                    }
                }
            } else {
                setUserRole(null);
            }

            // Calculate Trial
            let trialInfo: { status: 'active' | 'expired' | 'paid', days: number } = { status: 'active', days: 14 };
            if (currentShopData) {
                trialInfo = calculateTrialStatus(currentShopData);
            }

            setState(prev => ({
                ...prev,
                shop: currentShopData || prev.shop,
                settings: settingsRes.data ? mapSettings(settingsRes.data) : { ...INITIAL_STATE.settings, shopId: shopId },
                services: [],
                professionals: [],
                appointments: appointmentsData,
                clients: [],
                subscriptionPlans: [],
                clientSubscriptions: [],
                blockedSlots: [],
                trialStatus: trialInfo.status,
                daysRemaining: trialInfo.days,
                botPausedCount: 0
            }));

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalShops = async () => {
        try {
            const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:3000'
                : `https://${window.location.hostname}`;

            const { data: { session } } = await supabase.auth.getSession();

            const res = await fetch(`${serverUrl}/api/saas/shops`, {
                headers: {
                    'Authorization': `Bearer ${session?.access_token || ''}`
                }
            });
            const result = await res.json();

            if (!res.ok) throw new Error(result.error);
            return { success: true, data: result.shops };
        } catch (error: any) {
            console.error("Error fetching global shops:", error);
            return { success: false, error: error.message };
        }
    };


    const deleteCurrentShop = async (): MutationResult => {
        try {
            const shopId = state.shop?.id;
            if (!shopId) throw new Error("Loja não identificada.");

            // 1. Deleta a loja (Cascade no DB deve cuidar do resto)
            const { error } = await supabase.from('shops').delete().eq('id', shopId);
            if (error) throw error;

            // 2. Atualiza a lista de lojas locais
            const remainingShops = state.myShops.filter(s => s.id !== shopId);

            if (remainingShops.length > 0) {
                // Se restarem lojas, muda para a primeira
                await switchShop(remainingShops[0].id);
            } else {
                // Se não restarem lojas, desloga ou limpa tudo
                await logout();
            }

            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    // --- Realtime Subscriptions ---
    useEffect(() => {
        if (!state.shop?.id) return;

        // 1. Listen for Shop Plan Changes
        const shopChannel = supabase.channel('shop_updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'shops',
                    filter: `id=eq.${state.shop.id}`
                },
                (payload) => {
                    const updatedShop = payload.new as ShopRow;
                    setState(prev => {
                        if (!prev.shop) return prev;
                        const newShopData = { ...prev.shop, ...mapShop(updatedShop) };
                        const newTrialInfo = calculateTrialStatus(newShopData);
                        return {
                            ...prev,
                            shop: newShopData,
                            trialStatus: newTrialInfo.status,
                            daysRemaining: newTrialInfo.days
                        };
                    });
                }
            )
            .subscribe();

        // 2. Listen for Appointment Changes (Sync Barber/Admin)
        const appointmentsChannel = supabase.channel('appointments_sync')
            .on(
                'postgres_changes',
                {
                    event: '*', // Insert, Update, Delete
                    schema: 'public',
                    table: 'appointments',
                    filter: `shop_id=eq.${state.shop.id}`
                },
                () => {
                    reloadAppointments(state.shop!.id);
                }
            )
            .subscribe();

        // 5. Listen for Client Changes
        const clientsChannel = supabase.channel('clients_sync')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'clients',
                    filter: `shop_id=eq.${state.shop.id}`
                },
                () => {
                    reloadClients(state.shop!.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(shopChannel);
            supabase.removeChannel(appointmentsChannel);
            supabase.removeChannel(clientsChannel);
        }
    }, [state.shop?.id]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
            setSession(activeSession);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
            setSession(activeSession);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (session?.user) {
            fetchData();
        } else if (!loading && !session) {
            setState(INITIAL_STATE);
            setUserRole(null);
        }
    }, [session]);

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/update-password',
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
    };

    const initNewShop = async (userId: string, shopName: string, slug: string, phone: string) => {
        const cleanShopName = sanitize(shopName);
        const cleanSlug = sanitize(slug).toLowerCase().replace(/[^\w-]/g, '');

        const { data: shopData, error: shopError } = await supabase.from('shops').insert({
            owner_id: userId,
            name: cleanShopName,
            slug: cleanSlug,
            plan: 'trial',
            trial_started_at: new Date().toISOString(),
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        }).select().single();

        if (shopError || !shopData) throw shopError;

        await supabase.from('settings').insert({
            shop_id: shopData.id,
            name: cleanShopName,
            phone: sanitize(phone),
            primary_color: '#f97316',
            secondary_color: '#1e293b'
        });

        const defaultCategories = [
            { shop_id: shopData.id, name: 'Confirmação Imediata' },
            { shop_id: shopData.id, name: 'Lembrete 24h' },
            { shop_id: shopData.id, name: 'Lembrete 1h' },
            { shop_id: shopData.id, name: 'Reagendamento' },
            { shop_id: shopData.id, name: 'Pós-venda e Avaliação' }
        ];
        await supabase.from('message_categories').insert(defaultCategories);

        const defaultTriggers = [
            { shop_id: shopData.id, name: 'Confirmação Imediata', value: 0, unit: 'minutes', period: 'immediate', active: true },
            { shop_id: shopData.id, name: 'Lembrete de Agendamento', value: 1, unit: 'hours', period: 'before', active: true },
            { shop_id: shopData.id, name: 'Pós-Venda e Avaliação', value: 2, unit: 'hours', period: 'after', active: true },
            { shop_id: shopData.id, name: 'Reagendamento', value: 1, unit: 'hours', period: 'after', active: true }
        ];
        const { data: insertedTriggers } = await supabase.from('automation_triggers').insert(defaultTriggers).select();

        const defaultTemplates = [
            {
                shop_id: shopData.id,
                title: 'Confirmação Imediata',
                trigger_id: insertedTriggers?.find(t => t.name === 'Confirmação Imediata')?.id,
                content: 'Olá [CLIENTE]! Seu agendamento para [SERVICO] na [BARBEARIA] foi realizado com sucesso para o dia [DATA] às [HORA] com o profissional [BARBEIRO]. Te esperamos!',
                active: true,
                target: 'client',
                category: 'Confirmação Imediata'
            },
            {
                shop_id: shopData.id,
                title: 'Lembrete de Agendamento',
                trigger_id: insertedTriggers?.find(t => t.name === 'Lembrete de Agendamento')?.id,
                content: 'Olá [CLIENTE], passando para lembrar do seu horário amanhã às [HORA] na [BARBEARIA] para o serviço [SERVICO]. Até logo!',
                active: true,
                target: 'client',
                category: 'Lembrete 24h'
            },
            {
                shop_id: shopData.id,
                title: 'Pós-Venda e Avaliação',
                trigger_id: insertedTriggers?.find(t => t.name === 'Pós-Venda e Avaliação')?.id,
                content: 'Olá [CLIENTE], foi um prazer te atender hoje na [BARBEARIA]! Como foi sua experiência? [LINK_AVALIACAO]',
                active: true,
                target: 'client',
                category: 'Pós-venda e Avaliação'
            },
            {
                shop_id: shopData.id,
                title: 'Solicitação de Reagendamento',
                trigger_id: insertedTriggers?.find(t => t.name === 'Reagendamento')?.id,
                content: 'Olá [CLIENTE], notamos que você não conseguiu comparecer ao seu horário de [SERVICO]. Gostaria de escolher uma nova data para seu atendimento na [BARBEARIA]?',
                active: true,
                target: 'client',
                category: 'Reagendamento'
            }
        ];
        await supabase.from('message_templates').insert(defaultTemplates);

        const defaultServices = [
            { shop_id: shopData.id, name: 'Corte Masculino', price: 30, duration: 30, category: 'Cortes', description: 'Corte tradicional' },
            { shop_id: shopData.id, name: 'Barba', price: 20, duration: 20, category: 'Barba', description: 'Trato na barba' },
            { shop_id: shopData.id, name: 'Corte + Barba', price: 45, duration: 50, category: 'Combos', description: 'Combo promocional' }
        ];
        await supabase.from('services').insert(defaultServices);

        return shopData;
    };

    const signup = async (email: string, password: string, shopName: string, slug: string, intent: 'create_shop' | 'join_team', fullName: string, phone: string) => {
        const cleanShopName = sanitize(shopName);
        const cleanSlug = sanitize(slug).toLowerCase().replace(/[^\w-]/g, '');

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: sanitize(fullName),
                    phone: sanitize(phone)
                }
            }
        });
        if (authError || !authData.user) return { error: authError };

        if (intent === 'join_team') {
            // Check if email is in professionals table
            const { data: proData } = await supabase.from('professionals').select('id, shop_id').eq('email', email).single();

            if (proData) {
                // Link the Auth User ID to the Professional Profile
                await supabase.from('professionals').update({ user_id: authData.user.id }).eq('id', proData.id);
                setSession(authData.session);
                return { error: null };
            } else {
                // Rollback (Not easy in client-side, but effectively the user is created but has no access)
                return { error: { message: 'Este email não consta na lista de profissionais de nenhuma barbearia.' } };
            }
        }

        try {
            const shopData = await initNewShop(authData.user.id, shopName, slug, phone);
            setSession(authData.session);
            await fetchData(shopData.id);
            return { error: null };
        } catch (e: any) {
            return { error: e };
        }
    };

    const logout = () => {
        supabase.auth.signOut();
        setState(INITIAL_STATE);
        setSession(null);
        setUserRole(null);
    };

    const loadShopBySlug = async (slug: string) => {
        setLoading(true);
        const cleanSlug = sanitize(slug);
        const { data } = await supabase.from('shops').select('*').eq('slug', cleanSlug).single();
        if (data) {
            const shop = mapShop(data);
            setState(prev => ({ ...prev, shop }));
            await fetchData(shop.id);
            return true;
        }
        await fetchData(); // Centraliza o controle de setLoading(false) em fetchData
        return false;
    };

    const ensureShopId = () => {
        if (!state.shop?.id) {
            throw new Error("Loja não identificada. Recarregue a página.");
        }
        return state.shop.id;
    };

    // --- OPTIMIZED ACTIONS (LOCAL STATE UPDATES) ---



    const addAppointment = async (apt: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>): MutationResult => {
        try {
            const shopId = ensureShopId();
            const cleanClientName = sanitize(apt.clientName);
            const cleanClientPhone = sanitize(apt.clientPhone);
            // "Sem preferência" normalmente chega como string vazia → backend espera null
            const professionalId = apt.professionalId ? apt.professionalId : null;

            console.log('addAppointment: Iniciando reserva...', { professionalId, date: apt.date, time: apt.time });

            const { error } = await supabase.rpc('book_appointment', {
                p_shop_id: shopId,
                p_client_name: cleanClientName,
                p_client_phone: cleanClientPhone,
                p_service_ids: apt.serviceIds,
                p_professional_id: professionalId,
                p_date: apt.date,
                p_time: apt.time,
                p_total_value: apt.totalValue,
                p_coupon_code: apt.couponCode ? sanitize(apt.couponCode) : null
            });

            if (error) {
                console.error('addAppointment: Erro no RPC book_appointment:', error);
                throw error;
            }

            console.log('addAppointment: Reserva concluída com sucesso no backend.');

            // Garantir que o cliente exista na base de clientes
            await ensureClientExists(shopId, cleanClientName, cleanClientPhone, apt.clientBirthDate);

            // Como o RPC pode envolver validações complexas e triggers,
            // aqui fazemos um fetch leve apenas dos agendamentos para garantir consistência.
            await reloadAppointments(shopId);

            // Trigger AI Confirmation Notification (WhatsApp)
            // We fetch the most recent appointment for this phone to get the ID
            const { data: latestApt } = await supabase
                .from('appointments')
                .select('id')
                .eq('client_phone', cleanClientPhone)
                .eq('shop_id', shopId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // Disparar confirmação via backend (autenticado)
            if (latestApt?.id) {
                const { data: { session: s } } = await supabase.auth.getSession();
                if (s?.access_token) {
                    fetch('/api/notify/confirmation-client', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${s.access_token}`,
                        },
                        body: JSON.stringify({ appointmentId: latestApt.id }),
                    }).catch(() => { /* best-effort */ });
                }
            }

            return { success: true, data: latestApt };
        } catch (e: any) {
            console.error('addAppointment: Exceção capturada:', e.message);
            return { success: false, error: e.message };
        }
    };

    const createManualAppointment = async (apt: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>): MutationResult => {
        try {
            const shopId = ensureShopId();
            const cleanClientName = sanitize(apt.clientName);
            const cleanClientPhone = sanitize(apt.clientPhone);
            const professionalId = apt.professionalId ? apt.professionalId : null;

            const { data, error } = await supabase.from('appointments').insert({
                shop_id: shopId,
                client_name: cleanClientName,
                client_phone: cleanClientPhone,
                service_ids: apt.serviceIds,
                professional_id: professionalId,
                date: apt.date,
                time: apt.time,
                total_value: apt.totalValue,
                coupon_code: null,
                used_subscription_id: apt.usedSubscriptionId,
                status: apt.status || 'confirmed',
                payment_method: apt.paymentMethod
            }).select().single();

            if (error) throw error;

            // Garantir que o cliente exista na base de clientes
            await ensureClientExists(shopId, cleanClientName, cleanClientPhone, apt.clientBirthDate);

            // Optimistic Update
            const newApt = mapAppointment(data);
            // Adicionar no topo da lista (assumindo ordenação por data, mas para feedback imediato o topo é bom)
            // Em um reload real, a ordenação será corrigida pelo banco.
            setState(prev => ({ ...prev, appointments: [newApt, ...prev.appointments] }));

            // Disparar confirmação via backend (autenticado)
            const { data: { session: s } } = await supabase.auth.getSession();
            if (s?.access_token) {
                fetch('/api/notify/confirmation-client', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${s.access_token}`,
                    },
                    body: JSON.stringify({ appointmentId: data.id }),
                }).catch(() => { /* best-effort */ });
            }

            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const updateAppointmentStatus = async (id: string, status: string): MutationResult => {
        try {
            const shopId = ensureShopId();
            const appointment = state.appointments.find(a => a.id === id);

            // Optimistic Update
            setState(prev => ({
                ...prev,
                appointments: prev.appointments.map(a =>
                    a.id === id ? { ...a, status: status as any } : a
                )
            }));

            const { error } = await supabase.from('appointments').update({ status }).eq('id', id);

            if (error) {
                // Rollback on error
                await reloadAppointments(shopId);
                throw error;
            }

            // Somente status 'completed' contabiliza visita/pontos de fidelidade
            const isActivatingStatus = (status === 'completed');
            const wasNotCompleted = appointment ? (appointment.status !== 'completed') : true;

            if (isActivatingStatus && wasNotCompleted && appointment) {
                await processLoyalty(appointment);

                if (status === 'completed' && appointment.usedSubscriptionId) {
                    // Update subscription directly via Supabase to avoid circular dependency
                    const { data: subData } = await supabase.from('client_subscriptions').select('services_used_this_month').eq('id', appointment.usedSubscriptionId).single();
                    if (subData) {
                        await supabase.from('client_subscriptions').update({
                            services_used_this_month: (subData.services_used_this_month || 0) + 1
                        }).eq('id', appointment.usedSubscriptionId);
                    }
                }
            }

            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const processLoyalty = async (appointment: Appointment) => {
        const shopId = appointment.shopId;
        const settings = state.settings;

        if (!settings.loyaltyEnabled) {
            console.log("[Loyalty] Fidelidade desativada nas configurações. Ignorando.");
            return;
        }

        // Tenta achar no state, se não achar (Lazy Load), busca direto no DB
        let client = state.clients.find(c => (appointment.clientId && c.id === appointment.clientId) || c.phone === appointment.clientPhone);

        if (!client) {
            console.log("[Loyalty] Cliente não no state (Lazy Load), buscando no DB...", { phone: appointment.clientPhone });
            const { data: dbClient } = await supabase.from('clients')
                .select('*')
                .eq('shop_id', shopId)
                .eq('phone', appointment.clientPhone)
                .maybeSingle();

            if (dbClient) client = mapClient(dbClient);
        }

        if (!client) {
            console.warn("[Loyalty] Cliente não encontrado no DB para:", appointment.clientPhone);
            return;
        }

        console.log(`[Loyalty] Processando visita de ${client.name} | Modo: ${settings.loyaltyMode}`);

        // Incrementa contador localmente no banco
        let updatedPoints = client.loyaltyPoints || 0;
        let updatedCardCount = client.loyaltyCardCount || 0;
        let rewardTriggered = false;

        if (settings.loyaltyMode === 'points') {
            const pointsEarned = Math.floor(appointment.totalValue * (settings.loyaltyPointsRatio || 1));
            updatedPoints += pointsEarned;
            console.log(`[Loyalty] +${pointsEarned} pts → total: ${updatedPoints} / meta: ${settings.loyaltyPointsGoal}`);
            if (updatedPoints >= (settings.loyaltyPointsGoal || 1000)) {
                rewardTriggered = true;
            }
        } else {
            // Modo cartão: conta visitas
            updatedCardCount += 1;
            console.log(`[Loyalty] Visita ${updatedCardCount} / meta: ${settings.loyaltyCardGoal}`);
            if (updatedCardCount >= (settings.loyaltyCardGoal || 10)) {
                rewardTriggered = true;
            }
        }

        // Atualiza o banco com o novo contador
        const updatePayload: any = {
            total_spent: (client.totalSpent || 0) + appointment.totalValue
        };

        updatePayload.loyalty_points = updatedPoints;
        updatePayload.loyalty_card_count = updatedCardCount;

        const { error: updErr } = await supabase.from('clients').update(updatePayload).eq('id', client.id);
        if (updErr) {
            console.error("[Loyalty] Erro ao atualizar contador de visitas:", updErr);
            return;
        }

        // Se atingiu a meta → chama endpoint do servidor para gerar cupom + enviar WhatsApp
        if (rewardTriggered) {
            console.log(`[Loyalty] 🏆 Meta atingida! Gerando recompensa para ${client.name}...`);
            await generateLoyaltyReward(client, shopId);
        }

        // Recarrega clientes para refletir a atualização na UI
        if (state.clients.length > 0) {
            await reloadClients(shopId);
        }
    };

    const generateLoyaltyReward = async (client: Client, shopId: string) => {
        try {
            // Chama o endpoint do servidor que:
            // 1. Usa RPC atômica para gerar cupom e zerar contadores
            // 2. Dispara WhatsApp ao cliente com o código do cupom
            const response = await fetch('/api/loyalty/reward', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: client.id, shopId })
            });
            const result = await response.json();
            if (result.success) {
                console.log(`[Loyalty] ✅ Recompensa entregue! Cupom: ${result.couponCode} | WhatsApp: ${result.whatsappSent ? 'Enviado' : 'Falhou'}`);
                // Recarrega cupons para exibir o novo na aba Cupons
                const { data: couponsData } = await supabase.from('coupons').select('*').eq('shop_id', shopId);
                if (couponsData) {
                    setState(prev => ({ ...prev, coupons: couponsData.map(mapCoupon) }));
                }
            } else {
                console.error(`[Loyalty] ❌ Falha ao gerar recompensa:`, result.error);
            }
        } catch (e: any) {
            console.error("[Loyalty] Erro ao chamar endpoint de recompensa:", e.message);
        }
    };

    const updateAppointmentTotalValue = async (id: string, newTotal: number): MutationResult => {
        try {
            const rounded = Math.round(newTotal * 100) / 100;

            // Optimistic Update
            setState(prev => ({
                ...prev,
                appointments: prev.appointments.map(a =>
                    a.id === id ? { ...a, totalValue: rounded } : a
                )
            }));

            const { error } = await supabase.from('appointments').update({
                total_value: rounded
            }).eq('id', id);

            if (error) {
                await reloadAppointments(ensureShopId());
                throw error;
            }

            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const updateAppointmentPaymentMethod = async (id: string, paymentMethod: string, usedSubscriptionId?: string): MutationResult => {
        try {
            const shopId = ensureShopId();

            // Optimistic Update
            setState(prev => ({
                ...prev,
                appointments: prev.appointments.map(a =>
                    a.id === id ? {
                        ...a,
                        paymentMethod: paymentMethod as any,
                        usedSubscriptionId: usedSubscriptionId || a.usedSubscriptionId
                    } : a
                )
            }));

            const { error } = await supabase.from('appointments').update({
                payment_method: paymentMethod,
                used_subscription_id: usedSubscriptionId || null
            }).eq('id', id);

            if (error) {
                // Rollback on error
                await reloadAppointments(shopId);
                throw error;
            }

            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const updateSettings = async (updated: any): MutationResult => {
        try {
            const shopId = ensureShopId();

            // 1. Update Shop Table (Name and Slug)
            if (updated.name || updated.slug) {
                const shopPayload: any = {};
                if (updated.name) shopPayload.name = sanitize(updated.name);
                if (updated.slug) shopPayload.slug = sanitize(updated.slug).toLowerCase().replace(/\s+/g, '-');
                const { error: shopErr } = await supabase.from('shops').update(shopPayload).eq('id', shopId);
                if (shopErr) throw shopErr;
            }

            // 2. Update Settings Table
            const { data: current } = await supabase.from('settings').select('id').eq('shop_id', shopId).single();

            const payload: any = {};
            if (updated.name) payload.name = sanitize(updated.name);
            if (updated.logoUrl !== undefined) payload.logo_url = updated.logoUrl;
            if (updated.primaryColor) payload.primary_color = sanitize(updated.primaryColor);
            if (updated.secondaryColor) payload.secondary_color = sanitize(updated.secondaryColor);
            if (updated.titleColor) payload.title_color = sanitize(updated.titleColor);
            if (updated.textColor) payload.text_color = sanitize(updated.textColor);
            if (updated.backgroundColor) payload.background_color = sanitize(updated.backgroundColor);
            if (updated.cardBackgroundColor) payload.card_background_color = sanitize(updated.cardBackgroundColor);
            if (updated.buttonTextColor) payload.button_text_color = sanitize(updated.buttonTextColor);
            if (updated.priceColor) payload.price_color = sanitize(updated.priceColor);
            if (updated.accentColor) payload.accent_color = sanitize(updated.accentColor);
            if (updated.borderColor) payload.border_color = sanitize(updated.borderColor);
            if (updated.inputBackgroundColor) payload.input_background_color = sanitize(updated.inputBackgroundColor);
            if (updated.inputTextColor) payload.input_text_color = sanitize(updated.inputTextColor);

            if (updated.instagram !== undefined) payload.instagram = sanitize(updated.instagram);
            if (updated.facebook !== undefined) payload.facebook = sanitize(updated.facebook);
            if (updated.whatsapp !== undefined) payload.whatsapp = sanitize(updated.whatsapp);
            if (updated.description !== undefined) payload.description = sanitize(updated.description);
            if (updated.paymentMethods !== undefined) payload.payment_methods = updated.paymentMethods;
            if (updated.address !== undefined) payload.address = sanitize(updated.address);
            if (updated.phone !== undefined) payload.phone = sanitize(updated.phone);
            if (updated.businessHours !== undefined) payload.business_hours = updated.businessHours;

            // FIDELIDADE
            if (updated.loyaltyEnabled !== undefined) payload.loyalty_enabled = updated.loyaltyEnabled;
            if (updated.loyaltyMode !== undefined) payload.loyalty_mode = updated.loyaltyMode;
            if (updated.loyaltyCardGoal !== undefined) payload.loyalty_card_goal = updated.loyaltyCardGoal;
            if (updated.loyaltyPointsRatio !== undefined) payload.loyalty_points_ratio = updated.loyaltyPointsRatio;
            if (updated.loyaltyPointsGoal !== undefined) payload.loyalty_points_goal = updated.loyaltyPointsGoal;
            if (updated.loyaltyRewardValue !== undefined) payload.loyalty_reward_value = updated.loyaltyRewardValue;
            if (updated.loyaltyRewardType !== undefined) payload.loyalty_reward_type = updated.loyaltyRewardType;
            if (updated.loyaltyRewardValidityDays !== undefined) payload.loyalty_reward_validity_days = updated.loyaltyRewardValidityDays;

            if (Object.keys(payload).length > 0) {
                const { data, error } = await supabase.from('settings').update(payload).eq('shop_id', shopId).select();
                if (error) throw error;

                if (data && data.length > 0) {
                    const newSettings = mapSettings(data[0]);
                    setState(prev => ({
                        ...prev,
                        settings: newSettings,
                        shop: (updated.name || updated.slug) ? { ...prev.shop!, name: updated.name || prev.shop!.name, slug: updated.slug || prev.shop!.slug } : prev.shop,
                        myShops: (updated.name || updated.slug) ? prev.myShops.map(s => s.id === shopId ? { ...s, name: updated.name || s.name, slug: updated.slug || s.slug } : s) : prev.myShops
                    }));
                    return { success: true };
                }
            }

            // Se o payload for vazio ou não retornou dados, atualiza apenas os shops no state
            setState(prev => ({
                ...prev,
                shop: (updated.name || updated.slug) ? { ...prev.shop!, name: updated.name || prev.shop!.name, slug: updated.slug || prev.shop!.slug } : prev.shop,
                myShops: (updated.name || updated.slug) ? prev.myShops.map(s => s.id === shopId ? { ...s, name: updated.name || s.name, slug: updated.slug || s.slug } : s) : prev.myShops
            }));

            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };


    const requestClientLogin = async (phone: string, name?: string, birthDate?: string, justCheck?: boolean) => {
        try {
            const shopId = state.shop?.id;
            if (!shopId) throw new Error("Loja não identificada");

            const cleanPhone = sanitize(phone).replace(/\D/g, '');

            let { data: client } = await supabase.from('clients').select('*').eq('shop_id', shopId).eq('phone', cleanPhone).maybeSingle();

            if (!client) {
                if (justCheck) {
                    return { success: true, needsRegistration: true };
                }
                const { data: newClient, error: createError } = await supabase.from('clients').insert({
                    shop_id: shopId,
                    name: name || 'Cliente',
                    phone: cleanPhone,
                    birth_date: birthDate || null
                }).select().single();
                if (createError) throw createError;
                client = newClient;
            }

            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

            console.log("[Auth] Gerando token para cliente:", { clientId: client.id, token, expiresAt });

            const { error: tokenError } = await supabase.rpc('create_client_token', {
                p_client_id: client.id,
                p_token: token,
                p_expires_at: expiresAt.toISOString()
            });

            if (tokenError) {
                console.error("[Auth] Erro ao inserir token no Supabase via RPC:", tokenError);
                throw tokenError;
            }

            const loginUrl = `${window.location.origin}/acesso/${token}`;

            fetch('/api/notify/login-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: cleanPhone, url: loginUrl, shopId })
            }).catch(err => console.error("[Auth] Erro ao disparar WhatsApp de login:", err));

            return { success: true, url: loginUrl };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const validateClientToken = async (token: string) => {
        try {
            console.log("[Auth] Validando token via RPC:", token);
            const { data: tokenData, error: tokenError } = await supabase.rpc('validate_client_token', { p_token: token });

            if (tokenError || !tokenData) {
                console.error("[Auth] Erro na validação do token:", tokenError || "Token não encontrado ou expirado");
                throw new Error("Token inválido ou expirado");
            }

            console.log("[Auth] Token válido e deletado! Cliente identificado:", tokenData);
            const client = mapClient(tokenData);
            const shopSlug = tokenData.shops?.slug;

            const clientSession = { clientId: client.id, token: token };

            sessionStorage.setItem('currentClient', JSON.stringify(client));
            sessionStorage.setItem('clientSession', JSON.stringify(clientSession));

            setState(prev => ({
                ...prev,
                currentClient: client,
                clientSession: clientSession
            }));

            return { success: true, slug: shopSlug };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    const getWhatsAppQRCode = async () => {
        try {
            const shopId = ensureShopId();
            const response = await fetch('/api/whatsapp/qrcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopId })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            return { qrcode: data.qrcode, connected: data.connected };
        } catch (e: any) {
            return { error: e.message };
        }
    };

    const getWhatsAppStatus = async () => {
        try {
            const shopId = ensureShopId();
            const response = await fetch('/api/whatsapp/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopId })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            return { connected: Boolean(data.connected) };
        } catch (e: any) {
            return { connected: false, error: e.message };
        }
    };

    const disconnectWhatsApp = async () => {
        try {
            const shopId = ensureShopId();
            const response = await fetch('/api/whatsapp/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopId })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };


    const logoutClient = () => {
        sessionStorage.removeItem('currentClient');
        sessionStorage.removeItem('clientSession');
        setState(prev => ({ ...prev, currentClient: null, clientSession: null }));
    };

    const switchShop = async (shopId: string) => {
        setLoading(true);
        const selectedShop = state.myShops.find(s => s.id === shopId);
        if (selectedShop) {
            setState(prev => ({ ...prev, shop: selectedShop }));
            await fetchData(shopId);
        }
        setLoading(false);
    };

    const addAdditionalUnit = async (shopName: string, slug: string, phone: string): MutationResult => {
        try {
            if (!session?.user) throw new Error("Usuário não autenticado.");
            const shopData = await initNewShop(session.user.id, shopName, slug, phone);
            await fetchData(shopData.id);
            return { success: true, data: shopData };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    };

    // Tema desativado: Sistema fixo em modo claro

    return (
        <ShopContext.Provider value={{
            ...state,
            session,
            loading,
            userRole,
            login, signup, logout,
            loadShopBySlug,
            switchShop,
            addAdditionalUnit,
            deleteCurrentShop,
            resetPassword,
            addAppointment,
            createManualAppointment,
            updateAppointmentStatus,
            updateAppointmentPaymentMethod,
            updateAppointmentTotalValue,
            updateSettings,
            getWhatsAppQRCode,
            getWhatsAppStatus,
            disconnectWhatsApp,
            formatCurrencyBRL,
            fetchGlobalShops,
            refresh: () => fetchData(state.shop?.id)
        }}>
            {children}
        </ShopContext.Provider>
    );
};

export const useShop = () => {
    const context = useContext(ShopContext);
    if (!context) throw new Error("useShop must be used within a ShopProvider");
    return context;
};
