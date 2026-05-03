export { ShopProvider } from './ShopContext';
export { formatCurrencyBRL, sanitize, calculateTrialStatus } from './helpers';
export type { ShopRow, GoalRow, ProductRow } from './mappers';
export { useInventory, InventoryProvider } from './contexts/InventoryContext';
export { useFinancial, FinancialProvider } from './contexts/FinancialContext';
export { useAutomation, AutomationProvider } from './contexts/AutomationContext';
export { useCatalog, CatalogProvider } from './contexts/CatalogContext';

import { useShop as useShopBase } from './ShopContext';
import { useInventory } from './contexts/InventoryContext';
import { useFinancial } from './contexts/FinancialContext';
import { useAutomation } from './contexts/AutomationContext';
import { useCatalog } from './contexts/CatalogContext';

// Hook combinado — substitui o useShop original para os componentes
export function useShop() {
  const shop = useShopBase();
  const inventory = useInventory();
  const financial = useFinancial();
  const automation = useAutomation();
  const catalog = useCatalog();
  return { ...shop, ...inventory, ...financial, ...automation, ...catalog };
}
