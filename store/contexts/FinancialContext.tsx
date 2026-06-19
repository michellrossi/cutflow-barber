import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CashSession, CashFlowEntry, Coupon, CommissionPayment } from '../../types';
import { MutationResult } from '../types';
import { supabase } from '../../supabaseClient';
import { mapCashSession, mapCashFlowEntry, mapCoupon, mapService, mapAppointment, mapCommissionPayment } from '../mappers';
import { INITIAL_STATE } from '../helpers';

interface FinancialContextType {
  cashSessions: CashSession[];
  cashFlowEntries: CashFlowEntry[];
  coupons: Coupon[];
  commissionPayments: CommissionPayment[];
  
  // Cash Actions
  openCashSession: (openingBalance: number) => MutationResult<CashSession>;
  closeCashSession: (
    closingBalance: number,
    details?: {
      totalInputs: number;
      totalOutputs: number;
      expectedBalance: number;
      difference: number;
      justification?: string;
    }
  ) => MutationResult<CashSession>;
  addCashMovement: (entry: Omit<CashFlowEntry, 'id' | 'shopId' | 'sessionId' | 'createdAt'>) => MutationResult<CashFlowEntry>;
  reloadFinancialData: () => Promise<void>;
  
  // Commission Actions
  addCommissionPayment: (payment: Omit<CommissionPayment, 'id' | 'shopId' | 'paidAt'>) => MutationResult<CommissionPayment>;
  
  // Coupon Actions
  addCoupon: (coupon: Omit<Coupon, 'id' | 'usageCount' | 'shopId'>) => MutationResult<Coupon>;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => MutationResult<Coupon>;
  removeCoupon: (id: string) => MutationResult;
  
