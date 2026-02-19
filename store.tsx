import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ShopState, Service, Professional, Coupon, Appointment, ShopSettings, WorkSchedule, Shop, BlockedSlot } from './types';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import DOMPurify from 'dompurify';

// Standard response type for mutations
type MutationResult = Promise<{ success: boolean; error?: string }>;

interface ShopContextType extends ShopState {
  session: Session | null;
  loading: boolean;
  userRole: 'owner' | 'barber' | null;
  
  // Auth Actions
  login: (email: string, password: string) => Promise<{ error: any }>;
  signup: (email: string, password: string, shopName: string, slug: string, intent: 'create_shop' | 'join_team') => Promise<{ error: any }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean, error?: string }>;

  // Data Loading
  loadShopBySlug: (slug: string) => Promise<boolean>; 
  refresh: () => void;

  // Actions - Now returning MutationResult
  addService: (service: Omit<Service, 'id' | 'shopId'>) => MutationResult;
  updateService: (id: string, service: Partial<Service>) => MutationResult;
  removeService: (id: string) => MutationResult;
  
  addProfessional: (professional: Omit<Professional, 'id' | 'shopId'>) => MutationResult;
  updateProfessional: (id: string, professional: Partial<Professional>) => MutationResult;
  removeProfessional: (id: string) => MutationResult;

  addCoupon: (coupon: Omit<Coupon, 'id' | 'usageCount' | 'shopId'>) => MutationResult;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => MutationResult;
  removeCoupon: (id: string) => MutationResult;
  
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>) => MutationResult;
  createManualAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>) => MutationResult;
  updateAppointmentStatus: (id: string, status: string) => MutationResult;
  
  addBlockedSlot: (block: Omit<BlockedSlot, 'id' | 'shopId'>) => MutationResult;
  removeBlockedSlot: (id: string) => MutationResult;

  updateSettings: (settings: Partial<ShopSettings>) => MutationResult;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

