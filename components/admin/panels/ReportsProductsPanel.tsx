import React, { useState, useEffect, useMemo } from 'react';
import { useShop } from '../../../store';
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

// ── RankingCard (padrão /cutflow4) ────────────────────────────────────────────
const RankingCard: React.FC<{
  title: string; icon: React.ReactNode;
  items: { label: string; value: number; sub?: string; valueFmt?: string }[];
  emptyText?: string;
  mono?: boolean; // se true: valor é número puro (sem R$)
}> = ({ title, icon, items, emptyText = 'Sem dados', mono }) => {
  const maxVal = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
      <h3 className="text-base font-bold text-[#1E293B] mb-4 flex items-center gap-2">
        {icon} {title}
      </h3>
      <div className="flex flex-col divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">{emptyText}</div>
        ) : items.map((item, i) => (
          <div key={i} className="py-3.5 flex items-center gap-3 pr-1">
            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm ${BADGE_COLOR(i)}`}>
              {i + 1}º
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-[#1E293B] truncate text-sm">{item.label}</span>
                <span className="font-bold text-[#F16A1B] whitespace-nowrap ml-2 text-sm">
                  {item.valueFmt ?? (mono ? item.value : fmt(item.value))}
                </span>
              </div>
              <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#F16A1B] h-full rounded-full transition-all" style={{ width: `${(item.value / maxVal) * 100}%` }} />
              </div>
              {item.sub && <div className="text-[10px] text-slate-400 mt-1 text-right font-medium">{item.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KPI: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub?: string;
  accent?: string; bg?: string;
}> = ({ icon, label, value, sub, accent = 'text-[#F16A1B]', bg = 'bg-orange-50' }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
      <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">{label}</span>
    </div>
    <div className={`text-2xl font-black mb-1 ${accent}`}>{value}</div>
    {sub && <div className="text-xs text-slate-400 font-medium">{sub}</div>}
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
  const { products, appointments, fetchFinancialReport } = useShop();
  const [apptData, setApptData] = useState<any[]>([]);

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
      setApptData(data);
    };
    load();
  }, [dateRange, fetchFinancialReport]);

  // ── Derivações ──────────────────────────────────────────────────────────────
  const completedAppts = useMemo(() => apptData.filter(a => a.status === 'completed'), [apptData]);

  // appointment_products aggregation (usa products embutidos nos appointments)
  // Como a store carrega appointments sem products embutidos, vamos aproximar
  // usando os produtos e seus dados de estoque

  const valorEstoque  = useMemo(() => products.reduce((s, p) => s + p.costPrice  * p.currentStock, 0), [products]);
  const fatPotencial  = useMemo(() => products.reduce((s, p) => s + p.salePrice  * p.currentStock, 0), [products]);
  const lucroEstimado = useMemo(() => fatPotencial - valorEstoque, [fatPotencial, valorEstoque]);

  // Faturamento realizado de produtos: sum(ap.quantity * ap.unit_price)
  // sem endpoint separado, usamos o totalValue dos agendamentos como proxy
  const fatRealizado = useMemo(() => completedAppts.reduce((s, a) => s + (a.totalValue || 0), 0), [completedAppts]);

  // Ticket médio de produtos (faturamento / agendamentos com conclusão)
  const ticketMedio = useMemo(() =>
    completedAppts.length > 0 ? fatRealizado / completedAppts.length : 0,
    [fatRealizado, completedAppts]);

  // ── Alertas de estoque ──────────────────────────────────────────────────────
  const criticos = useMemo(() =>
    products.filter(p => p.currentStock <= p.minStock)
      .sort((a, b) => a.currentStock - b.currentStock),
    [products]);

  // ── Produtos sem giro (estoque alto, 0 vendas na simulação) ─────────────────
  const semGiro = useMemo(() =>
    products
      .filter(p => p.currentStock > p.minStock)
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 8),
    [products]);

  // ── Ranking de produtos por estoque vendável (faturamento potencial) ─────────
  const rankingPotencial = useMemo(() =>
    [...products]
      .map(p => ({ label: p.name, value: p.salePrice * p.currentStock, sub: `${p.currentStock} un. × ${fmt(p.salePrice)}` }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    [products]);

  // ── Ranking mais rentáveis (maior margem %) ─────────────────────────────────
  const rankingMargem = useMemo(() =>
    [...products]
      .filter(p => p.salePrice > 0)
      .map(p => {
        const margem = ((p.salePrice - p.costPrice) / p.salePrice) * 100;
        return { label: p.name, value: margem, sub: `Custo ${fmt(p.costPrice)} • Venda ${fmt(p.salePrice)}`, valueFmt: `${margem.toFixed(1)}%` };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    [products]);

  // ── Curva ABC ───────────────────────────────────────────────────────────────
  const abcData = useMemo(() => {
    if (rankingPotencial.length === 0) return [];
    const total = rankingPotencial.reduce((s, p) => s + p.value, 0);
    let acc = 0;
    return rankingPotencial.map(p => {
      acc += p.value;
      const pct = total > 0 ? (acc / total) * 100 : 0;
      const curve = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C';
      return { name: p.label.length > 12 ? p.label.slice(0, 12) + '…' : p.label, value: p.value, curve };
    });
  }, [rankingPotencial]);

  const ABC_COLOR = { A: '#ea580c', B: '#f59e0b', C: '#94a3b8' };

  return (
    <div className="space-y-8">
      {/* ── Valoração do Estoque ─────────────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Package size={16} className="text-orange-500" /> Valoração do Estoque
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <KPI icon={<DollarSign size={18} className="text-slate-600" />}
               label="Capital em Estoque" value={fmt(valorEstoque)} sub="Custo × Qtd atual"
               accent="text-slate-800" bg="bg-slate-50" />
          <KPI icon={<TrendingUp size={18} className="text-blue-600" />}
               label="Fat. Potencial" value={fmt(fatPotencial)} sub="Preço venda × Qtd"
               accent="text-blue-700" bg="bg-blue-50" />
          <KPI icon={<BarChart3 size={18} className="text-[#F16A1B]" />}
               label="Fat. Realizado (período)" value={fmt(fatRealizado)} sub="Agendamentos concluídos" />
          <KPI icon={<Award size={18} className="text-emerald-600" />}
               label="Lucro Estimado" value={fmt(lucroEstimado)} sub="Potencial − Capital"
               accent="text-emerald-700" bg="bg-emerald-50" />
        </div>
      </section>

      {/* ── Desempenho de Vendas ─────────────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap size={16} className="text-orange-500" /> Desempenho de Vendas
        </h3>
        <div className="grid grid-cols-1 gap-5 mb-5">
          <KPI icon={<ShoppingBag size={18} className="text-[#F16A1B]" />}
               label="Ticket Médio por Agendamento" value={fmt(ticketMedio)} sub={`Baseado em ${completedAppts.length} agendamentos concluídos`} />
        </div>

        {/* Curva ABC */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-[#1E293B] flex items-center gap-2">
              <BarChart3 size={18} className="text-orange-500" /> Curva ABC — Potencial de Faturamento
            </h4>
            <div className="flex gap-3 text-[11px] font-black">
              {(['A','B','C'] as const).map(c => (
                <span key={c} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: ABC_COLOR[c] }} />
                  Classe {c}
                </span>
              ))}
            </div>
          </div>
          {abcData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
              Sem dados disponíveis
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={abcData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} width={70} />
                  <Tooltip formatter={(v: any) => fmt(Number(v))} />
                  <Bar dataKey="value" radius={[4,4,0,0]}>
                    {abcData.map((entry, i) => (
                      <Cell key={i} fill={ABC_COLOR[entry.curve as keyof typeof ABC_COLOR]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RankingCard title="Top Produtos — Faturamento Potencial"
            icon={<TrendingUp size={18} className="text-[#1E293B]" />}
            items={rankingPotencial.slice(0, 5)} />
          <RankingCard title="Top Produtos — Maior Margem"
            icon={<Award size={18} className="text-[#1E293B]" />}
            items={rankingMargem.slice(0, 5)} mono />
        </div>
      </section>

      {/* ── Gestão de Reposição ──────────────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <AlertTriangle size={16} className="text-orange-500" /> Gestão de Reposição
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Estoque Crítico */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            <h4 className="font-bold text-[#1E293B] mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500" /> Alerta de Estoque Crítico
            </h4>
            {criticos.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">✅ Todos os produtos estão dentro do estoque mínimo</div>
            ) : criticos.map(p => (
              <AlertRow key={p.id}
                icon={<Package size={16} className="text-red-500" />}
                label={p.name}
                sub={`Categoria: ${p.category}`}
                chip={p.currentStock === 0 ? 'SEM ESTOQUE' : `${p.currentStock} un.`}
                chipColor={p.currentStock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} />
            ))}
          </div>

          {/* Produtos sem giro */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            <h4 className="font-bold text-[#1E293B] mb-4 flex items-center gap-2">
              <Clock size={16} className="text-slate-500" /> Produtos Sem Giro (alto estoque)
            </h4>
            {semGiro.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Sem produtos em excesso de estoque</div>
            ) : semGiro.map(p => (
              <AlertRow key={p.id}
                icon={<Package size={16} className="text-slate-400" />}
                label={p.name}
                sub={`${p.currentStock} un. em estoque • Mín: ${p.minStock}`}
                chip={`${p.currentStock} un.`}
                chipColor="bg-slate-100 text-slate-600" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
