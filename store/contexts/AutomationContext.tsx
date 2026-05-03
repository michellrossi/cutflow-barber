import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { MessageTemplate, MessageCategory, AutomationTrigger } from '../../types';
import { MutationResult } from '../types';
import { supabase } from '../../supabaseClient';
import { mapMessageTemplate, mapMessageCategory, mapAutomationTrigger } from '../mappers';

interface AutomationContextType {
  messageTemplates: MessageTemplate[];
  messageCategories: MessageCategory[];
  automationTriggers: AutomationTrigger[];
  botPausedCount: number;
  
  // Template Actions
  addMessageTemplate: (template: Omit<MessageTemplate, 'id' | 'shopId'>) => MutationResult<MessageTemplate>;
  updateMessageTemplate: (id: string, template: Partial<MessageTemplate>) => MutationResult<MessageTemplate>;
  removeMessageTemplate: (id: string) => MutationResult;
  
  // Trigger Actions
  addAutomationTrigger: (trigger: Omit<AutomationTrigger, 'id' | 'shopId'>) => MutationResult<AutomationTrigger>;
  updateAutomationTrigger: (id: string, trigger: Partial<AutomationTrigger>) => MutationResult<AutomationTrigger>;
  removeAutomationTrigger: (id: string) => MutationResult;

  // Category Actions
  addMessageCategory: (name: string) => MutationResult<MessageCategory>;
  removeMessageCategory: (id: string) => MutationResult;
}

const AutomationContext = createContext<AutomationContextType | undefined>(undefined);

