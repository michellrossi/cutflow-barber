import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, SubscriptionPlan, ClientSubscription } from '../../types';
import { MutationResult } from '../types';
import { supabase } from '../../supabaseClient';
import { 
    mapClient, mapSubscriptionPlan, mapClientSubscription, 
    type ClientRow, type SubscriptionPlanRow, type ClientSubscriptionRow 
} from '../mappers';
import { sanitize } from '../helpers';

interface ClientContextType {
  clients: Client[];
  subscriptionPlans: SubscriptionPlan[];
  clientSubscriptions: ClientSubscription[];
  currentClient: Client | null;
  clientSession: any | null;
  
  // Client CRUD
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'shopId'>) => MutationResult<Client>;
  updateClient: (id: string, client: Partial<Client>) => MutationResult<Client>;
  removeClient: (id: string) => MutationResult;
  reloadClients: (sid: string) => Promise<void>;
  ensureClientExists: (sid: string, name: string, phone: string, birthDate?: string) => Promise<string>;
  
  // Subscriptions
  addSubscriptionPlan: (plan: Omit<SubscriptionPlan, 'id' | 'shopId' | 'createdAt'>) => MutationResult<SubscriptionPlan>;
  updateSubscriptionPlan: (id: string, plan: Partial<SubscriptionPlan>) => MutationResult<SubscriptionPlan>;
  removeSubscriptionPlan: (id: string) => MutationResult;
  
  addClientSubscription: (sub: Omit<ClientSubscription, 'id' | 'shopId' | 'createdAt'>) => MutationResult<ClientSubscription>;
  updateClientSubscription: (id: string, sub: Partial<ClientSubscription>) => MutationResult<ClientSubscription>;
  removeClientSubscription: (id: string) => MutationResult;
  
  // Client Auth
  requestClientLogin: (phone: string, name?: string, birthDate?: string, justCheck?: boolean) => Promise<{ success: boolean; url?: string; error?: string; needsRegistration?: boolean }>;
  validateClientToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  logoutClient: () => void;

  // Loyalty Actions
  processLoyalty: (appointment: any, settings: any) => Promise<void>;
  generateLoyaltyReward: (client: Client, sid: string) => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const ClientProvider: React.FC<{ shopId: string; children: ReactNode }> = ({ shopId, children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [clientSubscriptions, setClientSubscriptions] = useState<ClientSubscription[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [clientSession, setClientSession] = useState<any | null>(null);

  const loadData = async () => {
    if (!shopId) return;
    try {
      // LAZY LOAD: clients NÃO é carregado no boot — apenas via reloadClients ou sob demanda
      const [plansRes, subsRes] = await Promise.all([
        supabase.from('subscription_plans').select('*').eq('shop_id', shopId).order('name'),
        supabase.from('client_subscriptions').select('*').eq('shop_id', shopId)
      ]);

      if (plansRes.data) setSubscriptionPlans(plansRes.data.map(mapSubscriptionPlan));
      if (subsRes.data) setClientSubscriptions(subsRes.data.map(mapClientSubscription));
      
      // Restaurar sessão do cliente se existir
      const savedClient = sessionStorage.getItem('currentClient');
      const savedSession = sessionStorage.getItem('clientSession');
      if (savedClient) setCurrentClient(JSON.parse(savedClient));
      if (savedSession) setClientSession(JSON.parse(savedSession));
    } catch (e) {
      console.error('Error loading client data:', e);
    }
  };

  useEffect(() => {
    if (shopId) loadData();
    else {
      setClients([]);
      setSubscriptionPlans([]);
      setClientSubscriptions([]);
      setCurrentClient(null);
      setClientSession(null);
    }
  }, [shopId]);

  // Sincronização em Tempo Real para Clientes
  useEffect(() => {
    if (!shopId) return;
    const ch = supabase.channel(`clients_${shopId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'clients',
        filter: `shop_id=eq.${shopId}` 
      }, () => { 
        reloadClients(shopId); 
      })
      .subscribe();
    
    return () => { 
      supabase.removeChannel(ch); 
    };
  }, [shopId]);

  const ensureShopId = () => {
    if (!shopId) throw new Error("ID da barbearia não encontrado.");
    return shopId;
  };

  // ── Client CRUD ──────────────────────────────────────────────────────────────

  const addClient = async (client: Omit<Client, 'id' | 'createdAt' | 'shopId'>): MutationResult<Client> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('clients').insert({
        shop_id: sid,
        name: sanitize(client.name),
        phone: sanitize(client.phone),
        birth_date: client.birthDate,
        notes: client.notes ? sanitize(client.notes) : null
      }).select().single();

      if (error) throw error;
      const newC = mapClient(data);
      setClients(prev => [...prev, newC]);
      return { success: true, data: newC };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updateClient = async (id: string, client: Partial<Client>): MutationResult<Client> => {
    try {
      const sid = ensureShopId();
      const payload: any = {};
      if (client.name) payload.name = sanitize(client.name);
      if (client.phone) payload.phone = sanitize(client.phone);
      if (client.birthDate !== undefined) payload.birth_date = client.birthDate;
      if (client.notes !== undefined) payload.notes = client.notes ? sanitize(client.notes) : null;
      if (client.loyaltyCardCount !== undefined) payload.loyalty_card_count = client.loyaltyCardCount;
      if (client.loyaltyPoints !== undefined) payload.loyalty_points = client.loyaltyPoints;

      const { data, error } = await supabase.from('clients').update(payload).eq('id', id).eq('shop_id', sid).select().single();
      if (error) throw error;

      const updated = mapClient(data);
      setClients(prev => prev.map(c => c.id === id ? updated : c));
      return { success: true, data: updated };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const removeClient = async (id: string): MutationResult => {
    try {
      const sid = ensureShopId();
      const { error } = await supabase.from('clients').delete().eq('id', id).eq('shop_id', sid);
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== id));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const reloadClients = async (sid: string) => {
    const { data } = await supabase.from('clients').select('*').eq('shop_id', sid).order('name');
    if (data) setClients(data.map(mapClient));
  };

  const ensureClientExists = async (sid: string, name: string, phone: string, birthDate?: string): Promise<string> => {
    const cleanPhone = sanitize(phone);
    const { data: existing } = await supabase.from('clients').select('id').eq('shop_id', sid).eq('phone', cleanPhone).maybeSingle();
    if (existing) return existing.id;

    const { data: created, error } = await supabase.from('clients').insert({
        shop_id: sid,
        name: sanitize(name),
        phone: cleanPhone,
        birth_date: birthDate
    }).select('id').single();

    if (error) throw error;
    return created.id;
  };

  // ── Subscription CRUD ────────────────────────────────────────────────────────

  const addSubscriptionPlan = async (plan: Omit<SubscriptionPlan, 'id' | 'shopId' | 'createdAt'>): MutationResult<SubscriptionPlan> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('subscription_plans').insert({
        shop_id: sid,
        name: sanitize(plan.name),
        description: plan.description ? sanitize(plan.description) : null,
        price: plan.price,
        services_per_month: plan.servicesPerMonth,
        active: plan.active
      }).select().single();

      if (error) throw error;
      const newPlan = mapSubscriptionPlan(data);
      setSubscriptionPlans(prev => [...prev, newPlan]);
      return { success: true, data: newPlan };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updateSubscriptionPlan = async (id: string, plan: Partial<SubscriptionPlan>): MutationResult<SubscriptionPlan> => {
    try {
      const sid = ensureShopId();
      const payload: any = {};
      if (plan.name) payload.name = sanitize(plan.name);
      if (plan.description !== undefined) payload.description = plan.description ? sanitize(plan.description) : null;
      if (plan.price !== undefined) payload.price = plan.price;
      if (plan.servicesPerMonth !== undefined) payload.services_per_month = plan.servicesPerMonth;
      if (plan.active !== undefined) payload.active = plan.active;

      const { data, error } = await supabase.from('subscription_plans').update(payload).eq('id', id).eq('shop_id', sid).select().single();
      if (error) throw error;

      const updated = mapSubscriptionPlan(data);
      setSubscriptionPlans(prev => prev.map(p => p.id === id ? updated : p));
      return { success: true, data: updated };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const removeSubscriptionPlan = async (id: string): MutationResult => {
    try {
      const sid = ensureShopId();
      const { error } = await supabase.from('subscription_plans').delete().eq('id', id).eq('shop_id', sid);
      if (error) throw error;
      setSubscriptionPlans(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const addClientSubscription = async (sub: Omit<ClientSubscription, 'id' | 'shopId' | 'createdAt'>): MutationResult<ClientSubscription> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('client_subscriptions').insert({
        shop_id: sid,
        client_id: sub.clientId,
        plan_id: sub.planId,
        status: sub.status,
        start_date: sub.startDate,
        next_billing_date: sub.nextBillingDate,
        services_used_this_month: sub.servicesUsedThisMonth
      }).select().single();

      if (error) throw error;
      const newSub = mapClientSubscription(data);
      setClientSubscriptions(prev => [...prev, newSub]);
      return { success: true, data: newSub };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updateClientSubscription = async (id: string, sub: Partial<ClientSubscription>): MutationResult<ClientSubscription> => {
    try {
      const sid = ensureShopId();
      const payload: any = {};
      if (sub.status) payload.status = sub.status;
      if (sub.nextBillingDate) payload.next_billing_date = sub.nextBillingDate;
      if (sub.servicesUsedThisMonth !== undefined) payload.services_used_this_month = sub.servicesUsedThisMonth;

      const { data, error } = await supabase.from('client_subscriptions').update(payload).eq('id', id).eq('shop_id', sid).select().single();
      if (error) throw error;

      const updated = mapClientSubscription(data);
      setClientSubscriptions(prev => prev.map(s => s.id === id ? updated : s));
      return { success: true, data: updated };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const removeClientSubscription = async (id: string): MutationResult => {
    try {
      const sid = ensureShopId();
      const { error } = await supabase.from('client_subscriptions').delete().eq('id', id).eq('shop_id', sid);
      if (error) throw error;
      setClientSubscriptions(prev => prev.filter(s => s.id !== id));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // ── Client Auth ─────────────────────────────────────────────────────────────

  const requestClientLogin = async (phone: string, name?: string, birthDate?: string, justCheck?: boolean) => {
    try {
        const sid = ensureShopId();
        const response = await fetch('/api/auth/client-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shopId: sid, phone, name, birthDate, justCheck }),
        });
        return await response.json();
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const validateClientToken = async (token: string) => {
    try {
        const response = await fetch('/api/auth/client-validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });
        const result = await response.json();
        if (result.success && result.client) {
            setCurrentClient(result.client);
            setClientSession(result.session);
            sessionStorage.setItem('currentClient', JSON.stringify(result.client));
            sessionStorage.setItem('clientSession', JSON.stringify(result.session));
        }
        return result;
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const logoutClient = () => {
    sessionStorage.removeItem('currentClient');
    sessionStorage.removeItem('clientSession');
    setCurrentClient(null);
    setClientSession(null);
  };

  // ── Loyalty Actions ──────────────────────────────────────────────────────────

  const processLoyalty = async (appointment: any, settings: any) => {
      const sid = ensureShopId();
      if (!settings.loyaltyEnabled) return;

      let client = clients.find(c => (appointment.clientId && c.id === appointment.clientId) || c.phone === appointment.clientPhone);
      if (!client) {
          const { data } = await supabase.from('clients').select('*').eq('shop_id', sid).eq('phone', appointment.clientPhone).maybeSingle();
          if (data) client = mapClient(data);
      }

      if (!client) return;

      let updatedPoints = client.loyaltyPoints || 0;
      let updatedCardCount = client.loyaltyCardCount || 0;
      let rewardTriggered = false;

      if (settings.loyaltyMode === 'points') {
          const pointsEarned = Math.floor(appointment.totalValue * (settings.loyaltyPointsRatio || 1));
          updatedPoints += pointsEarned;
          if (updatedPoints >= (settings.loyaltyPointsGoal || 1000)) rewardTriggered = true;
      } else {
          updatedCardCount += 1;
          if (updatedCardCount >= (settings.loyaltyCardGoal || 10)) rewardTriggered = true;
      }

      const updatePayload: any = {
          total_spent: (client.totalSpent || 0) + appointment.totalValue,
          loyalty_points: updatedPoints,
          loyalty_card_count: updatedCardCount
      };

      const { error } = await supabase.from('clients').update(updatePayload).eq('id', client.id);
      if (error) return;

      if (rewardTriggered) await generateLoyaltyReward(client, sid);
      await reloadClients(sid);
  };

  const generateLoyaltyReward = async (client: Client, sid: string) => {
      try {
          const response = await fetch('/api/loyalty/reward', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientId: client.id, shopId: sid })
          });
          const result = await response.json();
          if (result.success) {
              // Note: Coupons are in FinancialContext, so we don't update them here.
              // They will be updated via Realtime or manual refresh if needed.
          }
      } catch (e) {
          console.error("[Loyalty] Error generating reward:", e);
      }
  };

  return (
    <ClientContext.Provider value={{ 
      clients, subscriptionPlans, clientSubscriptions, currentClient, clientSession,
      addClient, updateClient, removeClient, reloadClients, ensureClientExists,
      addSubscriptionPlan, updateSubscriptionPlan, removeSubscriptionPlan,
      addClientSubscription, updateClientSubscription, removeClientSubscription,
      requestClientLogin, validateClientToken, logoutClient,
      processLoyalty, generateLoyaltyReward
    }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientContext);
  if (!context) throw new Error("useClients must be used within a ClientProvider");
  return context;
};
