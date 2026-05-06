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
    type SettingsRow,
} from './mappers';

import {
    sanitize, formatCurrencyBRL, calculateTrialStatus,
    DEFAULT_SCHEDULE, PROFESSIONAL_COLORS, INITIAL_STATE,
} from './helpers';

// Compat export (alguns clients importam direto de `store.tsx`)
export { formatCurrencyBRL };

// Standard response type for mutations
type MutationResult<T = unknown> = Promise<{ success: boolean; data?: T; error?: string }>;

interface ShopContextType extends ShopState {
    session: Session | null;
    loading: boolean;
    userRole: 'owner' | 'barber' | null;

    // Auth Actions
    login: (email: string, password: string) => Promise<{ error: Error | null }>;
    signup: (email: string, password: string, shopName: string, slug: string, intent: 'create_shop' | 'join_team', fullName: string, phone: string) => Promise<{ error: Error | null }>;
    logout: () => void;
    resetPassword: (email: string) => Promise<{ success: boolean, error?: string }>;

    // Data Loading
    loadShopBySlug: (slug: string) => Promise<boolean>;
    switchShop: (shopId: string) => Promise<void>;
    addAdditionalUnit: (shopName: string, slug: string, phone: string) => MutationResult;
    deleteCurrentShop: () => MutationResult;
    refresh: () => void;

    // Actions - Now returning MutationResult
    // reloadClients moved to ClientContext
    // Appointment actions moved to AppointmentContext
    // Settings actions moved to SettingsContext

    formatCurrencyBRL: (value: number) => string;
    // reloadClients moved to ClientContext

    // [NOVO] SAAS ADMIN
    fetchGlobalShops: () => Promise<{ success: boolean; data?: Shop[]; error?: string }>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, setState] = useState<ShopState>(INITIAL_STATE);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<'owner' | 'barber' | null>(null);

    // Força modo claro em todas as inicializações
    useEffect(() => {
        setState(prev => ({ ...prev, theme: 'light' }));
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.setItem('theme', 'light');
    }, []);

    // reloadAppointments moved to AppointmentContext


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
        }
    };

    // --- Core Fetch Logic (Heavy - Use sparingly) ---
    const fetchData = async (targetShopId?: string) => {
        setLoading(true);

        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession?.user) {
                setUserRole(null);
                setLoading(false);
                return;
            }

            // 1. Buscar todas as lojas vinculadas ao usuário para o Seletor
            // Lojas que ele é dono
            const { data: ownedShops } = await supabase
                .from('shops')
                .select('*')
                .eq('owner_id', currentSession.user.id);

            // Lojas que ele é profissional
            const { data: proShopsRecords } = await supabase
                .from('professionals')
                .select('shop_id, shops(*)')
                .eq('email', currentSession.user.email);

            const proShops = proShopsRecords?.map(r => r.shops).filter(Boolean) || [];
            
            // Consolidar myShops (evitando duplicatas)
            const allShopsMap = new Map();
            ownedShops?.forEach(s => allShopsMap.set(s.id, mapShop(s)));
            proShops.forEach((s: any) => {
                if (!allShopsMap.has(s.id)) {
                    allShopsMap.set(s.id, mapShop(s));
                }
            });
            const myShopsList = Array.from(allShopsMap.values()) as Shop[];

            // 2. Determinar a loja atual
            let currentShopData: Shop | null = null;
            
            if (targetShopId) {
                currentShopData = myShopsList.find(s => s.id === targetShopId) || null;
                if (!currentShopData) {
                    const { data: directShop } = await supabase.from('shops').select('*').eq('id', targetShopId).single();
                    if (directShop) currentShopData = mapShop(directShop);
                }
            } else if (state.shop) {
                currentShopData = state.shop;
            } else if (myShopsList.length > 0) {
                // Tenta carregar a última loja usada do localStorage ou a primeira da lista
                const lastShopId = localStorage.getItem('last_shop_id');
                currentShopData = myShopsList.find(s => s.id === lastShopId) || myShopsList[0];
            }

            // 3. Determinar Role na loja atual
            if (currentShopData) {
                // Salva para a próxima vez
                localStorage.setItem('last_shop_id', currentShopData.id);

                if (currentShopData.ownerId === currentSession.user.id) {
                    setUserRole('owner');
                } else {
                    const isPro = proShopsRecords?.some(r => r.shop_id === currentShopData?.id);
                    if (isPro) {
                        setUserRole('barber');
                        // Vincular user_id se não estiver vinculado
                        const proRecord = proShopsRecords?.find(r => r.shop_id === currentShopData?.id);
                        if (proRecord && !proRecord.user_id) {
                             await supabase.from('professionals')
                                .update({ user_id: currentSession.user.id })
                                .eq('shop_id', currentShopData.id)
                                .eq('email', currentSession.user.email);
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
                shop: currentShopData,
                myShops: myShopsList,
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
            return { success: true, data: result.shops.map(mapShop) };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro ao carregar lojas';
            console.error("Error fetching global shops:", error);
            return { success: false, error: message };
        }
    };

    const loadShopBySlug = async (slug: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('shops').select('*').eq('slug', slug).maybeSingle();
            if (error) throw error;
            if (data) {
                const shop = mapShop(data);
                setState(prev => ({ ...prev, shop }));
                await fetchData(shop.id);
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error loading shop by slug:", error);
            return false;
        } finally {
            setLoading(false);
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
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Ocorreu um erro inesperado';
            return { success: false, error: message };
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

        return () => {
            supabase.removeChannel(shopChannel);
        }
    }, [state.shop?.id]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
            setSession(activeSession);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, activeSession) => {
            setSession(activeSession);

            if (event === 'SIGNED_IN' && activeSession?.user && !activeSession.user.user_metadata?.welcome_sent) {
                const shopId = localStorage.getItem('last_shop_id');
                if (shopId) {
                    const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                        ? 'http://localhost:3000'
                        : `https://${window.location.hostname}`;
                        
                    fetch(`${serverUrl}/api/auth/welcome`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: activeSession.user.email,
                            name: activeSession.user.user_metadata?.full_name || 'Dono',
                            shopId
                        })
                    }).catch(err => console.error('[WelcomeEmail] Failed to trigger:', err));
                }
            }
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
        } catch (e: unknown) {
            return { error: e as Error };
        }
    };

    const logout = () => {
        supabase.auth.signOut();
        setState(INITIAL_STATE);
        setSession(null);
        setUserRole(null);
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
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Ocorreu um erro inesperado';
            return { success: false, error: message };
        }
    };

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