export const AutomationProvider: React.FC<{ shopId: string; children: ReactNode }> = ({ shopId, children }) => {
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [messageCategories, setMessageCategories] = useState<MessageCategory[]>([]);
  const [automationTriggers, setAutomationTriggers] = useState<AutomationTrigger[]>([]);
  const [botPausedCount, setBotPausedCount] = useState(0);

  const loadData = async () => {
    if (!shopId) return;
    try {
      const [templatesRes, categoriesRes, triggersRes, botRes] = await Promise.all([
        supabase.from('message_templates').select('*').eq('shop_id', shopId),
        supabase.from('message_categories').select('*').eq('shop_id', shopId),
        supabase.from('automation_triggers').select('*').eq('shop_id', shopId),
        supabase.from('whatsapp_chat_sessions').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('bot_paused', true)
      ]);

      if (templatesRes.data) setMessageTemplates(templatesRes.data.map(mapMessageTemplate));
      if (categoriesRes.data) setMessageCategories(categoriesRes.data.map(mapMessageCategory));
      if (triggersRes.data) setAutomationTriggers(triggersRes.data.map(mapAutomationTrigger));
      setBotPausedCount(botRes.count || 0);
    } catch (e) {
      console.error('Error loading automation data:', e);
    }
  };

  useEffect(() => {
    if (shopId) loadData();
    else {
      setMessageTemplates([]);
      setMessageCategories([]);
      setAutomationTriggers([]);
      setBotPausedCount(0);
    }
  }, [shopId]);

  const ensureShopId = () => {
    if (!shopId) throw new Error("ID da barbearia não encontrado.");
    return shopId;
  };

  // ── Template Actions ─────────────────────────────────────────────────────────

  const addMessageTemplate = async (template: Omit<MessageTemplate, 'id' | 'shopId'>): MutationResult<MessageTemplate> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('message_templates').insert({
        shop_id: sid,
        title: template.title,
        content: template.content,
        active: template.active,
        trigger_id: template.triggerId,
        category: template.category,
        target: template.target
      }).select().single();

      if (error) throw error;
      const newT = mapMessageTemplate(data);
      setMessageTemplates(prev => [...prev, newT]);
      return { success: true, data: newT };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação de automação';
      return { success: false, error: message };
    }
  };

  const updateMessageTemplate = async (id: string, template: Partial<MessageTemplate>): MutationResult<MessageTemplate> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('message_templates').update({
        title: template.title,
        content: template.content,
        active: template.active,
        trigger_id: template.triggerId,
        category: template.category,
        target: template.target
      }).eq('id', id).eq('shop_id', sid).select().single();

      if (error) throw error;
      const updated = mapMessageTemplate(data);
      setMessageTemplates(prev => prev.map(t => t.id === id ? updated : t));
      return { success: true, data: updated };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação de automação';
      return { success: false, error: message };
    }
  };

  const removeMessageTemplate = async (id: string): MutationResult => {
    try {
      const sid = ensureShopId();
      const { error } = await supabase.from('message_templates').delete().eq('id', id).eq('shop_id', sid);
      if (error) throw error;
      setMessageTemplates(prev => prev.filter(t => t.id !== id));
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação de automação';
      return { success: false, error: message };
    }
  };

  // ── Trigger Actions ──────────────────────────────────────────────────────────

  const addAutomationTrigger = async (trigger: Omit<AutomationTrigger, 'id' | 'shopId'>): MutationResult<AutomationTrigger> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('automation_triggers').insert({
        shop_id: sid,
        name: trigger.name,
        value: trigger.value,
        unit: trigger.unit,
        period: trigger.period,
        active: trigger.active
      }).select().single();

      if (error) throw error;
      const newTrig = mapAutomationTrigger(data);
      setAutomationTriggers(prev => [...prev, newTrig]);
      return { success: true, data: newTrig };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação de automação';
      return { success: false, error: message };
    }
  };

  const updateAutomationTrigger = async (id: string, trigger: Partial<AutomationTrigger>): MutationResult<AutomationTrigger> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('automation_triggers').update({
        name: trigger.name,
        value: trigger.value,
        unit: trigger.unit,
        period: trigger.period,
        active: trigger.active
      }).eq('id', id).eq('shop_id', sid).select().single();

      if (error) throw error;
      const updated = mapAutomationTrigger(data);
      setAutomationTriggers(prev => prev.map(t => t.id === id ? updated : t));
      return { success: true, data: updated };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação de automação';
      return { success: false, error: message };
    }
  };

  const removeAutomationTrigger = async (id: string): MutationResult => {
    try {
      const sid = ensureShopId();
      const { error } = await supabase.from('automation_triggers').delete().eq('id', id).eq('shop_id', sid);
      if (error) throw error;
      setAutomationTriggers(prev => prev.filter(t => t.id !== id));
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação de automação';
      return { success: false, error: message };
    }
  };

  // ── Category Actions ─────────────────────────────────────────────────────────

  const addMessageCategory = async (name: string): MutationResult<MessageCategory> => {
    try {
      const sid = ensureShopId();
      const { data, error } = await supabase.from('message_categories').insert({
        shop_id: sid,
        name: name
      }).select().single();

      if (error) throw error;
      const newCat = mapMessageCategory(data);
      setMessageCategories(prev => [...prev, newCat]);
      return { success: true, data: newCat };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação de automação';
      return { success: false, error: message };
    }
  };

  const removeMessageCategory = async (id: string): MutationResult => {
    try {
      const sid = ensureShopId();
      const { error } = await supabase.from('message_categories').delete().eq('id', id).eq('shop_id', sid);
      if (error) throw error;
      setMessageCategories(prev => prev.filter(c => c.id !== id));
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro na operação de automação';
      return { success: false, error: message };
    }
  };

  return (
    <AutomationContext.Provider value={{ 
      messageTemplates, messageCategories, automationTriggers, botPausedCount,
      addMessageTemplate, updateMessageTemplate, removeMessageTemplate,
      addAutomationTrigger, updateAutomationTrigger, removeAutomationTrigger,
      addMessageCategory, removeMessageCategory
    }}>
      {children}
    </AutomationContext.Provider>
  );
};

export const useAutomation = () => {
  const context = useContext(AutomationContext);
  if (!context) throw new Error("useAutomation must be used within an AutomationProvider");
  return context;
};
