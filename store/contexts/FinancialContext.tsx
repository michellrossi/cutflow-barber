import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CashSession, CashFlowEntry, Coupon, MutationResult } from '../../types';
import { supabase } from '../../supabaseClient';
import { mapCashSession, mapCashFlowEntry, mapCoupon, mapService } from '../mappers';
import { INITIAL_STATE } from '../helpers';

interface FinancialContextType {
  cashSessions: CashSession[];
  cashFlowEntries: CashFlowEntry[];
  coupons: Coupon[];
  
  // Cash Actions
  openCashSession: (openingBalance: number) => MutationResult<CashSession>;
  closeCashSession: (closingBalance: number) => MutationResult<CashSession>;
  addCashMovement: (entry: Omit<CashFlowEntry, 'id' | 'shopId' | 'sessionId' | 'createdAt'>) => MutationResult<CashFlowEntry>;
  
  // Coupon Actions
  addCoupon: (coupon: Omit<Coupon, 'id' | 'usageCount' | 'shopId'>) => MutationResult<Coupon>;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => MutationResult<Coupon>;
  removeCoupon: (id: string) => MutationResult;
  
  // Reports
  fetchFinancialReport: (startDate: string, endDate: string) => Promise<any>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ shopId: string; children: ReactNode }> = ({ shopId, children }) => {
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    if (shopId) {
      loadInitialData();
    } else {
      setCashSessions([]);
      setCashFlowEntries([]);
      setCoupons([]);
    }
  }, [shopId]);

  const loadInitialData = async () => {
    try {
      const [sessionsRes, couponsRes] = await Promise.all([
        supabase.from('cash_sessions').select('*').eq('shop_id', shopId).eq('status', 'open').order('opened_at', { ascending: false }).limit(1),
        supabase.from('coupons').select('*').eq('shop_id', shopId)
      ]);

      const mappedSessions = (sessionsRes.data || []).map(mapCashSession);
      setCashSessions(mappedSessions);
      setCoupons((couponsRes.data || []).map(mapCoupon));

      if (mappedSessions.length > 0) {
        const { data: movements } = await supabase
          .from('cash_flow_entries')
          .select('*')
          .eq('session_id', mappedSessions[0].id)
          .order('created_at', { ascending: false });
        if (movements) setCashFlowEntries(movements.map(mapCashFlowEntry));
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
      setCashSessions([session]);
      setCashFlowEntries([]);
      return { success: true, data: session };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const closeCashSession = async (closingBalance: number): MutationResult<CashSession> => {
    try {
      const sid = ensureShopId();
      const activeSession = cashSessions.find(s => s.status === 'open');
      if (!activeSession) throw new Error("Nenhuma sessão aberta encontrada.");

      const { data, error } = await supabase.from('cash_sessions').update({
        closing_balance: closingBalance,
        status: 'closed',
        closed_at: new Date().toISOString()
      }).eq('id', activeSession.id).eq('shop_id', sid).select().single();

      if (error) throw error;
      const session = mapCashSession(data);
      setCashSessions([]);
      setCashFlowEntries([]);
      return { success: true, data: session };
    } catch (e: any) {
      return { success: false, error: e.message };
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
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // ── Coupon Actions ───────────────────────────────────────────────────────────

  const addCoupon = async (coupon: Omit<Coupon, 'id' | 'usageCount' | 'shopId'>): MutationResult<Coupon> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('coupons').insert({
        shop_id: sid,
        code: coupon.code.toUpperCase(),
        discount_type: coupon.discountType,
        discount_value: coupon.discountValue,
        min_purchase: coupon.minPurchase,
        expires_at: coupon.expiresAt,
        active: coupon.active,
        usage_limit: coupon.usageLimit
      }).select().single();

      if (error) throw error;
      const newCoupon = mapCoupon(data);
      setCoupons(prev => [...prev, newCoupon]);
      return { success: true, data: newCoupon };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const updateCoupon = async (id: string, coupon: Partial<Coupon>): MutationResult<Coupon> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('coupons').update({
        code: coupon.code?.toUpperCase(),
        discount_type: coupon.discountType,
        discount_value: coupon.discountValue,
        min_purchase: coupon.minPurchase,
        expires_at: coupon.expiresAt,
        active: coupon.active,
        usage_limit: coupon.usageLimit
      }).eq('id', id).eq('shop_id', sid).select().single();

      if (error) throw error;
      const updated = mapCoupon(data);
      setCoupons(prev => prev.map(c => c.id === id ? updated : c));
      return { success: true, data: updated };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const removeCoupon = async (id: string): MutationResult => {
    try {
      const sid = ensureShopId();
      const { error } = await supabase.from('coupons').delete().eq('id', id).eq('shop_id', sid);
      if (error) throw error;
      setCoupons(prev => prev.filter(c => c.id !== id));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // ── Reports ──────────────────────────────────────────────────────────────────

  const fetchFinancialReport = async (startDate: string, endDate: string) => {
    try {
      const sid = ensureShopId();
      const { data: appointments } = await supabase
        .from('appointments')
        .select('total_value, status, date, payment_method, professional_id')
        .eq('shop_id', sid)
        .gte('date', startDate)
        .lte('date', endDate);

      const { data: movements } = await supabase
        .from('cash_flow_entries')
        .select('amount, type, category, created_at')
        .eq('shop_id', sid)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      return { appointments, movements };
    } catch (e) {
      console.error('Error fetching financial report:', e);
      return { appointments: [], movements: [] };
    }
  };

  return (
    <FinancialContext.Provider value={{ 
      cashSessions, cashFlowEntries, coupons, 
      openCashSession, closeCashSession, addCashMovement,
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
