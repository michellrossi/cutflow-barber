import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Goal } from '../../types';
import { supabase } from '../../supabaseClient';
import { mapProduct, mapGoal, type ProductRow, type GoalRow } from '../mappers';
import type { MutationResult } from '../types';

// ── Tipos do contexto ──────────────────────────────────────────────────────────
interface InventoryState {
  products: Product[];
  goals: Goal[];
}

interface InventoryContextType extends InventoryState {
  addProduct: (p: Omit<Product, 'id' | 'shopId' | 'createdAt'>) => MutationResult;
  updateProduct: (id: string, p: Partial<Product>) => MutationResult;
  removeProduct: (id: string) => MutationResult;
  restockProduct: (id: string, qty: number, cost: number) => MutationResult;
  addAppointmentProducts: (aptId: string, products: { productId: string; quantity: number; unitPrice: number }[]) => MutationResult;
  upsertGoal: (goal: Partial<Goal> & { name: string; category: string; targetValue: number; period: string; startDate: string; endDate: string }) => MutationResult;
  removeGoal: (id: string) => MutationResult;
  calculateGoalProgress: (goal: Goal) => { percentage: number; remaining: number; status: 'critical' | 'warning' | 'good' };
}

// ── Contexto ──────────────────────────────────────────────────────────────────
const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────
export const InventoryProvider: React.FC<{ shopId: string; children: ReactNode }> = ({ shopId, children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Carrega dados do domínio
  const load = async () => {
    if (!shopId) return;
    const [prodRes, goalsRes] = await Promise.all([
      supabase.from('products').select('*').eq('shop_id', shopId).order('name'),
      supabase.from('goals').select('*').eq('shop_id', shopId),
    ]);
    if (prodRes.data)  setProducts(prodRes.data.map(mapProduct));
    if (goalsRes.data) setGoals(goalsRes.data.map(mapGoal));
  };

  useEffect(() => { if (shopId) load(); }, [shopId]);

  // Realtime — apenas tabelas deste domínio
  useEffect(() => {
    if (!shopId) return;
    const ch = supabase.channel(`inventory_${shopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `shop_id=eq.${shopId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
              setProducts(prev => prev.filter(p => p.id !== (payload.old as any).id));
          } else if (payload.eventType === 'INSERT') {
              setProducts(prev => [...prev, mapProduct(payload.new as ProductRow)].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
              setProducts(prev => prev.map(p => p.id === (payload.new as ProductRow).id ? mapProduct(payload.new as ProductRow) : p));
          }
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `shop_id=eq.${shopId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setGoals(prev => prev.filter(g => g.id !== (payload.old as any).id));
          } else {
            const updated = mapGoal(payload.new as GoalRow);
            setGoals(prev => {
              const exists = prev.some(g => g.id === updated.id);
              return exists ? prev.map(g => g.id === updated.id ? updated : g) : [...prev, updated];
            });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shopId]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const addProduct = async (product: Omit<Product, 'id' | 'shopId' | 'createdAt'>): MutationResult => {
    try {
        if (!shopId) throw new Error("Loja não identificada");
        const { data, error } = await supabase.from('products').insert({
            shop_id: shopId,
            name: product.name,
            category: product.category,
            cost_price: product.costPrice,
            sale_price: product.salePrice,
            current_stock: product.currentStock,
            initial_stock: product.initialStock || product.currentStock,
            min_stock: product.minStock
        }).select().single();

        if (error) throw error;
        const newProduct = mapProduct(data);
        setProducts(prev => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
        return { success: true, data: newProduct };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const updateProduct = async (id: string, product: Partial<Product>): MutationResult => {
    try {
        if (!shopId) throw new Error("Loja não identificada");
        const payload: any = {};
        if (product.name) payload.name = product.name;
        if (product.category) payload.category = product.category;
        if (product.costPrice !== undefined) payload.cost_price = product.costPrice;
        if (product.salePrice !== undefined) payload.sale_price = product.salePrice;
        if (product.currentStock !== undefined) payload.current_stock = product.currentStock;
        if (product.initialStock !== undefined) payload.initial_stock = product.initialStock;
        if (product.minStock !== undefined) payload.min_stock = product.minStock;

        const { data, error } = await supabase.from('products').update(payload).eq('id', id).eq('shop_id', shopId).select().single();
        if (error) throw error;

        const updated = mapProduct(data);
        setProducts(prev => prev.map(p => p.id === id ? updated : p));
        return { success: true, data: updated };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const removeProduct = async (id: string): MutationResult => {
    try {
        if (!shopId) throw new Error("Loja não identificada");
        const { error } = await supabase.from('products').delete().eq('id', id).eq('shop_id', shopId);
        if (error) throw error;
        setProducts(prev => prev.filter(p => p.id !== id));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const restockProduct = async (productId: string, addedQuantity: number, newUnitCost: number): MutationResult => {
    try {
        if (!shopId) throw new Error("Loja não identificada");
        const { data: p, error: fetchErr } = await supabase
            .from('products')
            .select('current_stock, initial_stock, cost_price')
            .eq('id', productId)
            .single();

        if (fetchErr) throw fetchErr;

        const currentStock = Number(p.current_stock) || 0;
        const currentCost = Number(p.cost_price) || 0;

        const newTotalStock = currentStock + addedQuantity;
        let newAverageCost = currentCost;

        if (newTotalStock > 0) {
            const totalCurrentValue = currentStock * currentCost;
            const totalNewValue = addedQuantity * newUnitCost;
            newAverageCost = (totalCurrentValue + totalNewValue) / newTotalStock;
        }

        newAverageCost = Math.round(newAverageCost * 100) / 100;

        const { error: updateErr } = await supabase
            .from('products')
            .update({
                current_stock: newTotalStock,
                initial_stock: (Number(p.initial_stock) || 0) + addedQuantity,
                cost_price: newAverageCost
            })
            .eq('id', productId);

        if (updateErr) throw updateErr;

        setProducts(prev => prev.map(prod =>
            prod.id === productId
                ? { ...prod, currentStock: newTotalStock, initialStock: (prod.initialStock || 0) + addedQuantity, costPrice: newAverageCost }
                : prod
        ));

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const addAppointmentProducts = async (appointmentId: string, products: { productId: string, quantity: number, unitPrice: number }[]): MutationResult => {
    try {
        const grouped = new Map<string, { productId: string; quantity: number; unitPrice: number }>();
        for (const p of products) {
            if (!p?.productId) continue;
            const qty = Number(p.quantity) || 0;
            if (qty <= 0) continue;
            const price = Number(p.unitPrice) || 0;
            const existing = grouped.get(p.productId);
            if (existing) {
                existing.quantity += qty;
                existing.unitPrice = price;
            } else {
                grouped.set(p.productId, { productId: p.productId, quantity: qty, unitPrice: price });
            }
        }

        const rows = Array.from(grouped.values()).map(p => ({
            appointment_id: appointmentId,
            product_id: p.productId,
            quantity: p.quantity,
            unit_price: p.unitPrice,
        }));

        if (rows.length === 0) return { success: true };

        await supabase.from('appointment_products').delete().eq('appointment_id', appointmentId);
        const { error } = await supabase.from('appointment_products').insert(rows);
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const upsertGoal = async (goal: Partial<Goal> & { name: string; category: string; targetValue: number; period: string; startDate: string; endDate: string }): MutationResult => {
    try {
        if (!shopId) throw new Error("Loja não identificada");
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
            const { data, error } = await supabase
                .from('goals').update(payload)
                .eq('id', goal.id).eq('shop_id', shopId)
                .select().single();
            if (error) throw error;
            updatedGoal = mapGoal(data);
        } else {
            const { data: inserted, error: insertError } = await supabase
                .from('goals').insert(payload).select('id').single();
            if (insertError) throw insertError;

            const { data: fresh, error: fetchError } = await supabase
                .from('goals').select('*').eq('id', inserted.id).single();
            if (fetchError) throw fetchError;
            updatedGoal = mapGoal(fresh);
        }

        setGoals(prev => {
            const exists = prev.some(g => g.id === updatedGoal.id);
            return exists ? prev.map(g => g.id === updatedGoal.id ? updatedGoal : g) : [...prev, updatedGoal];
        });
        return { success: true, data: updatedGoal };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const removeGoal = async (id: string): MutationResult => {
    try {
        if (!shopId) throw new Error("Loja não identificada");
        const { error } = await supabase.from('goals').delete().eq('id', id).eq('shop_id', shopId);
        if (error) throw error;
        setGoals(prev => prev.filter(g => g.id !== id));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
  };

  const calculateGoalProgress = (goal: Goal) => {
    const currentValue = Number(goal.currentValue) || 0;
    const targetValue = Number(goal.targetValue) || 0;
    const percentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;
    const remaining = Math.max(0, targetValue - currentValue);

    let status: 'critical' | 'warning' | 'good' = 'critical';
    if (percentage >= 100) status = 'good';
    else if (percentage >= 50) status = 'warning';

    return { percentage, remaining, status };
  };

  return (
    <InventoryContext.Provider value={{ products, goals, addProduct, updateProduct, removeProduct, restockProduct, addAppointmentProducts, upsertGoal, removeGoal, calculateGoalProgress }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory deve ser usado dentro de InventoryProvider');
  return ctx;
};
