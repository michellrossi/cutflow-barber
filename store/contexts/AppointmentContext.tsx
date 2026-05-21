import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appointment, Client } from '../../types';
import { MutationResult } from '../types';
import { supabase, getSupabaseClient } from '../../supabaseClient';
import { mapAppointment } from '../mappers';
import { sanitize } from '../helpers';
import { useClients } from './ClientContext';

interface AppointmentContextType {
  appointments: Appointment[];
  reloadAppointments: (sid: string) => Promise<void>;
  addAppointment: (apt: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>) => MutationResult<unknown>;
  createManualAppointment: (apt: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>) => MutationResult;
  updateAppointmentStatus: (id: string, status: Appointment['status'], client?: Client) => MutationResult;
  updateAppointmentTotalValue: (id: string, newTotal: number) => MutationResult;
  updateAppointmentPaymentMethod: (id: string, paymentMethod: string, usedSubscriptionId?: string) => MutationResult;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export const AppointmentProvider: React.FC<{ shopId: string; children: ReactNode }> = ({ shopId, children }) => {
  const { clientSession } = useClients();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const APPT_WINDOW_DAYS = 90;

  const reloadAppointments = async (sid: string) => {
    if (!sid) return;
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - APPT_WINDOW_DAYS);
    const dateLimitStr = pastDate.toISOString().split('T')[0];

    const clientSupabase = getSupabaseClient(clientSession?.token || undefined);

    const { data: appts } = await clientSupabase
      .from('appointments')
      .select('*')
      .eq('shop_id', sid)
      .gte('date', dateLimitStr)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (appts) {
      setAppointments(appts.map(mapAppointment));
    }
  };

  useEffect(() => {
    if (shopId) {
      reloadAppointments(shopId);
      
      const channel = supabase.channel(`appts_${shopId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'appointments',
          filter: `shop_id=eq.${shopId}` 
        }, () => { 
          reloadAppointments(shopId); 
        })
        .subscribe();
      
      return () => { supabase.removeChannel(channel); };
    } else {
      setAppointments([]);
    }
  }, [shopId, clientSession?.token]);

  const ensureClientExists = async (sid: string, name: string, phone: string, birthDate?: string) => {
    await supabase.from('clients').upsert({
      shop_id: sid,
      name,
      phone,
      birth_date: birthDate
    }, { onConflict: 'shop_id,phone', ignoreDuplicates: true });
  };

  const addAppointment = async (apt: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>): MutationResult<unknown> => {
    try {
      if (!shopId) throw new Error("Loja não identificada.");
      const cleanClientName = sanitize(apt.clientName);
      const cleanClientPhone = sanitize(apt.clientPhone);
      const professionalId = apt.professionalId || null;

      const { data, error } = await supabase.rpc('book_appointment', {
        p_shop_id: shopId,
        p_client_name: cleanClientName,
        p_client_phone: cleanClientPhone,
        p_service_ids: apt.serviceIds,
        p_professional_id: professionalId,
        p_date: apt.date,
        p_time: apt.time,
        p_total_value: apt.totalValue,
        p_coupon_code: apt.couponCode ? sanitize(apt.couponCode) : null,
        p_client_id: (apt as unknown as any).clientId || null
      });

      if (error) return { success: false, error: error.message };
      if (data?.status === 'error' || data?.status === 'conflict') return { success: false, error: data.message };

      await ensureClientExists(shopId, cleanClientName, cleanClientPhone, apt.clientBirthDate);
      await reloadAppointments(shopId);

      // Notificação de confirmação
      const { data: latestApt } = await supabase
        .from('appointments')
        .select('id')
        .eq('client_phone', cleanClientPhone)
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestApt?.id) {
        fetch('/api/notify/confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ appointmentId: latestApt.id }),
        }).catch(() => {});
      }

      return { success: true, data: latestApt };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao adicionar agendamento';
      return { success: false, error: message };
    }
  };

  const createManualAppointment = async (apt: Omit<Appointment, 'id' | 'createdAt' | 'shopId'>): MutationResult => {
    try {
      if (!shopId) throw new Error("Loja não identificada.");
      const cleanClientName = sanitize(apt.clientName);
      const cleanClientPhone = sanitize(apt.clientPhone);

      const { data, error } = await supabase.from('appointments').insert({
        shop_id: shopId,
        client_name: cleanClientName,
        client_phone: cleanClientPhone,
        service_ids: apt.serviceIds,
        professional_id: apt.professionalId || null,
        date: apt.date,
        time: apt.time,
        total_value: apt.totalValue,
        used_subscription_id: apt.usedSubscriptionId,
        status: apt.status || 'confirmed',
        payment_method: apt.paymentMethod
      }).select().single();

      if (error) throw error;
      await ensureClientExists(shopId, cleanClientName, cleanClientPhone, apt.clientBirthDate);
      
      const newApt = mapAppointment(data);
      setAppointments(prev => [newApt, ...prev]);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        fetch('/api/notify/confirmation-client', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ appointmentId: data.id }),
        }).catch(() => {});
      }

      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao criar agendamento manual';
      return { success: false, error: message };
    }
  };

  const updateAppointmentStatus = async (id: string, status: Appointment['status']): MutationResult => {
    try {
      const appointment = appointments.find(a => a.id === id);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));

      const { error } = await supabase.from('appointments').update({ status }).eq('id', id);
      if (error) {
        await reloadAppointments(shopId);
        throw error;
      }

      if (status === 'completed' && appointment?.usedSubscriptionId) {
        const { data: subData } = await supabase.from('client_subscriptions').select('services_used_this_month').eq('id', appointment.usedSubscriptionId).single();
        if (subData) {
          await supabase.from('client_subscriptions').update({
            services_used_this_month: (subData.services_used_this_month || 0) + 1
          }).eq('id', appointment.usedSubscriptionId);
        }
      }

      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao atualizar status';
      return { success: false, error: message };
    }
  };

  const updateAppointmentTotalValue = async (id: string, newTotal: number): MutationResult => {
    try {
      const rounded = Math.round(newTotal * 100) / 100;
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, totalValue: rounded } : a));
      const { error } = await supabase.from('appointments').update({ total_value: rounded }).eq('id', id);
      if (error) {
        await reloadAppointments(shopId);
        throw error;
      }
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao atualizar valor total';
      return { success: false, error: message };
    }
  };

  const updateAppointmentPaymentMethod = async (id: string, paymentMethod: string, usedSubscriptionId?: string): MutationResult => {
    try {
      setAppointments(prev => prev.map(a => a.id === id ? {
        ...a,
        paymentMethod: paymentMethod as Appointment['paymentMethod'],
        usedSubscriptionId: usedSubscriptionId || a.usedSubscriptionId
      } : a));

      const { error } = await supabase.from('appointments').update({
        payment_method: paymentMethod,
        used_subscription_id: usedSubscriptionId || null
      }).eq('id', id);

      if (error) {
        await reloadAppointments(shopId);
        throw error;
      }
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao atualizar método de pagamento';
      return { success: false, error: message };
    }
  };

  return (
    <AppointmentContext.Provider value={{
      appointments,
      reloadAppointments,
      addAppointment,
      createManualAppointment,
      updateAppointmentStatus,
      updateAppointmentTotalValue,
      updateAppointmentPaymentMethod
    }}>
      {children}
    </AppointmentContext.Provider>
  );
};

export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (!context) throw new Error('useAppointments must be used within an AppointmentProvider');
  return context;
};
