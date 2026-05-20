import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Service, Professional, BlockedSlot } from '../../types';
import { MutationResult } from '../types';
import { supabase } from '../../supabaseClient';
import { 
    mapService, mapProfessional, mapBlockedSlot,
    type ServiceRow, type ProfessionalRow, type BlockedSlotRow
} from '../mappers';

interface CatalogContextType {
  services: Service[];
  professionals: Professional[];
  blockedSlots: BlockedSlot[];
  
  // Service Actions
  addService: (service: Omit<Service, 'id' | 'shopId'>) => MutationResult<Service>;
  updateService: (id: string, service: Partial<Service>) => MutationResult<Service>;
  removeService: (id: string) => MutationResult;
  
  // Professional Actions
  addProfessional: (professional: Omit<Professional, 'id' | 'shopId'>) => MutationResult<Professional>;
  updateProfessional: (id: string, professional: Partial<Professional>) => MutationResult<Professional>;
  removeProfessional: (id: string) => MutationResult;
  
  // Blocked Slots Actions
  addBlockedSlot: (block: Omit<BlockedSlot, 'id' | 'shopId'>) => MutationResult<BlockedSlot>;
  removeBlockedSlot: (id: string) => MutationResult;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ shopId: string; children: ReactNode }> = ({ shopId, children }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

  const loadData = async () => {
    if (!shopId) return;
    try {
      const [servicesRes, prosRes, blocksRes] = await Promise.all([
        supabase.from('services').select('*').eq('shop_id', shopId).order('name'),
        supabase.from('professionals').select('*').eq('shop_id', shopId),
        supabase.from('blocked_slots').select('*').eq('shop_id', shopId)
      ]);

      if (servicesRes.data) setServices(servicesRes.data.map(mapService));
      if (prosRes.data) setProfessionals(prosRes.data.map((p, i) => mapProfessional(p, i)));
      if (blocksRes.data) setBlockedSlots(blocksRes.data.map(mapBlockedSlot));
    } catch (e) {
      console.error('Error loading catalog data:', e);
    }
  };

  useEffect(() => {
    if (shopId) loadData();
    else {
      setServices([]);
      setProfessionals([]);
      setBlockedSlots([]);
    }
  }, [shopId]);

  const ensureShopId = () => {
    if (!shopId) throw new Error("ID da barbearia não encontrado.");
    return shopId;
  };

  // ── Service Actions ──────────────────────────────────────────────────────────

  const addService = async (service: Omit<Service, 'id' | 'shopId'>): MutationResult<Service> => {
    try {
      const sid = ensureShopId();

      const isDuplicate = services.some(s => s.name.trim().toLowerCase() === service.name.trim().toLowerCase());
      if (isDuplicate) {
        return { success: false, error: 'Já existe um serviço cadastrado com este nome.' };
      }

      const { data, error } = await supabase.from('services').insert({
        shop_id: sid,
        name: service.name,
        duration: service.duration,
        price: service.price,
        description: service.description,
        category: service.category,
        image_url: service.imageUrl || null
      }).select().single();

      if (error) throw error;
      const newS = mapService(data);
      setServices(prev => [...prev, newS].sort((a, b) => a.name.localeCompare(b.name)));
      return { success: true, data: newS };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao adicionar serviço';
      return { success: false, error: message };
    }
  };

  const updateService = async (id: string, service: Partial<Service>): MutationResult<Service> => {
    try {
      const sid = ensureShopId();

      if (service.name) {
        const isDuplicate = services.some(s => s.id !== id && s.name.trim().toLowerCase() === service.name!.trim().toLowerCase());
        if (isDuplicate) {
          return { success: false, error: 'Já existe um outro serviço cadastrado com este nome.' };
        }
      }

      const { data, error } = await supabase.from('services').update({
        name: service.name,
        duration: service.duration,
        price: service.price,
        description: service.description,
        category: service.category,
        image_url: service.imageUrl || null
      }).eq('id', id).eq('shop_id', sid).select().single();

      if (error) throw error;
      const updated = mapService(data);
      setServices(prev => prev.map(s => s.id === id ? updated : s).sort((a, b) => a.name.localeCompare(b.name)));
      return { success: true, data: updated };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao atualizar serviço';
      return { success: false, error: message };
    }
  };

  const removeService = async (id: string): MutationResult => {
    try {
      const sid = ensureShopId();
      const { error } = await supabase.from('services').delete().eq('id', id).eq('shop_id', sid);
      if (error) throw error;
      setServices(prev => prev.filter(s => s.id !== id));
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao remover serviço';
      return { success: false, error: message };
    }
  };

  // ── Professional Actions ─────────────────────────────────────────────────────

  const addProfessional = async (professional: Omit<Professional, 'id' | 'shopId'>): MutationResult<Professional> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('professionals').insert({
        shop_id: sid,
        name: professional.name,
        role: professional.role,
        photo_url: professional.photoUrl,
        commission_percentage: professional.commissionPercentage,
        work_schedule: professional.workSchedule,
        email: professional.email,
        phone: professional.phone,
        color: professional.color
      }).select().single();

      if (error) throw error;
      const newP = mapProfessional(data, professionals.length);
      setProfessionals(prev => [...prev, newP]);
      return { success: true, data: newP };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao adicionar profissional';
      return { success: false, error: message };
    }
  };

  const updateProfessional = async (id: string, professional: Partial<Professional>): MutationResult<Professional> => {
    try {
      const sid = ensureShopId();
      const payload: Partial<ProfessionalRow> = { ...professional } as any; // Cast temporário para resolver mismatch de campos virtuais vs DB
      if (payload.photo_url) {
          payload.photo_url = professional.photoUrl;
      }
      if (payload.work_schedule) {
          payload.work_schedule = professional.workSchedule;
      }

      const { data, error } = await supabase.from('professionals').update(payload).eq('id', id).eq('shop_id', sid).select().single();
      if (error) throw error;

      const updated = mapProfessional(data, professionals.findIndex(p => p.id === id));
      setProfessionals(prev => prev.map(p => p.id === id ? updated : p));
      return { success: true, data: updated };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao atualizar profissional';
      return { success: false, error: message };
    }
  };

  const removeProfessional = async (id: string): MutationResult => {
    try {
      const sid = ensureShopId();
      const { error } = await supabase.from('professionals').delete().eq('id', id).eq('shop_id', sid);
      if (error) throw error;
      setProfessionals(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao remover profissional';
      return { success: false, error: message };
    }
  };

  // ── Blocked Slots Actions ────────────────────────────────────────────────────

  const addBlockedSlot = async (block: Omit<BlockedSlot, 'id' | 'shopId'>): MutationResult<BlockedSlot> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('blocked_slots').insert({
        shop_id: sid,
        professional_id: block.professionalId,
        date: block.date,
        start_time: block.startTime,
        end_time: block.endTime,
        reason: block.reason
      }).select().single();

      if (error) throw error;
      const newB = mapBlockedSlot(data);
      setBlockedSlots(prev => [...prev, newB]);
      return { success: true, data: newB };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao bloquear horário';
      return { success: false, error: message };
    }
  };

  const removeBlockedSlot = async (id: string): MutationResult => {
    try {
      const sid = ensureShopId();
      const { error } = await supabase.from('blocked_slots').delete().eq('id', id).eq('shop_id', sid);
      if (error) throw error;
      setBlockedSlots(prev => prev.filter(b => b.id !== id));
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao remover bloqueio';
      return { success: false, error: message };
    }
  };

  return (
    <CatalogContext.Provider value={{ 
      services, professionals, blockedSlots,
      addService, updateService, removeService,
      addProfessional, updateProfessional, removeProfessional,
      addBlockedSlot, removeBlockedSlot
    }}>
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useCatalog must be used within a CatalogProvider");
  return context;
};
