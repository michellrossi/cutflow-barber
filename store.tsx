import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ShopState, Service, Professional, Coupon, Appointment, ShopSettings, WorkSchedule, Shop, BlockedSlot, Client, MessageTemplate, SubscriptionPlan, ClientSubscription, MessageCategory, AutomationTrigger, Product, AppointmentProduct, Goal } from './types';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import DOMPurify from 'dompurify';

// Standard response type for mutations
type MutationResult<T = any> = Promise<{ success: boolean; data?: T; error?: string }>;

interface ShopContextType extends ShopState {
  session: Session | null;
  loading: boolean;
  userRole: 'owner' | 'barber' | null;
  
  // Auth Actions
  login: (email: string, password: string) => Promise<{ error: any }>;
  signup: (email: string, password: string, shopName: string, slug: string, intent: 'create_shop' | 'join_team', fullName: string, phone: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean, error?: string }>;

  // Data Loading
  loadShopBySlug: (slug: string) => Promise<boolean>; 
  switchShop: (shopId: string) => Promise<void>;
  addAdditionalUnit: (shopName: string, slug: string, phone: string) => MutationResult;
  deleteCurrentShop: () => MutationResult;
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
  updateAppointmentPaymentMethod: (id: string, paymentMethod: string, usedSubscriptionId?: string) => MutationResult;
  
  addBlockedSlot: (block: Omit<BlockedSlot, 'id' | 'shopId'>) => MutationResult;
  removeBlockedSlot: (id: string) => MutationResult;

  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'shopId'>) => MutationResult;
  updateClient: (id: string, client: Partial<Client>) => MutationResult;
  removeClient: (id: string) => MutationResult;

  addMessageTemplate: (template: Omit<MessageTemplate, 'id' | 'shopId'>) => MutationResult;
  updateMessageTemplate: (id: string, template: Partial<MessageTemplate>) => MutationResult;
  removeMessageTemplate: (id: string) => MutationResult;

  addAutomationTrigger: (trigger: Omit<AutomationTrigger, 'id' | 'shopId'>) => MutationResult;
  updateAutomationTrigger: (id: string, trigger: Partial<AutomationTrigger>) => MutationResult;
  removeAutomationTrigger: (id: string) => MutationResult;

  addMessageCategory: (name: string) => MutationResult;
  removeMessageCategory: (id: string) => MutationResult;

  // Subscription Actions
  addSubscriptionPlan: (plan: Omit<SubscriptionPlan, 'id' | 'shopId'>) => MutationResult;
  updateSubscriptionPlan: (id: string, plan: Partial<SubscriptionPlan>) => MutationResult;
  removeSubscriptionPlan: (id: string) => MutationResult;
  
  addClientSubscription: (sub: Omit<ClientSubscription, 'id' | 'shopId'>) => MutationResult;
  updateClientSubscription: (id: string, sub: Partial<ClientSubscription>) => MutationResult;
  removeClientSubscription: (id: string) => MutationResult;

  updateSettings: (settings: Partial<ShopSettings>) => MutationResult;
  
  // Product Actions
  addProduct: (product: Omit<Product, 'id' | 'shopId' | 'createdAt'>) => MutationResult;
  updateProduct: (id: string, product: Partial<Product>) => MutationResult;
  removeProduct: (id: string) => MutationResult;
  restockProduct: (productId: string, addedQuantity: number, newUnitCost: number) => MutationResult;
  addAppointmentProducts: (appointmentId: string, products: { productId: string, quantity: number, unitPrice: number }[]) => MutationResult;
  
  // Goal Actions
  upsertGoal: (goal: Partial<Goal> & { name: string; category: string; targetValue: number; period: string; startDate: string; endDate: string }) => MutationResult;
  removeGoal: (id: string) => MutationResult;
  calculateGoalProgress: (goal: Goal) => { percentage: number; remaining: number; status: 'critical' | 'warning' | 'good' };
  
  // Cash Control Actions
  openCashSession: (openingBalance: number) => MutationResult;
  closeCashSession: (closingBalance: number) => MutationResult;
  addCashMovement: (entry: Omit<CashFlowEntry, 'id' | 'shopId' | 'sessionId' | 'createdAt'>) => MutationResult;

  // WhatsApp Actions
  getWhatsAppQRCode: () => Promise<{ qrcode?: string; error?: string }>;
  getWhatsAppStatus: () => Promise<{ connected: boolean; error?: string }>;
  disconnectWhatsApp: () => Promise<{ success: boolean; error?: string }>;

  // Client Auth
  requestClientLogin: (phone: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  validateClientToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  logoutClient: () => void;

  // New Report Method
  fetchFinancialReport: (startDate: string, endDate: string) => Promise<Appointment[]>;
  toggleTheme: () => void;
  formatCurrencyBRL: (value: number) => string;
  reloadClients: (shopId: string) => Promise<void>;
  
  // [NOVO] SAAS ADMIN
  fetchGlobalShops: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
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
    titleColor: "#ffffff",
    textColor: "#94a3b8",
    backgroundColor: "#0f172a",
    cardBackgroundColor: "#1e293b",
    buttonTextColor: "#ffffff",
    priceColor: "#f97316",
    accentColor: "#f97316",
    borderColor: "#334155",
    inputBackgroundColor: "#0f172a",
    inputTextColor: "#ffffff",
    description: "",
    facebook: "",
    whatsapp: "",
    paymentMethods: ['credit', 'debit', 'cash', 'pix']
  },
  services: [],
  professionals: [],
  coupons: [],
  appointments: [],
  clients: [],
  messageTemplates: [],
  messageCategories: [],
  subscriptionPlans: [],
  clientSubscriptions: [],
  blockedSlots: [],
  currentClient: null,
  clientSession: null,
  trialStatus: 'active',
  daysRemaining: 14,
  theme: 'light',
  automationTriggers: [],
  products: [],
  goals: [],
  myShops: [],
  cashSessions: [],
  cashFlowEntries: [],
  botPausedCount: 0
};

