import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ShopSettings } from '../../types';
import { MutationResult } from '../types';
import { supabase } from '../../supabaseClient';
import { mapSettings } from '../mappers';
import { DEFAULT_SETTINGS } from '../helpers';

interface SettingsContextType {
  settings: ShopSettings;
  updateSettings: (settings: Partial<ShopSettings>) => MutationResult;
  getWhatsAppQRCode: () => Promise<{ qrcode?: string; connected?: boolean; error?: string }>;
  getWhatsAppStatus: () => Promise<{ connected: boolean; error?: string }>;
  disconnectWhatsApp: () => Promise<{ success: boolean; error?: string }>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ shopId: string; children: ReactNode }> = ({ shopId, children }) => {
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const loadSettings = async () => {
      if (!shopId) return;
      const { data } = await supabase.from('settings').select('*').eq('shop_id', shopId).single();
      if (data) setSettings(mapSettings(data));
      else setSettings({ ...DEFAULT_SETTINGS, shopId });
    };

    loadSettings();
  }, [shopId]);

  const updateSettings = async (newSettings: Partial<ShopSettings>): MutationResult => {
    try {
      if (!shopId) throw new Error("Loja não identificada.");
      setSettings(prev => ({ ...prev, ...newSettings }));
      const { error } = await supabase.from('settings').update(newSettings).eq('shop_id', shopId);
      if (error) throw error;
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao atualizar configurações';
      return { success: false, error: message };
    }
  };

  const getWhatsAppQRCode = async () => {
    try {
      const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : `https://${window.location.hostname}`;

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${serverUrl}/api/whatsapp/qrcode`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ shopId })
      });
      return await res.json();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao gerar QR Code';
      return { error: message };
    }
  };

  const getWhatsAppStatus = async () => {
    try {
      const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : `https://${window.location.hostname}`;

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${serverUrl}/api/whatsapp/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ shopId })
      });
      return await res.json();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao verificar status';
      return { connected: false, error: message };
    }
  };

  const disconnectWhatsApp = async () => {
    try {
      const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : `https://${window.location.hostname}`;

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(`${serverUrl}/api/whatsapp/disconnect`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ shopId })
      });
      if (res.ok) return { success: true };
      const data = await res.json();
      return { success: false, error: data.error };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao desconectar';
      return { success: false, error: message };
    }
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      getWhatsAppQRCode,
      getWhatsAppStatus,
      disconnectWhatsApp
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
