import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShop } from '../../../store';
import { Goal } from '../../../types';
import {
  Target, TrendingUp, Trophy, Zap, Users, BarChart3,
  ShoppingBag, ArrowRight, CheckCircle2, AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

interface Props { dateRange: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const daysBetween = (a: string, b: string) => {
  const diff = new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime();
  return Math.max(Math.round(diff / 86400000), 1);
};

const BADGE_COLOR = (i: number) =>
  i === 0 ? 'bg-yellow-400 text-yellow-900' :
  i === 1 ? 'bg-slate-400 text-white' :
  i === 2 ? 'bg-[#cd6133] text-white' : 'bg-slate-200 text-slate-700';

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KPI: React.FC<{
  icon: React.ReactNode; label: string; value: string; sub?: string;
  accent?: string; bg?: string;
}> = ({ icon, label, value, sub, accent = 'text-slate-900', bg = 'bg-slate-50' }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-tight">{label}</span>
    </div>
    <div className={`text-xl font-black mb-0.5 ${accent}`}>{value}</div>
    {sub && <div className="text-[11px] text-slate-400 font-medium">{sub}</div>}
  </div>
);

// ── Ranking Row (padrão /cutflow4) ────────────────────────────────────────────
const RankingCard: React.FC<{
  title: string; icon: React.ReactNode;
  items: { label: string; value: number; sub?: string; valueFmt?: string }[];
  emptyText?: string; mono?: boolean;
}> = ({ title, icon, items, emptyText = 'Sem dados', mono }) => {
  const maxVal = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
      <h3 className="text-base font-bold text-[#1E293B] mb-4 flex items-center gap-2">{icon} {title}</h3>
      <div className="flex flex-col divide-y divide-slate-100">
        {items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">{emptyText}</div>
        ) : items.map((item, i) => (
          <div key={i} className="py-3.5 flex items-center gap-3 pr-1">
            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm ${BADGE_COLOR(i)}`}>{i+1}º</div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-[#1E293B] truncate text-sm">{item.label}</span>
                <span className="font-bold text-[#F16A1B] whitespace-nowrap ml-2 text-sm">
                  {item.valueFmt ?? (mono ? fmtPct(item.value) : fmt(item.value))}
                </span>
              </div>
              <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#F16A1B] h-full rounded-full" style={{ width: `${(item.value / maxVal) * 100}%` }} />
              </div>
              {item.sub && <div className="text-[10px] text-slate-400 mt-1 text-right">{item.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Thermometer (Gráfico circular) ────────────────────────────────────────────
const Thermometer: React.FC<{ current: number; target: number; label: string }> = ({ current, target, label }) => {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const over = target > 0 ? (current / target) * 100 : 0;
  const color = pct >= 100 ? '#22c55e' : pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const data = [
    { name: 'Realizado', value: Math.min(current, target) },
    { name: 'Restante', value: Math.max(target - current, 0) },
  ];
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={72}
              startAngle={90} endAngle={-270} dataKey="value" stroke="none">
              <Cell fill={color} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{over.toFixed(0)}%</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
        </div>
      </div>
      <div className="text-center mt-1">
        <p className="text-sm font-black text-slate-800">{fmt(current)}</p>
        <p className="text-[11px] text-slate-400">de {fmt(target)}</p>
      </div>
    </div>
  );
};

// ── Status Chip ───────────────────────────────────────────────────────────────
const StatusChip: React.FC<{ pct: number }> = ({ pct }) => {
  const cfg =
    pct >= 100 ? { label: 'Meta Batida! 🏆', cls: 'bg-emerald-100 text-emerald-700' } :
    pct >= 80  ? { label: 'Quase Lá 🔥',     cls: 'bg-emerald-50 text-emerald-600'  } :
    pct >= 50  ? { label: 'No Caminho ⚡',    cls: 'bg-amber-50 text-amber-600'      } :
                 { label: 'Atenção ⚠️',       cls: 'bg-red-50 text-red-600'          };
  return <span className={`text-xs font-black px-3 py-1 rounded-full ${cfg.cls}`}>{cfg.label}</span>;
};

// ── Main Panel ────────────────────────────────────────────────────────────────
export const ReportsGoalsPanel: React.FC<Props> = ({ dateRange }) => {
  const { goals, professionals, appointments } = useShop();
  const today = localDate(new Date());

  // Filtra apenas metas mensais ativas para o painel de metas
  const activeGoals = useMemo(() =>
    (goals || []).filter(g => g.endDate >= today && g.startDate <= today),
    [goals, today]);

  const fatGoal  = useMemo(() => activeGoals.find(g => g.category === 'faturamento' && !g.professionalId) ?? null, [activeGoals]);
  const atdGoal  = useMemo(() => activeGoals.find(g => g.category === 'atendimentos' && !g.professionalId) ?? null, [activeGoals]);
  const prodGoal = useMemo(() => activeGoals.find(g => g.category === 'venda_produtos' && !g.professionalId) ?? null, [activeGoals]);

  const completedAppts = useMemo(() => appointments.filter(a => a.status === 'completed'), [appointments]);

  // ── Ritmo (velocidade diária) ────────────────────────────────────────────────
  const goalRhythm = useMemo(() => {
    if (!fatGoal) return null;
    const passedDays = daysBetween(fatGoal.startDate, today);
    const totalDays  = daysBetween(fatGoal.startDate, fatGoal.endDate);
    const dailyRate  = passedDays > 0 ? fatGoal.currentValue / passedDays : 0;
    const expected   = (fatGoal.targetValue / totalDays) * passedDays;
    const projection = dailyRate * totalDays;
    return { passedDays, totalDays, dailyRate, expected, projection };
  }, [fatGoal, today]);

  // ── Ranking de barbeiros ──────────────────────────────────────────────────────
  const barbeiroPct = useMemo(() => {
    const byPro = new Map<string, { name: string; pct: number; current: number; target: number }>();
    activeGoals.filter(g => g.professionalId && g.category === 'faturamento').forEach(g => {
      const pro = professionals.find(p => p.id === g.professionalId);
      if (!pro) return;
      const pct = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;
      const existing = byPro.get(g.professionalId!);
      if (!existing || pct > existing.pct) byPro.set(g.professionalId!, { name: pro.name, pct, current: g.currentValue, target: g.targetValue });
    });
    return [...byPro.values()].sort((a, b) => b.pct - a.pct);
  }, [activeGoals, professionals]);

  // ── Quebra por categoria ──────────────────────────────────────────────────────
  const catBreakdown = useMemo(() => {
    const cats = [
      { label: 'Faturamento', g: fatGoal },
      { label: 'Atendimentos', g: atdGoal },
      { label: 'Venda Produtos', g: prodGoal },
    ].filter(c => c.g);
    const total = cats.reduce((s, c) => s + (c.g?.currentValue || 0), 0);
    return cats.map(c => ({
      label: c.label,
      value: total > 0 ? ((c.g!.currentValue / total) * 100) : 0,
      sub: fmt(c.g!.currentValue),
      valueFmt: fmtPct(total > 0 ? (c.g!.currentValue / total) * 100 : 0)
    }));
  }, [fatGoal, atdGoal, prodGoal]);

  // ── Conversão de venda casada ─────────────────────────────────────────────────
  // Como não temos join direto, estimamos via meta de venda_produtos atual
  const conversionRate = useMemo(() => {
    if (!prodGoal || !fatGoal) return null;
    const total = completedAppts.length;
    if (total === 0) return 0;
    // Heurística: assume ticket médio de produto = prodGoal.currentValue / completedAppts.length
    const estApptWithProd = prodGoal.currentValue > 0 ? Math.round((prodGoal.currentValue / (fatGoal.currentValue || 1)) * total) : 0;
    return total > 0 ? (estApptWithProd / total) * 100 : 0;
  }, [prodGoal, fatGoal, completedAppts]);

  // ── Comparativo semana atual vs anterior ─────────────────────────────────────
  const weekComparison = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    // início da semana atual (domingo)
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - dayOfWeek);
    // semana anterior
    const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(weekStart.getDate() - 7);
    const prevWeekEnd   = new Date(weekStart); prevWeekEnd.setDate(weekStart.getDate() - 1);

    const startStr1 = localDate(weekStart);
    const startStr2 = localDate(prevWeekStart);
    const endStr2   = localDate(prevWeekEnd);
    const todayStr  = today;

    const curr = completedAppts.filter(a => a.date >= startStr1 && a.date <= todayStr)
      .reduce((s, a) => s + a.totalValue, 0);
    const prev = completedAppts.filter(a => a.date >= startStr2 && a.date <= endStr2)
      .reduce((s, a) => s + a.totalValue, 0);

    return [
      { name: 'Sem. Anterior', value: prev },
      { name: 'Sem. Atual',    value: curr },
    ];
  }, [completedAppts, today]);

  const hasAnyGoal = activeGoals.length > 0;

  return (
    <div className="space-y-8">
      {!hasAnyGoal && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <AlertTriangle className="mx-auto text-amber-500 mb-3" size={32} />
          <p className="font-bold text-amber-800">Nenhuma meta ativa encontrada.</p>
          <p className="text-sm text-amber-600 mt-1">Crie metas na aba Metas para visualizar os dados aqui.</p>
        </div>
      )}

      {/* ── Visão Geral ──────────────────────────────────────────────────────── */}
      {fatGoal && (
        <section>
          <h3 className="text-base font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target size={16} className="text-orange-500" /> Visão Geral — Faturamento
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Termômetro */}
              <div className="flex flex-col items-center">
                <Thermometer current={fatGoal.currentValue} target={fatGoal.targetValue} label="Faturamento" />
                <StatusChip pct={fatGoal.targetValue > 0 ? (fatGoal.currentValue / fatGoal.targetValue) * 100 : 0} />
              </div>

              {/* KPIs de Ritmo */}
              {goalRhythm && (
                <div className="space-y-4 lg:col-span-2 grid grid-cols-2 gap-4 content-start">
                  <KPI icon={<Zap size={16} className="text-[#F16A1B]" />}
                       label="Ritmo Diário Atual" value={fmt(goalRhythm.dailyRate)} sub={`Esperado: ${fmt(fatGoal.targetValue / goalRhythm.totalDays)}/dia`} />
                  <KPI icon={<TrendingUp size={16} className="text-blue-600" />}
                       label="Valor Esperado Hoje" value={fmt(goalRhythm.expected)} sub={`Realizado: ${fmt(fatGoal.currentValue)}`}
                       accent={fatGoal.currentValue >= goalRhythm.expected ? 'text-emerald-700' : 'text-red-600'}
                       bg={fatGoal.currentValue >= goalRhythm.expected ? 'bg-emerald-50' : 'bg-red-50'} />
                  <KPI icon={<BarChart3 size={16} className="text-purple-600" />}
                       label="Projeção de Fechamento" value={fmt(goalRhythm.projection)}
                       sub={goalRhythm.projection >= fatGoal.targetValue ? '✅ Meta será atingida' : '⚠️ Abaixo da meta'}
                       accent={goalRhythm.projection >= fatGoal.targetValue ? 'text-emerald-700' : 'text-red-600'}
                       bg={goalRhythm.projection >= fatGoal.targetValue ? 'bg-emerald-50' : 'bg-red-50'} />
                  <KPI icon={<Target size={16} className="text-amber-600" />}
                       label="Gap para Meta" value={fmt(Math.max(fatGoal.targetValue - fatGoal.currentValue, 0))}
                       sub={`${goalRhythm.totalDays - goalRhythm.passedDays} dias restantes`}
                       accent="text-amber-700" bg="bg-amber-50" />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Ranking Barbeiros ─────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users size={16} className="text-orange-500" /> Performance da Equipe
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <RankingCard title="Ranking Barbeiros — % da Meta"
            icon={<Trophy size={18} className="text-[#1E293B]" />}
            items={barbeiroPct.map(b => ({
              label: b.name, value: b.pct,
              sub: `${fmt(b.current)} / ${fmt(b.target)}`,
              valueFmt: fmtPct(b.pct)
            }))}
            emptyText="Sem metas individuais criadas" mono />

          {/* Quebra por categoria */}
          <RankingCard title="Quebra por Categoria"
            icon={<BarChart3 size={18} className="text-[#1E293B]" />}
            items={catBreakdown}
            emptyText="Nenhuma meta ativa" mono />
        </div>
      </section>

      {/* ── Métricas Adicionais ───────────────────────────────────────────────── */}
      <section>
        <h3 className="text-base font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Zap size={16} className="text-orange-500" /> Métricas Adicionais
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {conversionRate !== null && (
            <KPI icon={<ShoppingBag size={16} className="text-[#F16A1B]" />}
                 label="Conversão de Venda Casada" value={fmtPct(conversionRate)}
                 sub="Agendamentos com produto incluso (est.)" />
          )}
          {atdGoal && (
            <KPI icon={<CheckCircle2 size={16} className="text-blue-600" />}
                 label="Atendimentos" value={`${Math.round(atdGoal.currentValue)} / ${atdGoal.targetValue}`}
                 sub={fmtPct(atdGoal.targetValue > 0 ? (atdGoal.currentValue / atdGoal.targetValue) * 100 : 0) + ' da meta'}
                 accent="text-blue-700" bg="bg-blue-50" />
          )}
          {prodGoal && (
            <KPI icon={<ArrowRight size={16} className="text-purple-600" />}
                 label="Venda de Produtos" value={fmt(prodGoal.currentValue)}
                 sub={`Meta: ${fmt(prodGoal.targetValue)} (${fmtPct(prodGoal.targetValue > 0 ? (prodGoal.currentValue / prodGoal.targetValue) * 100 : 0)})`}
                 accent="text-purple-700" bg="bg-purple-50" />
          )}
        </div>

        {/* Comparativo de Períodos */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-[#1E293B] mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-orange-500" /> Comparativo — Semana Atual vs. Anterior
          </h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekComparison} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} width={80} />
                <Tooltip formatter={(v: any) => fmt(Number(v))} />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  <Cell fill="#94a3b8" />
                  <Cell fill="#ea580c" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
};