const sanitize = (text: string): string => {
  if (!text) return '';
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

export const formatCurrencyBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value || 0).replace(/\s/g, '');
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
      planTier: data.plan_tier || 'essencial',
      paymentConfirmedAt: data.payment_confirmed_at,
      whatsappInstance: data.whatsapp_instance,
      whatsappConnected: data.whatsapp_connected
  });

  const mapSettings = (data: any): ShopSettings => ({
      id: data.id,
      shopId: data.shop_id,
      name: data.name || "Minha Barbearia",
      logoUrl: data.logo_url,
      primaryColor: data.primary_color || "#f97316",
      secondaryColor: data.secondary_color || "#1e293b",
      titleColor: data.title_color || "#ffffff",
      textColor: data.text_color || "#94a3b8",
      backgroundColor: data.background_color || "#0f172a",
      cardBackgroundColor: data.card_background_color || "#1e293b",
      buttonTextColor: data.button_text_color || "#ffffff",
      priceColor: data.price_color || "#f97316",
      accentColor: data.accent_color || "#f97316",
      borderColor: data.border_color || "#334155",
      inputBackgroundColor: data.input_background_color || "#0f172a",
      inputTextColor: data.input_text_color || "#ffffff",
      loyaltyEnabled: data.loyalty_enabled ?? true,
      loyaltyMode: data.loyalty_mode || 'card',
      loyaltyCardGoal: data.loyalty_card_goal || 10,
      loyaltyPointsRatio: data.loyalty_points_ratio || 1,
      loyaltyPointsGoal: data.loyalty_points_goal || 1000,
      loyaltyRewardValue: data.loyalty_reward_value || 10,
      loyaltyRewardType: data.loyalty_reward_type || 'percentage',
      loyaltyRewardValidityDays: data.loyalty_reward_validity_days || 90,
      instagram: data.instagram || '',
      facebook: data.facebook || '',
      whatsapp: data.whatsapp || '',
      description: data.description || '',
      paymentMethods: data.payment_methods || ['credit', 'debit', 'cash', 'pix'],
      address: data.address || '',
      phone: data.phone || '',
      businessHours: data.business_hours || null,
      automationTriggers: data.automation_triggers || [],
  });

  const mapAutomationTrigger = (data: any): AutomationTrigger => ({
      id: data.id,
      shopId: data.shop_id,
      name: data.name,
      value: data.value,
      unit: data.unit,
      period: data.period,
      active: data.active
  });

  const mapClient = (c: any): Client => ({
      id: c.id,
      shopId: c.shop_id,
      name: c.name,
      lastName: c.last_name,
      phone: c.phone,
      email: c.email,
      avatarUrl: c.avatar_url,
      notes: c.notes,
      birthDate: c.birth_date,
      cpf: c.cpf,
      gender: c.gender,
      cep: c.cep,
      street: c.street,
      number: c.number,
      complement: c.complement,
      neighborhood: c.neighborhood,
      city: c.city,
      state: c.state,
      totalSpent: c.total_spent || 0,
      loyaltyPoints: c.loyalty_points || 0,
      loyaltyCardCount: c.loyalty_card_count || 0,
      createdAt: c.created_at
  });

  const mapService = (data: any): Service => ({
      id: data.id,
      shopId: data.shop_id,
      name: data.name,
      description: data.description,
      price: data.price,
      duration: data.duration,
      category: data.category || 'Geral',
      imageUrl: data.image_url
  });

  const PROFESSIONAL_COLORS = [
    '#f97316', // orange-500
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#f59e0b', // amber-500
  ];

  const mapProfessional = (data: any, index: number): Professional => ({
      id: data.id,
      shopId: data.shop_id,
      name: data.name,
      role: data.role,
      photoUrl: data.photo_url,
      workSchedule: data.work_schedule || DEFAULT_SCHEDULE,
      email: data.email,
      phone: data.phone,
      userId: data.user_id,
      commissionPercentage: data.commission_percentage || 50, // Default 50%
      color: data.color || PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]
  });

  const mapCoupon = (data: any): Coupon => ({
      id: data.id,
      shopId: data.shop_id,
      code: data.code,
      type: data.type,
      value: data.value,
      usageCount: data.usage_count,
      active: data.active,
      maxUses: data.max_uses,
      expiresAt: data.expires_at
  });

  const mapAppointment = (data: any): Appointment => ({
      id: data.id,
      shopId: data.shop_id,
      clientId: data.client_id,
      clientName: data.client_name,
      clientPhone: data.client_phone,
      serviceIds: data.service_ids || [], 
      professionalId: data.professional_id,
      date: data.date,
      time: data.time,
      totalValue: data.total_value,
      couponCode: data.coupon_code,
      usedSubscriptionId: data.used_subscription_id,
      createdAt: data.created_at,
      status: data.status || 'scheduled',
      paymentMethod: data.payment_method
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

  const mapMessageTemplate = (data: any): MessageTemplate => ({
      id: data.id,
      shopId: data.shop_id,
      title: data.title,
      content: data.content,
      triggerId: data.trigger_id || data.trigger, // Fallback for old data
      active: data.active,
      target: data.target || 'client',
      category: data.category
  });

  const mapMessageCategory = (data: any): MessageCategory => ({
      id: data.id,
      shopId: data.shop_id,
      name: data.name
  });

  const mapSubscriptionPlan = (data: any): SubscriptionPlan => ({
      id: data.id,
      shopId: data.shop_id,
      name: data.name,
      description: data.description,
      price: data.price,
      servicesPerMonth: data.services_per_month,
      active: data.active,
      createdAt: data.created_at
  });

  const mapClientSubscription = (data: any): ClientSubscription => ({
      id: data.id,
      shop_id: data.shop_id,
      clientId: data.client_id,
      planId: data.plan_id,
      status: data.status,
      startDate: data.start_date,
      nextBillingDate: data.next_billing_date,
      servicesUsedThisMonth: data.services_used_this_month || 0,
      createdAt: data.created_at
  });

  const mapProduct = (data: any): Product => ({
      id: data.id,
      shopId: data.shop_id,
      name: data.name,
      category: data.category,
      costPrice: Number(data.cost_price || 0),
      salePrice: Number(data.sale_price || 0),
      currentStock: Number(data.current_stock || 0),
      minStock: Number(data.min_stock || 0),
      createdAt: data.created_at
  });

  const mapGoal = (data: any): Goal => ({
      id: data.id,
      shopId: data.shop_id,
      professionalId: data.professional_id,
      name: data.name,
      category: data.category,
      targetValue: Number(data.target_value || 0),
      currentValue: Number(data.current_value || 0),
      period: data.period,
      startDate: data.start_date,
      endDate: data.end_date,
      createdAt: data.created_at
  });

  const mapCashSession = (data: any): CashSession => ({
      id: data.id,
      shopId: data.shop_id,
      status: data.status,
      openingBalance: data.opening_balance,
      closingBalance: data.closing_balance,
      openedAt: data.opened_at,
      closedAt: data.closed_at,
      openedBy: data.opened_by
  });

  const mapCashFlowEntry = (data: any): CashFlowEntry => ({
      id: data.id,
      shopId: data.shop_id,
      sessionId: data.session_id,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
      createdAt: data.created_at
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
    if (!state.shop) setLoading(true);
    
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
        const [settingsRes, servicesRes, prosRes, couponsRes, blocksRes, templatesRes, categoriesRes, plansRes, subsRes, triggersRes, productsRes, goalsRes, cashSessionsRes, sessionsRes] = await Promise.all([
            supabase.from('settings').select('*').eq('shop_id', shopId).single(),
            supabase.from('services').select('*').eq('shop_id', shopId),
            supabase.from('professionals').select('*').eq('shop_id', shopId),
            supabase.from('coupons').select('*').eq('shop_id', shopId),
            supabase.from('blocked_slots').select('*').eq('shop_id', shopId),
            supabase.from('message_templates').select('*').eq('shop_id', shopId),
            supabase.from('message_categories').select('*').eq('shop_id', shopId),
            supabase.from('subscription_plans').select('*').eq('shop_id', shopId),
            supabase.from('client_subscriptions').select('*').eq('shop_id', shopId),
            supabase.from('automation_triggers').select('*').eq('shop_id', shopId),
            supabase.from('products').select('*').eq('shop_id', shopId),
            supabase.from('goals').select('*').eq('shop_id', shopId),
            supabase.from('cash_sessions').select('*').eq('shop_id', shopId).eq('status', 'open').order('opened_at', { ascending: false }).limit(1),
            supabase.from('whatsapp_chat_sessions').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('bot_paused', true)
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

        const mappedProfessionals = (prosRes.data || []).map((p: any, i: number) => mapProfessional(p, i));
        // Clientes: array vazio no boot — carregados lazy na aba Clientes
        const mappedClients: ReturnType<typeof mapClient>[] = [];
        const mappedPlans = (plansRes.data || []).map(mapSubscriptionPlan);
        const mappedSubs = (subsRes.data || []).map(mapClientSubscription);
        const mappedCategories = (categoriesRes.data || []).map(mapMessageCategory);
        
        let mappedTriggers = (triggersRes.data || []).map(mapAutomationTrigger);
        let mappedCashSessions = (cashSessionsRes.data || []).map(mapCashSession);
        let mappedCashFlowEntries: CashFlowEntry[] = [];

        if (mappedCashSessions.length > 0) {
            const { data: movements } = await supabase.from('cash_flow_entries').select('*').eq('session_id', mappedCashSessions[0].id).order('created_at', { ascending: false });
            if (movements) mappedCashFlowEntries = movements.map(mapCashFlowEntry);
        }

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
            clients: mappedClients,
            subscriptionPlans: mappedPlans,
            clientSubscriptions: mappedSubs,
            messageTemplates: (templatesRes.data || []).map(mapMessageTemplate),
            messageCategories: mappedCategories,
            blockedSlots: (blocksRes.data || []).map(mapBlockedSlot),
            automationTriggers: mappedTriggers,
            products: (productsRes.data || []).map(mapProduct),
            goals: (goalsRes.data || []).map(mapGoal),
            cashSessions: mappedCashSessions,
            cashFlowEntries: mappedCashFlowEntries,
            trialStatus: trialInfo.status,
            daysRemaining: trialInfo.days,
            botPausedCount: sessionsRes.count || 0
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
            
        const res = await fetch(`${serverUrl}/api/saas/shops`);
        const result = await res.json();
        
        if (!res.ok) throw new Error(result.error);
        return { success: true, data: result.shops };
    } catch (error: any) {
        console.error("Error fetching global shops:", error);
        return { success: false, error: error.message };
    }
  };

  const deleteCurrentShop = async (): Promise<MutationResult> => {
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
                reloadAppointments(state.shop!.id);
            }
        )
        .subscribe();

      // 3. Listen for Goal Changes
      const goalsChannel = supabase.channel('goals_sync')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'goals',
                filter: `shop_id=eq.${state.shop.id}`
            },
            (payload) => {
                // Ignora eventos sem 'new' (ex: DELETE)
                if (!payload.new || !payload.new.id) {
                    if (payload.eventType === 'DELETE') {
                        setState(prev => ({
                            ...prev,
                            goals: prev.goals.filter(g => g.id !== payload.old?.id)
                        }));
                    }
                    return;
                }
                const updatedGoal = mapGoal(payload.new);
                setState(prev => {
                    // INSERT ou UPDATE: upsert para evitar duplicação
                    // (upsertGoal() já adiciona ao state antes do Realtime chegar)
                    const alreadyExists = prev.goals.some(g => g.id === updatedGoal.id);
                    if (alreadyExists) {
                        // Sempre atualiza com o dado mais recente (ex: current_value do trigger)
                        return { ...prev, goals: prev.goals.map(g => g.id === updatedGoal.id ? updatedGoal : g) };
                    }
                    // Só adiciona se não existe (ex: inserção feita por outro dispositivo)
                    if (payload.eventType === 'INSERT') {
                        return { ...prev, goals: [...prev.goals, updatedGoal] };
                    }
                    return prev;
                });
            }
        )
        .subscribe();

      // 4. Listen for Product/Inventory Changes
      const productsChannel = supabase.channel('products_sync')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'products',
                filter: `shop_id=eq.${state.shop.id}`
            },
            (payload) => {
                const updatedProduct = mapProduct(payload.new);
                setState(prev => {
                    if (payload.eventType === 'INSERT') {
                        const exists = prev.products.some(p => p.id === updatedProduct.id);
                        if (exists) return prev;
                        return { ...prev, products: [...prev.products, updatedProduct] };
                    }
                    if (payload.eventType === 'UPDATE') {
                        return { ...prev, products: prev.products.map(p => p.id === updatedProduct.id ? updatedProduct : p) };
                    }
                    if (payload.eventType === 'DELETE') {
                        return { ...prev, products: prev.products.filter(p => p.id !== payload.old.id) };
                    }
                    return prev;
                });
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
          supabase.removeChannel(goalsChannel);
          supabase.removeChannel(productsChannel);
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
      setLoading(false);
      return false;
  };

  const ensureShopId = () => {
      if (!state.shop?.id) {
          throw new Error("Loja não identificada. Recarregue a página.");
      }
      return state.shop.id;
  };

  // --- OPTIMIZED ACTIONS (LOCAL STATE UPDATES) ---

  const addService = async (service: Omit<Service, 'id' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { data, error } = await supabase.from('services').insert({ 
          shop_id: shopId,
          name: sanitize(service.name),
          description: sanitize(service.description),
          price: service.price,
          duration: service.duration,
          category: sanitize(service.category),
          image_url: service.imageUrl
        }).select().single();
        
        if (error) throw error;
        
        // Optimistic Update
        const newService = mapService(data);
        setState(prev => ({ ...prev, services: [...prev.services, newService] }));
        
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const updateService = async (id: string, updated: Partial<Service>): MutationResult => {
    try {
        const shopId = ensureShopId(); // Just for validation
        const payload: any = {};
        if (updated.name) payload.name = sanitize(updated.name);
        if (updated.description) payload.description = sanitize(updated.description);
        if (updated.price !== undefined) payload.price = updated.price;
        if (updated.duration !== undefined) payload.duration = updated.duration;
        if (updated.category) payload.category = sanitize(updated.category);
        if (updated.imageUrl !== undefined) payload.image_url = updated.imageUrl;

        const { data, error } = await supabase.from('services').update(payload).eq('id', id).select().single();
        if (error) throw error;
        
        // Optimistic Update
        const updatedService = mapService(data);
        setState(prev => ({
            ...prev,
            services: prev.services.map(s => s.id === id ? updatedService : s)
        }));

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
        
        // Optimistic Update
        setState(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
        
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addProfessional = async (pro: Omit<Professional, 'id' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { data, error } = await supabase.from('professionals').insert({
            shop_id: shopId,
            name: sanitize(pro.name),
            role: sanitize(pro.role),
            photo_url: pro.photoUrl,
            work_schedule: pro.workSchedule || DEFAULT_SCHEDULE,
            email: pro.email ? sanitize(pro.email) : null,
            phone: pro.phone ? sanitize(pro.phone) : null,
            commission_percentage: pro.commissionPercentage ?? 50,
            color: pro.color || PROFESSIONAL_COLORS[state.professionals.length % PROFESSIONAL_COLORS.length]
        }).select().single();
        
        if (error) throw error;

        // Optimistic Update
        const newPro = mapProfessional(data, state.professionals.length);
        setState(prev => ({ ...prev, professionals: [...prev.professionals, newPro] }));

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
        if (updated.phone !== undefined) payload.phone = updated.phone ? sanitize(updated.phone) : null;
        if (updated.commissionPercentage !== undefined) payload.commission_percentage = updated.commissionPercentage;
        if (updated.color) payload.color = sanitize(updated.color);

        const { data, error } = await supabase.from('professionals').update(payload).eq('id', id).select().single();
        if (error) throw error;

        // Optimistic Update
        const currentIndex = state.professionals.findIndex(p => p.id === id);
        const updatedPro = mapProfessional(data, currentIndex !== -1 ? currentIndex : 0);
        setState(prev => ({
            ...prev,
            professionals: prev.professionals.map(p => p.id === id ? updatedPro : p)
        }));

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

        // Optimistic Update
        setState(prev => ({ ...prev, professionals: prev.professionals.filter(p => p.id !== id) }));

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addCoupon = async (coupon: Omit<Coupon, 'id' | 'usageCount' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { data, error } = await supabase.from('coupons').insert({
            shop_id: shopId,
            code: sanitize(coupon.code).toUpperCase(),
            type: coupon.type,
            value: coupon.value,
            usage_count: 0,
            active: coupon.active,
            max_uses: coupon.maxUses,
            expires_at: coupon.expiresAt
        }).select().single();
        
        if (error) throw error;

        // Optimistic Update
        const newCoupon = mapCoupon(data);
        setState(prev => ({ ...prev, coupons: [...prev.coupons, newCoupon] }));

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
        if (updated.maxUses !== undefined) payload.max_uses = updated.maxUses;
        if (updated.expiresAt !== undefined) payload.expires_at = updated.expiresAt;

        const { data, error } = await supabase.from('coupons').update(payload).eq('id', id).select().single();
        if (error) throw error;

        // Optimistic Update
        const updatedCoupon = mapCoupon(data);
        setState(prev => ({
            ...prev,
            coupons: prev.coupons.map(c => c.id === id ? updatedCoupon : c)
        }));

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

        // Optimistic Update
        setState(prev => ({ ...prev, coupons: prev.coupons.filter(c => c.id !== id) }));

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

        console.log('addAppointment: Iniciando reserva...', { professionalId: apt.professionalId, date: apt.date, time: apt.time });

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

          const { data, error } = await supabase.from('appointments').insert({
              shop_id: shopId,
              client_name: cleanClientName,
              client_phone: cleanClientPhone,
              service_ids: apt.serviceIds,
              professional_id: apt.professionalId,
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
                const sub = state.clientSubscriptions.find(s => s.id === appointment.usedSubscriptionId);
                if (sub) {
                    await updateClientSubscription(sub.id, { 
                        servicesUsedThisMonth: (sub.servicesUsedThisMonth || 0) + 1 
                    });
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
      
      if (!rewardTriggered) {
          // Só atualiza contadores se a recompensa NÃO foi atingida
          // (quando atingida, o endpoint do servidor zera via RPC atômica)
          updatePayload.loyalty_points = updatedPoints;
          updatePayload.loyalty_card_count = updatedCardCount;
      }

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

  const addClient = async (client: Omit<Client, 'id' | 'createdAt' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { data, error } = await supabase.from('clients').insert({
            shop_id: shopId,
            name: sanitize(client.name),
            last_name: client.lastName ? sanitize(client.lastName) : null,
            phone: sanitize(client.phone),
            email: client.email ? sanitize(client.email) : null,
            avatar_url: client.avatarUrl,
            notes: client.notes ? sanitize(client.notes) : null,
            birth_date: client.birthDate,
            cpf: client.cpf ? sanitize(client.cpf) : null,
            gender: client.gender,
            cep: client.cep ? sanitize(client.cep) : null,
            street: client.street ? sanitize(client.street) : null,
            number: client.number ? sanitize(client.number) : null,
            complement: client.complement ? sanitize(client.complement) : null,
            neighborhood: client.neighborhood ? sanitize(client.neighborhood) : null,
            city: client.city ? sanitize(client.city) : null,
            state: client.state ? sanitize(client.state) : null
        }).select().single();

        if (error) throw error;
        
        setState(prev => ({
            ...prev,
            clients: [...prev.clients, {
                id: data.id,
                shopId: data.shop_id,
                name: data.name,
                phone: data.phone,
                email: data.email,
                avatarUrl: data.avatar_url,
                notes: data.notes,
                totalSpent: data.total_spent || 0,
                createdAt: data.created_at
            }]
        }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const updateClient = async (id: string, client: Partial<Client>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const updateData: any = {};
        if (client.name !== undefined) updateData.name = sanitize(client.name);
        if (client.lastName !== undefined) updateData.last_name = client.lastName ? sanitize(client.lastName) : null;
        if (client.phone !== undefined) updateData.phone = sanitize(client.phone);
        if (client.email !== undefined) updateData.email = client.email ? sanitize(client.email) : null;
        if (client.avatarUrl !== undefined) updateData.avatar_url = client.avatarUrl;
        if (client.notes !== undefined) updateData.notes = client.notes ? sanitize(client.notes) : null;
        if (client.birthDate !== undefined) updateData.birth_date = client.birthDate;
        if (client.cpf !== undefined) updateData.cpf = client.cpf ? sanitize(client.cpf) : null;
        if (client.gender !== undefined) updateData.gender = client.gender;
        if (client.cep !== undefined) updateData.cep = client.cep ? sanitize(client.cep) : null;
        if (client.street !== undefined) updateData.street = client.street ? sanitize(client.street) : null;
        if (client.number !== undefined) updateData.number = client.number ? sanitize(client.number) : null;
        if (client.complement !== undefined) updateData.complement = client.complement ? sanitize(client.complement) : null;
        if (client.neighborhood !== undefined) updateData.neighborhood = client.neighborhood ? sanitize(client.neighborhood) : null;
        if (client.city !== undefined) updateData.city = client.city ? sanitize(client.city) : null;
        if (client.state !== undefined) updateData.state = client.state ? sanitize(client.state) : null;

        const { error } = await supabase.from('clients').update(updateData).eq('id', id).eq('shop_id', shopId);
        if (error) throw error;

        setState(prev => ({
            ...prev,
            clients: prev.clients.map(c => c.id === id ? { ...c, ...client } : c)
        }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const removeClient = async (id: string): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('clients').delete().eq('id', id).eq('shop_id', shopId);
        if (error) throw error;

        setState(prev => ({
            ...prev,
            clients: prev.clients.filter(c => c.id !== id)
        }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addMessageTemplate = async (template: Omit<MessageTemplate, 'id' | 'shopId'>): MutationResult => {
      if (!state.shop) return { success: false, error: 'Shop not found' };
      
      const triggerId = template.triggerId && template.triggerId !== "" ? template.triggerId : null;

      const { data, error } = await supabase.from('message_templates').insert({
          shop_id: state.shop.id,
          title: template.title,
          content: template.content,
          trigger_id: triggerId,
          trigger: template.triggerId || 'custom', // Campo legado obrigatório
          active: template.active,
          target: template.target,
          category: template.category
      }).select().single();

      if (error) return { success: false, error: error.message };
      setState(prev => ({ ...prev, messageTemplates: [...prev.messageTemplates, mapMessageTemplate(data)] }));
      return { success: true, data: mapMessageTemplate(data) };
  };

  const updateMessageTemplate = async (id: string, template: Partial<MessageTemplate>): MutationResult => {
      const updateData: any = { ...template };
      
      // Remover campos de controle e IDs que não devem ser alterados no PATCH
      delete updateData.id;
      delete updateData.shopId;
      
      // Mapear camelCase para snake_case e tratar UUIDs vazios
      if (template.triggerId !== undefined) {
          const triggerId = template.triggerId && template.triggerId !== "" ? template.triggerId : null;
          updateData.trigger_id = triggerId;
          updateData.trigger = template.triggerId || 'custom'; // Garantir campo legado
          delete updateData.triggerId;
      }
      
      const { error } = await supabase.from('message_templates').update(updateData).eq('id', id);
      if (error) return { success: false, error: error.message };
      setState(prev => ({
          ...prev,
          messageTemplates: prev.messageTemplates.map(t => t.id === id ? { ...t, ...template } : t)
      }));
      return { success: true };
  };

  const removeMessageTemplate = async (id: string): MutationResult => {
      const { error } = await supabase.from('message_templates').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      setState(prev => ({ ...prev, messageTemplates: prev.messageTemplates.filter(t => t.id !== id) }));
      return { success: true };
  };

  const addAutomationTrigger = async (trigger: Omit<AutomationTrigger, 'id' | 'shopId'>): MutationResult => {
      if (!state.shop) return { success: false, error: 'Shop not found' };
      const { data, error } = await supabase.from('automation_triggers').insert({
          shop_id: state.shop.id,
          name: trigger.name,
          value: trigger.value,
          unit: trigger.unit,
          period: trigger.period,
          active: trigger.active
      }).select().single();

      if (error) return { success: false, error: error.message };
      setState(prev => ({ ...prev, automationTriggers: [...prev.automationTriggers, mapAutomationTrigger(data)] }));
      return { success: true, data: mapAutomationTrigger(data) };
  };

  const updateAutomationTrigger = async (id: string, trigger: Partial<AutomationTrigger>): MutationResult => {
      const { error } = await supabase.from('automation_triggers').update(trigger).eq('id', id);
      if (error) return { success: false, error: error.message };
      setState(prev => ({
          ...prev,
          automationTriggers: prev.automationTriggers.map(t => t.id === id ? { ...t, ...trigger } : t)
      }));
      return { success: true };
  };

  const removeAutomationTrigger = async (id: string): MutationResult => {
      const { error } = await supabase.from('automation_triggers').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      setState(prev => ({ ...prev, automationTriggers: prev.automationTriggers.filter(t => t.id !== id) }));
      return { success: true };
  };

  const addMessageCategory = async (name: string): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { data, error } = await supabase.from('message_categories').insert({
            shop_id: shopId,
            name: sanitize(name)
        }).select().single();

        if (error) throw error;
        
        const newCategory = mapMessageCategory(data);
        setState(prev => ({ ...prev, messageCategories: [...prev.messageCategories, newCategory] }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const removeMessageCategory = async (id: string): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('message_categories').delete().eq('id', id).eq('shop_id', shopId);
        if (error) throw error;

        setState(prev => ({
            ...prev,
            messageCategories: prev.messageCategories.filter(c => c.id !== id)
        }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addSubscriptionPlan = async (plan: Omit<SubscriptionPlan, 'id' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { data, error } = await supabase.from('subscription_plans').insert({
            shop_id: shopId,
            name: sanitize(plan.name),
            description: plan.description ? sanitize(plan.description) : null,
            price: plan.price,
            services_per_month: plan.servicesPerMonth,
            active: plan.active
        }).select().single();

        if (error) throw error;
        
        const newPlan = mapSubscriptionPlan(data);
        setState(prev => ({ ...prev, subscriptionPlans: [...prev.subscriptionPlans, newPlan] }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const updateSubscriptionPlan = async (id: string, plan: Partial<SubscriptionPlan>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const updateData: any = {};
        if (plan.name !== undefined) updateData.name = sanitize(plan.name);
        if (plan.description !== undefined) updateData.description = plan.description ? sanitize(plan.description) : null;
        if (plan.price !== undefined) updateData.price = plan.price;
        if (plan.servicesPerMonth !== undefined) updateData.services_per_month = plan.servicesPerMonth;
        if (plan.active !== undefined) updateData.active = plan.active;

        const { error } = await supabase.from('subscription_plans').update(updateData).eq('id', id).eq('shop_id', shopId);
        if (error) throw error;

        setState(prev => ({
            ...prev,
            subscriptionPlans: prev.subscriptionPlans.map(p => p.id === id ? { ...p, ...plan } : p)
        }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const removeSubscriptionPlan = async (id: string): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('subscription_plans').delete().eq('id', id).eq('shop_id', shopId);
        if (error) throw error;

        setState(prev => ({
            ...prev,
            subscriptionPlans: prev.subscriptionPlans.filter(p => p.id !== id)
        }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addClientSubscription = async (sub: Omit<ClientSubscription, 'id' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { data, error } = await supabase.from('client_subscriptions').insert({
            shop_id: shopId,
            client_id: sub.clientId,
            plan_id: sub.planId,
            status: sub.status,
            start_date: sub.startDate,
            next_billing_date: sub.nextBillingDate,
            services_used_this_month: sub.servicesUsedThisMonth
        }).select().single();

        if (error) throw error;
        
        const newSub = mapClientSubscription(data);
        setState(prev => ({ ...prev, clientSubscriptions: [...prev.clientSubscriptions, newSub] }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const updateClientSubscription = async (id: string, sub: Partial<ClientSubscription>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const updateData: any = {};
        if (sub.status !== undefined) updateData.status = sub.status;
        if (sub.startDate !== undefined) updateData.start_date = sub.startDate;
        if (sub.nextBillingDate !== undefined) updateData.next_billing_date = sub.nextBillingDate;
        if (sub.servicesUsedThisMonth !== undefined) updateData.services_used_this_month = sub.servicesUsedThisMonth;

        const { error } = await supabase.from('client_subscriptions').update(updateData).eq('id', id).eq('shop_id', shopId);
        if (error) throw error;

        setState(prev => ({
            ...prev,
            clientSubscriptions: prev.clientSubscriptions.map(s => s.id === id ? { ...s, ...sub } : s)
        }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const removeClientSubscription = async (id: string): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('client_subscriptions').delete().eq('id', id).eq('shop_id', shopId);
        if (error) throw error;

        setState(prev => ({
            ...prev,
            clientSubscriptions: prev.clientSubscriptions.filter(s => s.id !== id)
        }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addBlockedSlot = async (block: Omit<BlockedSlot, 'id' | 'shopId'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { data, error } = await supabase.from('blocked_slots').insert({
            shop_id: shopId,
            professional_id: block.professionalId,
            date: block.date,
            start_time: block.startTime,
            end_time: block.endTime,
            reason: sanitize(block.reason || '')
        }).select().single();

        if (error) throw error;
        
        const newBlock = mapBlockedSlot(data);
        setState(prev => ({ ...prev, blockedSlots: [...prev.blockedSlots, newBlock] }));

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
        
        setState(prev => ({ ...prev, blockedSlots: prev.blockedSlots.filter(b => b.id !== id) }));

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

        // FIDELIDADE
        if (updated.loyaltyEnabled !== undefined) payload.loyalty_enabled = updated.loyaltyEnabled;
        if (updated.loyaltyMode !== undefined) payload.loyalty_mode = updated.loyaltyMode;
        if (updated.loyaltyCardGoal !== undefined) payload.loyalty_card_goal = updated.loyaltyCardGoal;
        if (updated.loyaltyPointsRatio !== undefined) payload.loyalty_points_ratio = updated.loyaltyPointsRatio;
        if (updated.loyaltyPointsGoal !== undefined) payload.loyalty_points_goal = updated.loyaltyPointsGoal;
        if (updated.loyaltyRewardValue !== undefined) payload.loyalty_reward_value = updated.loyaltyRewardValue;
        if (updated.loyaltyRewardType !== undefined) payload.loyalty_reward_type = updated.loyaltyRewardType;
        if (updated.loyaltyRewardValidityDays !== undefined) payload.loyalty_reward_validity_days = updated.loyaltyRewardValidityDays;

        const { data, error } = await supabase.from('settings').update(payload).eq('shop_id', shopId).select().single();
        if (error) throw error;
        
        const newSettings = mapSettings(data);
        setState(prev => ({ 
            ...prev, 
            settings: newSettings,
            shop: (updated.name || updated.slug) ? { ...prev.shop!, name: updated.name || prev.shop!.name, slug: updated.slug || prev.shop!.slug } : prev.shop,
            myShops: (updated.name || updated.slug) ? prev.myShops.map(s => s.id === shopId ? { ...s, name: updated.name || s.name, slug: updated.slug || s.slug } : s) : prev.myShops
        }));
        
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const fetchFinancialReport = async (startDate: string, endDate: string): Promise<Appointment[]> => {
    try {
        const shopId = ensureShopId();
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('shop_id', shopId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });
            
        if (error) throw error;
        return data.map(mapAppointment);
    } catch (e) {
        console.error(e);
        return [];
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

  const validateClientToken = useCallback(async (token: string) => {
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
  }, [supabase]);

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

  const addProduct = async (product: Omit<Product, 'id' | 'shopId' | 'createdAt'>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { data, error } = await supabase.from('products').insert({
            shop_id: shopId,
            name: product.name,
            category: product.category,
            cost_price: product.costPrice,
            sale_price: product.salePrice,
            current_stock: product.currentStock,
            min_stock: product.minStock
        }).select().single();

        if (error) throw error;
        
        const newProduct = mapProduct(data);
        setState(prev => ({ ...prev, products: [...prev.products, newProduct] }));
        return { success: true, data: newProduct };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const updateProduct = async (id: string, product: Partial<Product>): MutationResult => {
    try {
        const shopId = ensureShopId();
        const payload: any = {};
        if (product.name) payload.name = product.name;
        if (product.category) payload.category = product.category;
        if (product.costPrice !== undefined) payload.cost_price = product.costPrice;
        if (product.salePrice !== undefined) payload.sale_price = product.salePrice;
        if (product.currentStock !== undefined) payload.current_stock = product.currentStock;
        if (product.minStock !== undefined) payload.min_stock = product.minStock;

        const { data, error } = await supabase.from('products').update(payload).eq('id', id).eq('shop_id', shopId).select().single();
        if (error) throw error;

        const updated = mapProduct(data);
        setState(prev => ({
            ...prev,
            products: prev.products.map(p => p.id === id ? updated : p)
        }));
        return { success: true, data: updated };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const removeProduct = async (id: string): MutationResult => {
    try {
        const shopId = ensureShopId();
        const { error } = await supabase.from('products').delete().eq('id', id).eq('shop_id', shopId);
        if (error) throw error;

        setState(prev => ({
            ...prev,
            products: prev.products.filter(p => p.id !== id)
        }));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const restockProduct = async (productId: string, addedQuantity: number, newUnitCost: number): Promise<MutationResult> => {
    try {
        // 1. Busca o estado atual no DB
        const { data: p, error: fetchErr } = await supabase
            .from('products')
            .select('current_stock, cost_price')
            .eq('id', productId)
            .single();
            
        if (fetchErr) throw fetchErr;
        
        const currentStock = Number(p.current_stock) || 0;
        const currentCost = Number(p.cost_price) || 0;
        
        // 2. Calcula o Preço Médio Ponderado
        const newTotalStock = currentStock + addedQuantity;
        let newAverageCost = currentCost;
        
        if (newTotalStock > 0) {
            const totalCurrentValue = currentStock * currentCost;
            const totalNewValue = addedQuantity * newUnitCost;
            newAverageCost = (totalCurrentValue + totalNewValue) / newTotalStock;
        }
        
        newAverageCost = Math.round(newAverageCost * 100) / 100;
        
        // 3. Atualiza o DB
        const { error: updateErr } = await supabase
            .from('products')
            .update({
                current_stock: newTotalStock,
                cost_price: newAverageCost
            })
            .eq('id', productId);
            
        if (updateErr) throw updateErr;
        
        // 4. Atualiza o State local
        setState(prev => ({
            ...prev,
            products: prev.products.map(prod => 
                prod.id === productId 
                    ? { ...prod, currentStock: newTotalStock, costPrice: newAverageCost } 
                    : prod
            )
        }));
        
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addAppointmentProducts = async (appointmentId: string, products: { productId: string, quantity: number, unitPrice: number }[]): MutationResult => {
    try {
        const { error } = await supabase.from('appointment_products').insert(
            products.map(p => ({
                appointment_id: appointmentId,
                product_id: p.productId,
                quantity: p.quantity,
                unit_price: p.unitPrice
            }))
        );
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const openCashSession = async (openingBalance: number): Promise<MutationResult> => {
      try {
          const shopId = ensureShopId();
          if (state.cashSessions.some(s => s.status === 'open')) {
              throw new Error('Já existe um caixa aberto para esta loja no momento.');
          }

          const { data: userData } = await supabase.auth.getUser();

          const { data, error } = await supabase.from('cash_sessions').insert([{
              shop_id: shopId,
              status: 'open',
              opening_balance: Math.round(openingBalance * 100) / 100,
              opened_by: userData?.user?.id
          }]).select().single();

          if (error) throw error;

          const session = mapCashSession(data);
          setState(prev => ({
              ...prev,
              cashSessions: [session, ...prev.cashSessions],
              cashFlowEntries: [] // limpa movimentações antigas do state local
          }));

          return { success: true };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  };

  const closeCashSession = async (closingBalance: number): Promise<MutationResult> => {
      try {
          const openSession = state.cashSessions.find(s => s.status === 'open');
          if (!openSession) throw new Error('Não há caixa aberto no momento.');

          const { error } = await supabase.from('cash_sessions').update({
              status: 'closed',
              closing_balance: Math.round(closingBalance * 100) / 100,
              closed_at: new Date().toISOString()
          }).eq('id', openSession.id);

          if (error) throw error;

          setState(prev => ({
              ...prev,
              cashSessions: prev.cashSessions.map(s => s.id === openSession.id ? { ...s, status: 'closed', closingBalance, closedAt: new Date().toISOString() } : s)
          }));

          return { success: true };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  };

  const addCashMovement = async (entry: Omit<CashFlowEntry, 'id' | 'shopId' | 'sessionId' | 'createdAt'>): Promise<MutationResult> => {
      try {
          const shopId = ensureShopId();
          const openSession = state.cashSessions.find(s => s.status === 'open');
          if (!openSession) throw new Error('Não há caixa aberto no momento.');

          const { data, error } = await supabase.from('cash_flow_entries').insert([{
              shop_id: shopId,
              session_id: openSession.id,
              type: entry.type,
              category: entry.category,
              amount: Math.round(entry.amount * 100) / 100,
              description: entry.description
          }]).select().single();

          if (error) throw error;

          const newEntry = mapCashFlowEntry(data);
          setState(prev => ({
              ...prev,
              cashFlowEntries: [newEntry, ...prev.cashFlowEntries]
          }));

          return { success: true };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  };

  const upsertGoal = async (goal: Partial<Goal> & { name: string; category: string; targetValue: number; period: string; startDate: string; endDate: string }): MutationResult => {
      try {
          const shopId = ensureShopId();
          const payload = {
              shop_id: shopId,
              professional_id: goal.professionalId || null,
              name: goal.name,
              category: goal.category,
              target_value: goal.targetValue,
              period: goal.period,
              start_date: goal.startDate,
              end_date: goal.endDate
          };

          let updatedGoal: Goal;

          if (goal.id) {
              // UPDATE: re-fetch normalmente
              const { data, error } = await supabase
                  .from('goals').update(payload)
                  .eq('id', goal.id).eq('shop_id', shopId)
                  .select().single();
              if (error) throw error;
              updatedGoal = mapGoal(data);
          } else {
              // INSERT: após inserção, faz re-fetch para obter current_value
              // calculado pelo trigger trg_sync_goal_initial (roda na mesma tx)
              const { data: inserted, error: insertError } = await supabase
                  .from('goals').insert(payload).select('id').single();
              if (insertError) throw insertError;

              const { data: fresh, error: fetchError } = await supabase
                  .from('goals').select('*').eq('id', inserted.id).single();
              if (fetchError) throw fetchError;
              updatedGoal = mapGoal(fresh);
          }

          setState(prev => ({
              ...prev,
              goals: goal.id
                ? prev.goals.map(g => g.id === goal.id ? updatedGoal : g)
                : [...prev.goals, updatedGoal]
          }));
          return { success: true, data: updatedGoal };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  };


  const removeGoal = async (id: string): MutationResult => {
      try {
          const shopId = ensureShopId();
          const { error } = await supabase.from('goals').delete().eq('id', id).eq('shop_id', shopId);
          if (error) throw error;

          setState(prev => ({
              ...prev,
              goals: prev.goals.filter(g => g.id !== id)
          }));
          return { success: true };
      } catch (e: any) {
          return { success: false, error: e.message };
      }
  };

  const calculateGoalProgress = (goal: Goal) => {
      const percentage = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
      const remaining = Math.max(goal.targetValue - goal.currentValue, 0);
      
      let status: 'critical' | 'warning' | 'good' = 'critical';
      if (percentage >= 70) status = 'good';
      else if (percentage >= 30) status = 'warning';

      return { percentage: Math.min(percentage, 100), remaining, status };
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

  const toggleTheme = () => {
      // Desativado: Sistema fixo em modo claro
      console.log("Troca de tema desativada. Sistema fixo em modo claro.");
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
      addService, updateService, removeService,
      addProfessional, updateProfessional, removeProfessional,
      addCoupon, updateCoupon, removeCoupon,
      addAppointment,
      createManualAppointment,
      updateAppointmentStatus,
      updateAppointmentPaymentMethod,
      addClient, updateClient, removeClient,
      addMessageTemplate, updateMessageTemplate, removeMessageTemplate,
      addAutomationTrigger,
      updateAutomationTrigger,
      removeAutomationTrigger,
      addMessageCategory, removeMessageCategory,
      addSubscriptionPlan, updateSubscriptionPlan, removeSubscriptionPlan,
      addClientSubscription, updateClientSubscription, removeClientSubscription,
      addBlockedSlot, removeBlockedSlot,
      updateSettings,
      addProduct, updateProduct, removeProduct, restockProduct, addAppointmentProducts,
      openCashSession, closeCashSession, addCashMovement,
      upsertGoal, removeGoal, calculateGoalProgress,
      getWhatsAppQRCode,
      getWhatsAppStatus,
      disconnectWhatsApp,
      fetchFinancialReport,
      requestClientLogin,
      validateClientToken,
      logoutClient,
      toggleTheme,
      reloadClients,
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
