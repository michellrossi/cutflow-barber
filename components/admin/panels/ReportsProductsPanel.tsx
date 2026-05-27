import React, { useState, useEffect, useMemo } from 'react';
import { useShop } from '../../../store';
import { supabase } from '../../../supabaseClient';
import { 
  Package, DollarSign, TrendingUp, AlertTriangle, ShoppingBag,
  BarChart3, Award, Zap, Clock, ArrowUp, ArrowDown
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

interface Props { dateRange: string; }

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const BADGE_COLOR = (i: number) =>
  i === 0 ? 'bg-yellow-400 text-yellow-900' :
  i === 1 ? 'bg-slate-400 text-white' :
  i === 2 ? 'bg-[#cd6133] text-white' : 'bg-slate-200 text-slate-700';

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KPI: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub?: string;
  accent?: string; bg?: string;
}> = ({ icon, label, value, sub, accent = 'text-slate-900', bg = 'bg-slate-50' }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
      <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">{label}</span>
    </div>
    <div className={`text-3xl font-black mb-1 leading-none ${accent}`}>{value}</div>
    {sub && <div className="text-xs text-slate-400 font-medium mt-1">{sub}</div>}
  </div>
);

// ── Alert Row ─────────────────────────────────────────────────────────────────
const AlertRow: React.FC<{
  icon: React.ReactNode; label: string; sub: string; chip: string; chipColor: string;
}> = ({ icon, label, sub, chip, chipColor }) => (
  <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-[#1E293B] text-sm truncate">{label}</p>
      <p className="text-[11px] text-slate-400 font-medium">{sub}</p>
    </div>
    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${chipColor}`}>{chip}</span>
  </div>
);

// ── Main Panel ────────────────────────────────────────────────────────────────
export const ReportsProductsPanel: React.FC<Props> = ({ dateRange }) => {
  const { products, fetchFinancialReport } = useShop();
  const [apptData, setApptData] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      let start = new Date(); let end = new Date();
      if (dateRange?.includes('|')) {
        const [s, e] = dateRange.split('|');
        start = new Date(s + 'T00:00:00'); end = new Date(e + 'T23:59:59');
      } else if (dateRange === '30 dias') start.setDate(start.getDate() - 30);
      else if (dateRange === 'Este mês') start.setDate(1);
      else if (dateRange === 'Mês passado') {
        start.setMonth(start.getMonth() - 1); start.setDate(1);
        end.setDate(0);
      } else if (dateRange === 'Semestre') start.setMonth(start.getMonth() - 6);
      else if (dateRange === 'Todo o período') start = new Date(2000, 0, 1);
      
      const data = await fetchFinancialReport(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
      const appointmentsList = data?.appointments || [];
      setApptData(appointmentsList);

      const completedAppts = appointmentsList.filter((a: any) => a.status === 'completed');
      if (completedAppts.length > 0) {
        const apptIds = completedAppts.map((a: any) => a.id);
        const { data: salesData, error } = await supabase
          .from('appointment_products')
          .select(`
            id,
            appointment_id,
            product_id,
            quantity,
            unit_price,
            products (
              name,
              category,
              cost_price
            )
          `)
          .in('appointment_id', apptIds);

        if (!error && salesData) {
          setProductSales(salesData);
        } else {
          console.error("Erro ao buscar vendas de produtos:", error);
          setProductSales([]);
        }
      } else {
        setProductSales([]);
      }
    };
    load();
  }, [dateRange, fetchFinancialReport]);

  // ── Derivações ──────────────────────────────────────────────────────────────
  const productsList = Array.isArray(products) ? products : [];

  // 1. Capital Parado em Estoque (Card 3)
  const capitalParadoEstoque = useMemo(() => 
    productsList.reduce((s, p) => s + (p.costPrice || 0) * (p.currentStock || 0), 0), 
    [productsList]
  );

  // 2. Faturamento Realizado em Produtos (Card 1)
  const fatRealizadoProdutos = useMemo(() => 
    productSales.reduce((s, sale) => s + (sale.quantity || 0) * (sale.unit_price || 0), 0), 
    [productSales]
  );

  // 3. Lucro Real em Produtos (Card 2)
  const lucroRealProdutos = useMemo(() => 
    productSales.reduce((s, sale) => {
      const cost = sale.products?.cost_price || 0;
      const price = sale.unit_price || 0;
      const qty = sale.quantity || 0;
      return s + qty * (price - cost);
    }, 0), 
    [productSales]
  );

  // 4. Faturamento por Categoria
  const categoryChartData = useMemo(() => {
    const categoriesMap: { [cat: string]: number } = {};
    productSales.forEach(sale => {
      const cat = sale.products?.category || 'Geral';
      const saleVal = (sale.quantity || 0) * (sale.unit_price || 0);
      categoriesMap[cat] = (categoriesMap[cat] || 0) + saleVal;
    });
    
    return Object.entries(categoriesMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [productSales]);

  // 5. Top 5 Produtos mais Vendidos (por quantidade)
  const topProductsChartData = useMemo(() => {
    const productsMap: { [prodId: string]: { name: string, qty: number, revenue: number } } = {};
    productSales.forEach(sale => {
      const prodId = sale.product_id;
      const name = sale.products?.name || 'Produto Removido';
      const qty = sale.quantity || 0;
      const revenue = (sale.quantity || 0) * (sale.unit_price || 0);
      
      if (!productsMap[prodId]) {
        productsMap[prodId] = { name, qty: 0, revenue: 0 };
      }
      productsMap[prodId].qty += qty;
      productsMap[prodId].revenue += revenue;
    });
    
    return Object.values(productsMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map(p => ({
        name: p.name.length > 15 ? p.name.slice(0, 15) + '…' : p.name,
        Quantidade: p.qty,
        Faturamento: p.revenue
      }));
  }, [productSales]);

  // ── Alertas de estoque ──────────────────────────────────────────────────────
  const criticos = useMemo(() =>
    productsList.filter(p => p.currentStock <= p.minStock)
      .sort((a, b) => a.currentStock - b.currentStock),
    [productsList]);

  // ── Produtos sem giro (estoque > 0 e zero vendas no período) ─────────────────
  const produtosSemGiro = useMemo(() => {
    const soldProductIds = new Set(productSales.map(sale => sale.product_id));
    return productsList
      .filter(p => p.currentStock > 0 && !soldProductIds.has(p.id))
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 5);
  return (
    <div className="space-y-8">
      {/* ── Topo: 3 Cards KPI ──────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <KPI icon={<ShoppingBag size={18} className="text-[#F16A1B]" />}
               label="Faturamento Real em Produtos" value={fmt(fatRealizadoProdutos)} sub="Vendas reais no período"
               accent="text-[#F16A1B]" bg="bg-orange-50" />
          <KPI icon={<Award size={18} className="text-emerald-600" />}
               label="Lucro Real em Produtos" value={fmt(lucroRealProdutos)} sub="Faturamento real - Custo"
               accent="text-emerald-700" bg="bg-emerald-50" />
          <KPI icon={<Package size={18} className="text-slate-600" />}
               label="Capital Parado em Estoque" value={fmt(capitalParadoEstoque)} sub="Custo x Estoque atual"
               accent="text-slate-800" bg="bg-slate-50" />
        </div>
      </section>

      {/* ── Meio: Gráficos de Vendas ─────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Faturamento por Categoria */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-[#1E293B] flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-[#F16A1B]" /> Faturamento por Categoria
          </h4>
          {categoryChartData.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
              Sem dados de vendas disponíveis no período
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={v => fmt(v)} width={70} />
                  <Tooltip formatter={(v: any) => [fmt(Number(v)), 'Faturamento']} labelClassName="font-bold" />
                  <Bar dataKey="value" fill="#F16A1B" radius={[4, 4, 0, 0]}>
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#F16A1B' : '#ea580c'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Gráfico 2: Top 5 Produtos mais vendidos */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-[#1E293B] flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[#F16A1B]" /> Top 5 Produtos Mais Vendidos
          </h4>
          {topProductsChartData.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
              Sem dados de vendas disponíveis no período
            </div>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsChartData} margin={{ left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={30} />
                  <Tooltip formatter={(v: any, name: string) => [v, name]} labelClassName="font-bold" />
                  <Bar dataKey="Quantidade" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {topProductsChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#1d4ed8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* ── Base: Duas Colunas de Ação ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estoque Crítico */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-[#1E293B] mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" /> Alerta de Estoque Crítico (Comprar)
          </h4>
          <div className="space-y-1">
            {criticos.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">✅ Todos os produtos estão dentro do estoque mínimo</div>
            ) : criticos.map(p => (
              <AlertRow key={p.id}
                icon={<Package size={16} className="text-red-500" />}
                label={p.name}
                sub={`Categoria: ${p.category} • Estoque Mín: ${p.minStock}`}
                chip={p.currentStock === 0 ? 'SEM ESTOQUE' : `${p.currentStock} un.`}
                chipColor={p.currentStock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} />
            ))}
          </div>
        </div>

        {/* Produtos sem giro */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-[#1E293B] mb-4 flex items-center gap-2">
            <Clock size={18} className="text-slate-500" /> Produtos Sem Giro (Promover)
          </h4>
          <div className="space-y-1">
            {produtosSemGiro.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Nenhum produto parado no estoque</div>
            ) : produtosSemGiro.map(p => (
              <AlertRow key={p.id}
                icon={<Package size={16} className="text-slate-400" />}
                label={p.name}
                sub={`Categoria: ${p.category} • Preço de Venda: ${fmt(p.salePrice)}`}
                chip={`${p.currentStock} un.`}
                chipColor="bg-slate-100 text-slate-600" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