  // Reports
  fetchFinancialReport: (startDate: string, endDate: string) => Promise<{ appointments: any[], movements: CashFlowEntry[] }>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ shopId: string; children: ReactNode }> = ({ shopId, children }) => {
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [commissionPayments, setCommissionPayments] = useState<CommissionPayment[]>([]);

  useEffect(() => {
    if (shopId) {
      loadInitialData();
    } else {
      setCashSessions([]);
      setCashFlowEntries([]);
      setCoupons([]);
      setCommissionPayments([]);
    }
  }, [shopId]);

  // Realtime — Caixa Físico (sessões e movimentações)
  // Sem isso, uma sangria/aporte feita em outro dispositivo (ex: tablet do balcão)
  // só aparecia no celular do dono depois de um reload manual da página.
  useEffect(() => {
    if (!shopId) return;
    const ch = supabase.channel(`financial_${shopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_sessions', filter: `shop_id=eq.${shopId}` },
        () => { loadInitialData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_flow_entries', filter: `shop_id=eq.${shopId}` },
        () => { loadInitialData(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shopId]);

  const loadInitialData = async () => {
    try {
      const [sessionsRes, couponsRes, commissionPaymentsRes] = await Promise.all([
        supabase.from('cash_sessions').select('*').eq('shop_id', shopId).order('opened_at', { ascending: false }).limit(20),
        supabase.from('coupons').select('*').eq('shop_id', shopId),
        supabase.from('commission_payments').select('*').eq('shop_id', shopId).order('paid_at', { ascending: false })
      ]);

      const mappedSessions = (sessionsRes.data || []).map(mapCashSession);
      setCashSessions(mappedSessions);
      setCoupons((couponsRes.data || []).map(mapCoupon));
      setCommissionPayments((commissionPaymentsRes.data || []).map(mapCommissionPayment));

      // Carrega movimentações da sessão ATIVA (se houver)
      const activeSession = mappedSessions.find(s => s.status === 'open');
      if (activeSession) {
        const { data: movements } = await supabase
          .from('cash_flow_entries')
          .select('*')
          .eq('session_id', activeSession.id)
          .order('created_at', { ascending: false });
        if (movements) setCashFlowEntries(movements.map(mapCashFlowEntry));
      } else {
        setCashFlowEntries([]);
      }
    } catch (e) {
      console.error('Error loading financial data:', e);
    }
  };

  const ensureShopId = () => {
    if (!shopId) throw new Error("ID da barbearia não encontrado.");
    return shopId;
  };

  // ── Cash Actions ─────────────────────────────────────────────────────────────
  
  const openCashSession = async (openingBalance: number): MutationResult<CashSession> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('cash_sessions').insert({
        shop_id: sid,
        opening_balance: openingBalance,
        status: 'open',
        opened_at: new Date().toISOString()
      }).select().single();

      if (error) throw error;
      const session = mapCashSession(data);
      setCashSessions(prev => [session, ...prev.filter(s => s.status !== 'open')]);
      setCashFlowEntries([]);
      return { success: true, data: session };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação financeira';
      return { success: false, error: message };
    }
  };

  const closeCashSession = async (
    closingBalance: number,
    details?: {
      totalInputs: number;
      totalOutputs: number;
      expectedBalance: number;
      difference: number;
      justification?: string;
    }
  ): MutationResult<CashSession> => {
    try {
      const sid = ensureShopId();
      const activeSession = cashSessions.find(s => s.status === 'open');
      if (!activeSession) throw new Error("Nenhuma sessão aberta encontrada.");

      const updateData: {
        closing_balance: number;
        status: 'open' | 'closed';
        closed_at: string;
        total_inputs?: number;
        total_outputs?: number;
        expected_balance?: number;
        difference?: number;
        justification?: string;
      } = {
        closing_balance: closingBalance,
        status: 'closed',
        closed_at: new Date().toISOString()
      };

      if (details) {
        updateData.total_inputs = details.totalInputs;
        updateData.total_outputs = details.totalOutputs;
        updateData.expected_balance = details.expectedBalance;
        updateData.difference = details.difference;
        updateData.justification = details.justification;
      }

      const { data, error } = await supabase.from('cash_sessions').update(updateData)
        .eq('id', activeSession.id).eq('shop_id', sid).select().single();

      if (error) throw error;
      const session = mapCashSession(data);
      setCashSessions(prev => prev.map(s => s.id === session.id ? session : s));
      setCashFlowEntries([]);
      return { success: true, data: session };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação financeira';
      return { success: false, error: message };
    }
  };

  const addCashMovement = async (entry: Omit<CashFlowEntry, 'id' | 'shopId' | 'sessionId' | 'createdAt'>): MutationResult<CashFlowEntry> => {
    try {
      const sid = ensureShopId();
      const activeSession = cashSessions.find(s => s.status === 'open');
      if (!activeSession) throw new Error("Abra o caixa antes de registrar movimentações.");

      const { data, error } = await supabase.from('cash_flow_entries').insert({
        shop_id: sid,
        session_id: activeSession.id,
        type: entry.type,
        amount: entry.amount,
        description: entry.description,
        category: entry.category
      }).select().single();

      if (error) throw error;
      const newEntry = mapCashFlowEntry(data);
      setCashFlowEntries(prev => [newEntry, ...prev]);
      return { success: true, data: newEntry };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação financeira';
      return { success: false, error: message };
    }
  };

  // ── Coupon Actions ───────────────────────────────────────────────────────────

  const addCoupon = async (coupon: Omit<Coupon, 'id' | 'usageCount' | 'shopId'>): MutationResult<Coupon> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('coupons').insert({
        shop_id: sid,
        code: coupon.code.toUpperCase(),
        type: coupon.type,
        value: coupon.value,
        active: coupon.active,
        max_uses: coupon.maxUses,
        expires_at: coupon.expiresAt
      }).select().single();

      if (error) throw error;
      const newCoupon = mapCoupon(data);
      setCoupons(prev => [...prev, newCoupon]);
      return { success: true, data: newCoupon };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação financeira';
      return { success: false, error: message };
    }
  };

  const updateCoupon = async (id: string, coupon: Partial<Coupon>): MutationResult<Coupon> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('coupons').update({
        code: coupon.code?.toUpperCase(),
        type: coupon.type,
        value: coupon.value,
        active: coupon.active,
        max_uses: coupon.maxUses,
        expires_at: coupon.expiresAt
      }).eq('id', id).eq('shop_id', sid).select().single();

      if (error) throw error;
      const updated = mapCoupon(data);
      setCoupons(prev => prev.map(c => c.id === id ? updated : c));
      return { success: true, data: updated };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação financeira';
      return { success: false, error: message };
    }
  };

  const removeCoupon = async (id: string): MutationResult => {
    try {
      const sid = ensureShopId();
      const { error } = await supabase.from('coupons').delete().eq('id', id).eq('shop_id', sid);
      if (error) throw error;
      setCoupons(prev => prev.filter(c => c.id !== id));
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação financeira';
      return { success: false, error: message };
    }
  };

  const addCommissionPayment = async (payment: Omit<CommissionPayment, 'id' | 'shopId' | 'paidAt'>): MutationResult<CommissionPayment> => {
    try {
      const sid = ensureShopId();
      const { data: { session } } = await supabase.auth.getSession();
      const approvedBy = session?.user?.id;
      if (!approvedBy) throw new Error("Usuário não autenticado para aprovar pagamento.");

      const { data, error } = await supabase.rpc('pay_commission', {
        p_professional_id: payment.professionalId,
        p_period_start: payment.periodStart,
        p_period_end: payment.periodEnd,
        p_approved_by: approvedBy,
        p_payment_method: payment.paymentMethod
      });

      if (error) throw error;
      
      const rpcResult = data as { success: boolean; message?: string; paymentId?: string };
      if (rpcResult && !rpcResult.success) {
        throw new Error(rpcResult.message || 'Erro ao realizar transação de comissão no servidor');
      }

      const paymentId = rpcResult.paymentId;
      if (!paymentId) throw new Error("ID do pagamento não retornado do servidor.");

      const { data: insertedPayment, error: fetchError } = await supabase
        .from('commission_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError || !insertedPayment) {
        throw new Error(fetchError?.message || 'Pagamento inserido com sucesso, mas erro ao recuperar registro');
      }

      const newPayment = mapCommissionPayment(insertedPayment);
      setCommissionPayments(prev => [newPayment, ...prev]);
      return { success: true, data: newPayment };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao salvar registro de liquidação de comissão';
      return { success: false, error: message };
    }
  };

  // ── Reports ──────────────────────────────────────────────────────────────────

  const fetchFinancialReport = async (startDate: string, endDate: string) => {
    try {
      const sid = ensureShopId();
      const [appointmentsRes, movementsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .eq('shop_id', sid)
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('cash_flow_entries')
          .select('*')
          .eq('shop_id', sid)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
      ]);

      return { 
        appointments: (appointmentsRes.data || []).map(mapAppointment), 
        movements: (movementsRes.data || []).map(mapCashFlowEntry) 
      };
    } catch (e) {
      console.error('Error fetching financial report:', e);
      return { appointments: [], movements: [] };
    }
  };

  return (
    <FinancialContext.Provider value={{ 
      cashSessions, cashFlowEntries, coupons, commissionPayments,
      openCashSession, closeCashSession, addCashMovement,
      reloadFinancialData: loadInitialData,
      addCommissionPayment,
      addCoupon, updateCoupon, removeCoupon,
      fetchFinancialReport
    }}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) throw new Error("useFinancial must be used within a FinancialProvider");
  return context;
};