// Default Schedule helper
const DEFAULT_SCHEDULE: WorkSchedule = {
  monday: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
  tuesday: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
  wednesday: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
  thursday: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
  friday: { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
  saturday: { start: '09:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00', active: true },
  sunday: { start: '09:00', end: '13:00', lunchStart: '00:00', lunchEnd: '00:00', active: false },
};

const INITIAL_STATE: ShopState = {
  shop: null,
  settings: {
    shopId: "",
    name: "Carregando...",
    logoUrl: null,
    primaryColor: "#f97316",
    secondaryColor: "#1e293b",
  },
  services: [],
  professionals: [],
  coupons: [],
  appointments: [],
  blockedSlots: [],
  trialStatus: 'active',
  daysRemaining: 14
};

const sanitize = (text: string): string => {
  if (!text) return '';
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

export const ShopProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ShopState>(INITIAL_STATE);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'owner' | 'barber' | null>(null);

  // --- Mappers ---
  const mapShop = (data: any): Shop => ({
      id: data.id,
      ownerId: data.owner_id,
      name: data.name,
      slug: data.slug,
      trialStartedAt: data.trial_started_at,
      trialEndsAt: data.trial_ends_at,
      plan: data.plan,
      paymentConfirmedAt: data.payment_confirmed_at
  });

  const mapSettings = (data: any): ShopSettings => ({
      id: data.id,
      shopId: data.shop_id,
      name: data.name || "Minha Barbearia",
      logoUrl: data.logo_url,
      primaryColor: data.primary_color || "#f97316",
      secondaryColor: data.secondary_color || "#1e293b"
  });

  const mapService = (data: any): Service => ({
      id: data.id,
      shopId: data.shop_id,
      name: data.name,
      description: data.description,
      price: data.price,
      duration: data.duration,
      category: data.category || 'Geral'
  });

  const mapProfessional = (data: any): Professional => ({
      id: data.id,
      shopId: data.shop_id,
      name: data.name,
      role: data.role,
      photoUrl: data.photo_url,
      workSchedule: data.work_schedule || DEFAULT_SCHEDULE,
      email: data.email,
      userId: data.user_id,
      commissionPercentage: data.commission_percentage || 50 // Default 50%
  });

  const mapCoupon = (data: any): Coupon => ({
      id: data.id,
      shopId: data.shop_id,
      code: data.code,
      type: data.type,
      value: data.value,
      usageCount: data.usage_count,
      active: data.active
  });

  const mapAppointment = (data: any): Appointment => ({
      id: data.id,
      shopId: data.shop_id,
      clientName: data.client_name,
      clientPhone: data.client_phone,
      serviceIds: data.service_ids || [], 
      professionalId: data.professional_id,
      date: data.date,
      time: data.time,
      totalValue: data.total_value,
      couponCode: data.coupon_code,
      createdAt: data.created_at,
      status: data.status || 'scheduled'
  });

  const mapBlockedSlot = (data: any): BlockedSlot => ({
      id: data.id,
      shopId: data.shop_id,
      professionalId: data.professional_id,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      reason: data.reason
  });

  // --- Logic for Trial Calculation ---
  const calculateTrialStatus = (shop: Shop): { status: 'active' | 'expired' | 'paid', days: number } => {
      if (shop.plan === 'active') {
          return { status: 'paid', days: 0 };
      }
      
      if (shop.plan === 'suspended') {
          return { status: 'expired', days: 0 };
      }

      // Default: Trial
      if (!shop.trialEndsAt) return { status: 'active', days: 14 }; // Fallback

      const now = new Date();
      const end = new Date(shop.trialEndsAt);
      const diffTime = end.getTime() - now.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (days <= 0) {
          return { status: 'expired', days: 0 };
      }

      return { status: 'active', days };
  };

  // --- Core Fetch Logic ---
  const fetchData = async (targetShopId?: string) => {
    // Only set loading on initial fetch or full refresh, not background updates
    if (!state.shop) setLoading(true);
    
    try {
        let shopId = targetShopId;
        let currentShopData: Shop | null = state.shop;

        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        // Só tenta descobrir o shopId se ele NÃO foi passado
        if (!shopId) {
            const userId = currentSession?.user?.id;
            const userEmail = currentSession?.user?.email;

            // 1. Tenta encontrar a loja onde o usuário é DONO
            if (userId) {
                const { data: shopData } = await supabase.from('shops').select('*').eq('owner_id', userId).single();
                if (shopData) {
                    shopId = shopData.id;
                    currentShopData = mapShop(shopData);
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
        const [settingsRes, servicesRes, prosRes, couponsRes, blocksRes] = await Promise.all([
            supabase.from('settings').select('*').eq('shop_id', shopId).single(),
            supabase.from('services').select('*').eq('shop_id', shopId),
            supabase.from('professionals').select('*').eq('shop_id', shopId),
            supabase.from('coupons').select('*').eq('shop_id', shopId),
            supabase.from('blocked_slots').select('*').eq('shop_id', shopId)
        ]);

        // OTIMIZAÇÃO: Carregar apenas agendamentos recentes e futuros
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 30); // 30 dias atrás
        const dateLimitStr = pastDate.toISOString().split('T')[0];

        let appointmentsData: Appointment[] = [];
        
        const { data: appts } = await supabase
            .from('appointments')
            .select('*')
            .eq('shop_id', shopId)
            .gte('date', dateLimitStr) // Apenas >= 30 dias atrás
            .order('date', { ascending: false }) // Ordem decrescente de data
            .order('time', { ascending: false });

        if (appts) appointmentsData = appts.map(mapAppointment);

        const mappedProfessionals = (prosRes.data || []).map(mapProfessional);

        // --- LÓGICA DE ROLES ---
        if (currentSession?.user) {
            const effectiveShopData = currentShopData || state.shop;
            
            if (effectiveShopData?.ownerId === currentSession.user.id) {
                setUserRole('owner');
            } else {
                const isBarber = mappedProfessionals.find(p => p.email === currentSession.user.email);
                if (isBarber) {
                    setUserRole('barber');
                    // Ensure User ID is linked if it wasn't already (Self-healing)
                    if (!isBarber.userId) {
                        await supabase.from('professionals').update({ user_id: currentSession.user.id }).eq('id', isBarber.id);
                        isBarber.userId = currentSession.user.id;
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
            services: (servicesRes.data || []).map(mapService),
            professionals: mappedProfessionals,
            coupons: (couponsRes.data || []).map(mapCoupon),
            appointments: appointmentsData,
            blockedSlots: (blocksRes.data || []).map(mapBlockedSlot),
            trialStatus: trialInfo.status,
            daysRemaining: trialInfo.days
        }));

    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setLoading(false);
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
                const updatedShop = payload.new;
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
                // Re-fetch data on any appointment change
                fetchData(state.shop?.id);
            }
        )
        .subscribe();

      return () => {
          supabase.removeChannel(shopChannel);
          supabase.removeChannel(appointmentsChannel);
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

  const signup = async (email: string, password: string, shopName: string, slug: string, intent: 'create_shop' | 'join_team') => {
      const cleanShopName = sanitize(shopName);
      const cleanSlug = sanitize(slug).toLowerCase().replace(/[^\w-]/g, '');

      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
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

      // [UPDATE] Create Shop with Trial Fields
      const { data: shopData, error: shopError } = await supabase.from('shops').insert({
          owner_id: authData.user.id,
          name: cleanShopName,
          slug: cleanSlug,
          plan: 'trial',
          trial_started_at: new Date().toISOString(),
          // 14 days from now
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }).select().single();

      if (shopError || !shopData) return { error: shopError };

      await supabase.from('settings').insert({
          shop_id: shopData.id,
          name: cleanShopName,
          primary_color: '#f97316',
          secondary_color: '#1e293b'
      });

      // Default services
      const defaultServices = [
        { name: 'Corte Masculino', price: 30, duration: 30, category: 'Cortes' },
        { name: 'Barba', price: 20, duration: 20, category: 'Barba' },
        { name: 'Corte + Barba', price: 45, duration: 50, category: 'Combos' }
      ];
      const servicesToInsert = defaultServices.map(s => ({
          shop_id: shopData.id,
          name: s.name,
          description: s.name,
          price: s.price,
          duration: s.duration,
          category: s.category
      }));
      await supabase.from('services').insert(servicesToInsert);

      setSession(authData.session);
      return { error: null };
  };

  const logout = async () => {
      await supabase.auth.signOut();
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
      setLoading(false);
      return false;
  };

  const ensureShopId = () => {
      if (!state.shop?.id) {
          throw new Error("Loja não identificada. Recarregue a página.");
      }
      return state.shop.id;
  };

  // --- ACTIONS WITH OPTIMIZED FETCH ---

  const addService = async (service: Omit<Service, 'id' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('services').insert({ 
          ...service, 
          name: sanitize(service.name),
          description: sanitize(service.description),
          category: sanitize(service.category),
          shop_id: shopId 
        });
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const updateService = async (id: string, updated: Partial<Service>): MutationResult => {
    try {
        const shopId = ensureShopId(); // Capture ID
        const payload: any = {};
        if (updated.name) payload.name = sanitize(updated.name);
        if (updated.description) payload.description = sanitize(updated.description);
        if (updated.price !== undefined) payload.price = updated.price;
        if (updated.duration !== undefined) payload.duration = updated.duration;
        if (updated.category) payload.category = sanitize(updated.category);

        const { error } = await supabase.from('services').update(payload).eq('id', id);
        if (error) throw error;
        await fetchData(shopId); // Pass explicit ID
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const removeService = async (id: string): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addProfessional = async (pro: Omit<Professional, 'id' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('professionals').insert({
            shop_id: shopId,
            name: sanitize(pro.name),
            role: sanitize(pro.role),
            photo_url: pro.photoUrl,
            work_schedule: pro.workSchedule || DEFAULT_SCHEDULE,
            email: pro.email ? sanitize(pro.email) : null,
            commission_percentage: pro.commissionPercentage ?? 50
        });
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const updateProfessional = async (id: string, updated: Partial<Professional>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const payload: any = {};
        if (updated.name) payload.name = sanitize(updated.name);
        if (updated.role) payload.role = sanitize(updated.role);
        if (updated.photoUrl) payload.photo_url = updated.photoUrl;
        if (updated.workSchedule) payload.work_schedule = updated.workSchedule;
        if (updated.email !== undefined) payload.email = updated.email ? sanitize(updated.email) : null;
        if (updated.commissionPercentage !== undefined) payload.commission_percentage = updated.commissionPercentage;

        const { error } = await supabase.from('professionals').update(payload).eq('id', id);
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const removeProfessional = async (id: string): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('professionals').delete().eq('id', id);
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addCoupon = async (coupon: Omit<Coupon, 'id' | 'usageCount' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('coupons').insert({
            shop_id: shopId,
            code: sanitize(coupon.code).toUpperCase(),
            type: coupon.type,
            value: coupon.value,
            usage_count: 0,
            active: coupon.active
        });
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const updateCoupon = async (id: string, updated: Partial<Coupon>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const payload: any = {};
        if (updated.code) payload.code = sanitize(updated.code).toUpperCase();
        if (updated.type) payload.type = updated.type;
        if (updated.value) payload.value = updated.value;
        if (updated.active !== undefined) payload.active = updated.active;

        const { error } = await supabase.from('coupons').update(payload).eq('id', id);
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const removeCoupon = async (id: string): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('coupons').delete().eq('id', id);
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addAppointment = async (apt: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const cleanClientName = sanitize(apt.clientName);
        const cleanClientPhone = sanitize(apt.clientPhone);

        const { error } = await supabase.rpc('book_appointment', {
            p_shop_id: shopId,
            p_client_name: cleanClientName,
            p_client_phone: cleanClientPhone,
            p_service_ids: apt.serviceIds,
            p_professional_id: apt.professionalId,
            p_date: apt.date,
            p_time: apt.time,
            p_total_value: apt.totalValue,
            p_coupon_code: apt.couponCode ? sanitize(apt.couponCode) : null
        });

        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const createManualAppointment = async (apt: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>): MutationResult => {
      try {
          const shopId = ensureShopId();
          const cleanClientName = sanitize(apt.clientName);
          const cleanClientPhone = sanitize(apt.clientPhone);

          const { error } = await supabase.from('appointments').insert({
              shop_id: shopId,
              client_name: cleanClientName,
              client_phone: cleanClientPhone,
              service_ids: apt.serviceIds,
              professional_id: apt.professionalId,
              date: apt.date,
              time: apt.time,
              total_value: apt.totalValue,
              coupon_code: null,
              status: apt.status || 'confirmed'
          });

          if (error) throw error;
          await fetchData(shopId);
          return { success: true };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  };

  const updateAppointmentStatus = async (id: string, status: string): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addBlockedSlot = async (block: Omit<BlockedSlot, 'id' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('blocked_slots').insert({
            shop_id: shopId,
            professional_id: block.professionalId,
            date: block.date,
            start_time: block.startTime,
            end_time: block.endTime,
            reason: sanitize(block.reason || '')
        });
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const removeBlockedSlot = async (id: string): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('blocked_slots').delete().eq('id', id);
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const updateSettings = async (updated: Partial<ShopSettings>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { data } = await supabase.from('settings').select('id').eq('shop_id', shopId).single();
        
        const payload: any = {};
        if (updated.name) payload.name = sanitize(updated.name);
        if (updated.logoUrl) payload.logo_url = updated.logoUrl;
        if (updated.primaryColor) payload.primary_color = sanitize(updated.primaryColor);
        if (updated.secondaryColor) payload.secondary_color = sanitize(updated.secondaryColor);

        let error;
        if (data && data.id) {
            ({ error } = await supabase.from('settings').update(payload).eq('id', data.id));
        } else {
            ({ error } = await supabase.from('settings').insert({ ...payload, shop_id: shopId }));
        }
        
        if (error) throw error;
        await fetchData(shopId);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
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
      resetPassword,
      addService, updateService, removeService,
      addProfessional, updateProfessional, removeProfessional,
      addCoupon, updateCoupon, removeCoupon,
      addAppointment,
      createManualAppointment,
      updateAppointmentStatus,
      addBlockedSlot, removeBlockedSlot,
      updateSettings,
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