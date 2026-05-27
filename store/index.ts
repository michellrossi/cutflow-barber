export { ShopProvider } from './ShopContext';
export { formatCurrencyBRL, sanitize, calculateTrialStatus } from './helpers';
export type { ShopRow, GoalRow, ProductRow } from './mappers';
export { useInventory, InventoryProvider } from './contexts/InventoryContext';
export { useFinancial, FinancialProvider } from './contexts/FinancialContext';
export { useAutomation, AutomationProvider } from './contexts/AutomationContext';
export { useCatalog, CatalogProvider } from './contexts/CatalogContext';
export { useClients, ClientProvider } from './contexts/ClientContext';
export { useAppointments, AppointmentProvider } from './contexts/AppointmentContext';
export { useSettings, SettingsProvider } from './contexts/SettingsContext';
export { useCashSession } from './useCashSession';

import { useShop as useShopBase } from './ShopContext';
import { useInventory } from './contexts/InventoryContext';
import { useFinancial } from './contexts/FinancialContext';
import { useAutomation } from './contexts/AutomationContext';
import { useCatalog } from './contexts/CatalogContext';
import { useClients } from './contexts/ClientContext';
import { useAppointments } from './contexts/AppointmentContext';
import { useSettings } from './contexts/SettingsContext';

// Hook combinado — substitui o useShop original para os componentes
export function useShop() {
  const shop = useShopBase();
  const inventory = useInventory();
  const financial = useFinancial();
  const automation = useAutomation();
  const catalog = useCatalog();
  const clients = useClients();
  const appointmentsCtx = useAppointments();
  const settingsCtx = useSettings();

  return { 
    ...shop, 
    ...inventory, 
    ...financial, 
    ...automation, 
    ...catalog, 
    ...clients,
    ...appointmentsCtx,
    ...settingsCtx,
    currentClient: clients.currentClient,
    clientSession: clients.clientSession,
    // Forçar fallbacks de array para evitar erros de runtime
    appointments: appointmentsCtx.appointments || [],
    professionals: catalog.professionals || [],
    services: catalog.services || [],
    products: inventory.products || [],
    clients: clients.clients || [],
    goals: inventory.goals || [],
    cashSessions: financial.cashSessions || [],
    cashFlowEntries: financial.cashFlowEntries || [],
    coupons: financial.coupons || [],
    messageTemplates: automation.messageTemplates || [],
    messageCategories: automation.messageCategories || [],
    automationTriggers: automation.automationTriggers || [],
    blockedSlots: catalog.blockedSlots || [],
    subscriptionPlans: clients.subscriptionPlans || [],
    clientSubscriptions: clients.clientSubscriptions || []
  };
}
