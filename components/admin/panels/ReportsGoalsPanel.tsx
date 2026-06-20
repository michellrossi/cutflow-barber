import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShop } from '../../../store';
import { Goal } from '../../../types';
import {
  Target, TrendingUp, Trophy, Zap, Users, BarChart3,
  ShoppingBag, ArrowRight, CheckCircle2, AlertTriangle,
  DollarSign, Sparkles, LineChart as LineChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line
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
    <div className={`text-3xl font-black mb-0.5 leading-none ${accent}`}>{value}</div>
    {sub && <div className="text-[11px] text-slate-400 font-medium mt-1">{sub}</div>}
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
              {item.sub && <div className="text-[10px] text-slate-400 mt-1 text-right font-medium">{item.sub}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Thermometer: React.FC<{ current: number; target: number; label: string; formatter: (v: number) => string }> = ({ current, target, label, formatter }) => {
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
        <p className="text-sm font-black text-slate-800">{formatter(current)}</p>
        <p className="text-[11px] text-slate-400">de {formatter(target)}</p>
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
  const { appointments, professionals, goals } = useShop();
  const today = new Date().toISOString().split('T')[0];

  const appointmentsList = Array.isArray(appointments) ? appointments : [];
  const professionalsList = Array.isArray(professionals) ? professionals : [];
  const goalsList = Array.isArray(goals) ? goals : [];

  // Filtra apenas metas mensais ativas para o painel de metas
  const activeGoals = useMemo(() =>
    goalsList.filter(g => g.endDate >= today && g.startDate <= today),
    [goalsList, today]);

  const fatGoal  = useMemo(() => activeGoals.find(g => g.category === 'faturamento' && !g.professionalId) ?? null, [activeGoals]);
  const atdGoal  = useMemo(() => activeGoals.find(g => g.category === 'atendimentos' && !g.professionalId) ?? null, [activeGoals]);
  const prodGoal = useMemo(() => activeGoals.find(g => g.category === 'venda_produtos' && !g.professionalId) ?? null, [activeGoals]);

  const completedAppts = useMemo(() => appointmentsList.filter(a => a.status === 'completed'), [appointmentsList]);

  // Formatação customizada por tipo de meta
  const formatGoalValue = (val: number, category: string) => {
    if (category === 'atendimentos') {
      return `${Math.round(val)} atd.`;
    }
    return fmt(val);
  };

  // ── Cálculo do Ritmo Geral (Reutilizável) ────────────────────────────────────
  const calculateGoalRhythm = (goal: Goal | null) => {
    if (!goal) return null;
    const passedDays = daysBetween(goal.startDate, today);
    const totalDays  = daysBetween(goal.startDate, goal.endDate);
    const remainingDays = Math.max(totalDays - passedDays, 0);

    const dailyRate  = passedDays > 0 ? goal.currentValue / passedDays : 0;
    const expected   = (goal.targetValue / totalDays) * passedDays;
    const projection = dailyRate * totalDays;

    // Ritmo necessário a partir de hoje
    const remainingValue = Math.max(goal.targetValue - goal.currentValue, 0);
    const requiredRate   = remainingDays > 0 ? remainingValue / remainingDays : 0;

    const isAtRisk = goal.currentValue < expected && remainingValue > 0;

    return {
      passedDays,
      totalDays,
      remainingDays,
      dailyRate,
      expected,
      projection,
      requiredRate,
      remainingValue,
      isAtRisk
    };
  };

  const fatRhythm = useMemo(() => calculateGoalRhythm(fatGoal), [fatGoal, today]);
  const atdRhythm = useMemo(() => calculateGoalRhythm(atdGoal), [atdGoal, today]);
  const prodRhythm = useMemo(() => calculateGoalRhythm(prodGoal), [prodGoal, today]);

  // ── Categorias Disponíveis para a Visão Geral ──────────────────────────────
  const availableCategories = useMemo(() => {
    return [
      { id: 'faturamento', label: 'Faturamento', goal: fatGoal, rhythm: fatRhythm },
      { id: 'atendimentos', label: 'Atendimentos', goal: atdGoal, rhythm: atdRhythm },
      { id: 'venda_produtos', label: 'Venda de Produtos', goal: prodGoal, rhythm: prodRhythm }
    ].filter(x => x.goal !== null);
  }, [fatGoal, fatRhythm, atdGoal, atdRhythm, prodGoal, prodRhythm]);

  const [activeGoalTab, setActiveGoalTab] = useState<string>('');

  useEffect(() => {
    if (availableCategories.length > 0 && !activeGoalTab) {
      setActiveGoalTab(availableCategories[0].id);
    }
  }, [availableCategories, activeGoalTab]);

  // ── Alertas de Metas em Risco no Topo ────────────────────────────────────────
  const goalsWithRhythm = useMemo(() => {
    return [
      { name: 'Faturamento', goal: fatGoal, rhythm: fatRhythm, category: 'faturamento' },
      { name: 'Atendimentos', goal: atdGoal, rhythm: atdRhythm, category: 'atendimentos' },
      { name: 'Venda de Produtos', goal: prodGoal, rhythm: prodRhythm, category: 'venda_produtos' }
    ].filter(x => x.goal !== null);
  }, [fatGoal, fatRhythm, atdGoal, atdRhythm, prodGoal, prodRhythm]);

  const atRiskGoals = useMemo(() => {
    return goalsWithRhythm.filter(x => {
      if (!x.rhythm) return false;
      return x.rhythm.requiredRate > x.rhythm.dailyRate && x.rhythm.remainingValue > 0;
    });
  }, [goalsWithRhythm]);

  // ── Seletor de Categoria no Ranking ──────────────────────────────────────────
  const [rankingCategory, setRankingCategory] = useState<'faturamento' | 'atendimentos' | 'venda_produtos'>('faturamento');

  const barbeiroPct = useMemo(() => {
    const byPro = new Map<string, { name: string; pct: number; current: number; target: number }>();
    activeGoals.filter(g => g.professionalId && g.category === rankingCategory).forEach(g => {
      const pro = professionalsList.find(p => p.id === g.professionalId);
      if (!pro) return;
      const pct = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;
      const existing = byPro.get(g.professionalId!);
      if (!existing || pct > existing.pct) byPro.set(g.professionalId!, { name: pro.name, pct, current: g.currentValue, target: g.targetValue });
    });
    return [...byPro.values()].sort((a, b) => b.pct - a.pct);
  }, [activeGoals, professionalsList, rankingCategory]);

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
  const conversionRate = useMemo(() => {
    if (!prodGoal || !fatGoal) return null;
    const total = completedAppts.length;
    if (total === 0) return 0;
    const estApptWithProd = prodGoal.currentValue > 0 ? Math.round((prodGoal.currentValue / (fatGoal.currentValue || 1)) * total) : 0;
    return total > 0 ? (estApptWithProd / total) * 100 : 0;
  }, [prodGoal, fatGoal, completedAppts]);

  // ── Comparativo semana atual vs anterior ─────────────────────────────────────
  const weekComparison = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - dayOfWeek);
    const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(weekStart.getDate() - 7);
    const prevWeekEnd   = new Date(weekStart); prevWeekEnd.setDate(weekStart.getDate() - 1);

    const curr = completedAppts.filter(a => a.date >= localDate(weekStart) && a.date <= today)
      .reduce((s, a) => s + a.totalValue, 0);
    const prev = completedAppts.filter(a => a.date >= localDate(prevWeekStart) && a.date <= localDate(prevWeekEnd))
      .reduce((s, a) => s + a.totalValue, 0);

    return [
      { name: 'Sem. Anterior', value: prev },
      { name: 'Sem. Atual',    value: curr },
    ];
  }, [completedAppts, today]);

  // ── Comparativo mês atual vs anterior ────────────────────────────────────────
  const monthComparison = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);

    const dayOfMonth = now.getDate();
    const prevMonthSameDay = new Date(prevMonthStart);
    prevMonthSameDay.setDate(Math.min(dayOfMonth, prevMonthEnd.getDate()));

    const curr = completedAppts.filter(a => a.date >= localDate(monthStart) && a.date <= today)
      .reduce((s, a) => s + a.totalValue, 0);
    const prev = completedAppts.filter(a => a.date >= localDate(prevMonthStart) && a.date <= localDate(prevMonthSameDay))
      .reduce((s, a) => s + a.totalValue, 0);

    const currMonthLabel = now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const prevMonthLabel = prevMonthStart.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

    return [
      { name: `${prevMonthLabel.charAt(0).toUpperCase() + prevMonthLabel.slice(1)}. Anterior`, value: prev },
      { name: `${currMonthLabel.charAt(0).toUpperCase() + currMonthLabel.slice(1)}. Atual`,    value: curr },
    ];
  }, [completedAppts, today]);

  // ── Histórico de Metas Expiradas (Calibração) ──────────────────────────────────
  const expiredGoals = useMemo(() => {
    return goalsList.filter(g => g.endDate < today && !g.professionalId);
  }, [goalsList, today]);

  const categoryHistory = useMemo(() => {
    if (!activeGoalTab) return [];
    return expiredGoals
      .filter(g => g.category === activeGoalTab)
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
      .slice(0, 6);
  }, [expiredGoals, activeGoalTab]);

  const historyStats = useMemo(() => {
    if (categoryHistory.length === 0) return null;
    const successes = categoryHistory.filter(g => Number(g.currentValue) >= Number(g.targetValue)).length;
    const pct = (successes / categoryHistory.length) * 100;
    
    // Diagnóstico inteligente baseado na taxa de calibração
    let diagnosis = "";
    if (pct === 100) {
      diagnosis = "🏆 Metas perfeitamente batidas! Considere elevar os alvos de forma saudável para o próximo período.";
    } else if (pct >= 70) {
      diagnosis = "🔥 Ótima calibração. Suas metas estão desafiadoras mas atingíveis.";
    } else if (pct >= 40) {
      diagnosis = "⚡ Calibração moderada. Analise se há gargalos operacionais específicos nos períodos de queda.";
    } else {
      diagnosis = "⚠️ Metas muito altas. Metas batidas com pouca frequência podem desmotivar o time. Considere reduzir o alvo para valores mais realistas.";
    }

    return {
      successes,
      total: categoryHistory.length,
      pct,
      diagnosis
    };
  }, [categoryHistory]);

  // ── Margem Real e Sobra Líquida (Apenas para Faturamento) ─────────────────────
  const faturamentoMargem = useMemo(() => {
    if (activeGoalTab !== 'faturamento' || !fatGoal) return null;

    // Filtrar agendamentos concluídos dentro do período da meta de faturamento
    const apptsInPeriod = completedAppts.filter(a =>
      a.date >= fatGoal.startDate && a.date <= fatGoal.endDate
    );

    // Calcular a comissão real correspondente a esses agendamentos
    let totalCommissionCommitment = 0;
    apptsInPeriod.forEach(appt => {
      const pro = professionalsList.find(p => p.id === appt.professionalId);
      const commPct = pro?.commissionPercentage ?? 50;
      totalCommissionCommitment += appt.totalValue * (commPct / 100);
    });

    const revenue = fatGoal.currentValue;
    const netRevenue = Math.max(revenue - totalCommissionCommitment, 0);
    const avgCommissionPct = revenue > 0 ? (totalCommissionCommitment / revenue) * 100 : 50;

    // Projeção no Alvo da Meta
    const projectedCommission = fatGoal.targetValue * (avgCommissionPct / 100);
    const projectedNetRevenue = Math.max(fatGoal.targetValue - projectedCommission, 0);

    return {
      revenue,
      commission: totalCommissionCommitment,
      netRevenue,
      commissionPct: avgCommissionPct,
      targetValue: fatGoal.targetValue,
      projectedCommission,
      projectedNetRevenue
    };
  }, [activeGoalTab, fatGoal, completedAppts, professionalsList]);

  // ── Gráfico de Linha / Tendência Diária Acumulada no Período da Meta ──────────
  const trendChartData = useMemo(() => {
    if (!activeGoalTab) return [];
    
    // Obter a meta correspondente da aba ativa
    const selected = availableCategories.find(c => c.id === activeGoalTab);
    if (!selected || !selected.goal) return [];
    const goal = selected.goal;
    
    // Gerar todos os dias entre startDate e endDate
    const start = new Date(goal.startDate + 'T00:00:00');
    const end = new Date(goal.endDate + 'T00:00:00');
    const datesArray: string[] = [];
    
    const currentIter = new Date(start);
    while (currentIter <= end) {
      datesArray.push(localDate(currentIter));
      currentIter.setDate(currentIter.getDate() + 1);
    }
    
    const totalDaysCount = datesArray.length;
    if (totalDaysCount === 0) return [];
    
    // Filtrar agendamentos concluídos no período
    const apptsInPeriod = completedAppts.filter(a => 
      a.date >= goal.startDate && a.date <= goal.endDate
    );
    
    // Agrupar realizado diário por data
    const dailyValues = new Map<string, number>();
    apptsInPeriod.forEach(a => {
      let val = 0;
      if (goal.category === 'faturamento') {
        val = a.totalValue;
      } else if (goal.category === 'atendimentos') {
        val = 1;
      }
      dailyValues.set(a.date, (dailyValues.get(a.date) || 0) + val);
    });

    const totalAptValue = apptsInPeriod.reduce((s, a) => s + (goal.category === 'faturamento' ? a.totalValue : 1), 0);
    
    // Montar os acumulados
    let realAccumulated = 0;
    const chartData = datesArray.map((dateStr, idx) => {
      const dayNum = idx + 1;
      const targetLinearAccumulated = (goal.targetValue / totalDaysCount) * dayNum;
      
      let dayRealVal = 0;
      if (goal.category === 'venda_produtos') {
        const dayAptVal = dailyValues.get(dateStr) || 0;
        dayRealVal = totalAptValue > 0 ? (dayAptVal / totalAptValue) * goal.currentValue : 0;
      } else {
        dayRealVal = dailyValues.get(dateStr) || 0;
      }
      
      realAccumulated += dayRealVal;
      
      const [year, month, day] = dateStr.split('-');
      const label = `${day}/${month}`;
      
      const isPastOrToday = dateStr <= today;
      
      return {
        date: dateStr,
        label,
        'Meta Esperada': Math.round(targetLinearAccumulated * 100) / 100,
        'Realizado Acumulado': isPastOrToday ? Math.round(realAccumulated * 100) / 100 : null
      };
    });
    
    return chartData;
  }, [activeGoalTab, availableCategories, completedAppts, today]);

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

      {/* ── Alertas no Topo: Metas em Risco ────────────────────────────────────── */}
      {atRiskGoals.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm flex items-start gap-4 text-left">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-extrabold text-red-800 text-base mb-1">Atenção: Metas em Risco</h4>
            <p className="text-xs text-red-700 mb-3 font-medium">
              {atRiskGoals.length === 1 
                ? "1 de suas metas ativas está abaixo do ritmo necessário para atingir o objetivo." 
                : `${atRiskGoals.length} de suas metas ativas estão abaixo do ritmo necessário para atingir o objetivo.`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {atRiskGoals.map((item, idx) => (
                <div key={idx} className="bg-white border border-red-100 rounded-xl p-3 text-xs shadow-sm">
                  <div className="flex justify-between font-bold text-slate-800 mb-1">
                    <span>{item.name}</span>
                    <span className="text-red-600">{fmtPct((item.goal!.currentValue / item.goal!.targetValue) * 100)}</span>
                  </div>
                  <div className="text-slate-500 space-y-1 mt-2">
                    <p>Ritmo Diário Atual: <span className="font-bold text-slate-700">{formatGoalValue(item.rhythm!.dailyRate, item.category)}/dia</span></p>
                    <p>Necessário a partir de Hoje: <span className="font-bold text-red-600">{formatGoalValue(item.rhythm!.requiredRate, item.category)}/dia</span></p>
                    <p>Falta para o Objetivo: <span className="font-bold text-slate-700">{formatGoalValue(item.rhythm!.remainingValue, item.category)}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Visão Geral das Metas com Seletor ─────────────────────────────────── */}
      {availableCategories.length > 0 && activeGoalTab && (() => {
        const selected = availableCategories.find(c => c.id === activeGoalTab);
        if (!selected) return null;
        const currentGoal = selected.goal;
        const currentRhythm = selected.rhythm;
        if (!currentGoal || !currentRhythm) return null;
        
        return (
          <section className="space-y-4 text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Target size={16} className="text-orange-500" /> Visão Geral das Metas
              </h3>
              
              {/* Seletor de Abas de Meta */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-stretch sm:self-auto overflow-x-auto">
                {availableCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveGoalTab(cat.id)}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                      activeGoalTab === cat.id
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                {/* Termômetro */}
                <div className="flex flex-col items-center gap-4">
                  <Thermometer 
                    current={currentGoal.currentValue} 
                    target={currentGoal.targetValue} 
                    label={selected.label} 
                    formatter={(v) => formatGoalValue(v, selected.id)}
                  />
                  <StatusChip pct={currentGoal.targetValue > 0 ? (currentGoal.currentValue / currentGoal.targetValue) * 100 : 0} />
                </div>

                {/* KPIs de Ritmo */}
                {currentRhythm && (
                  <div className="space-y-4 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
                    <KPI 
                      icon={<Zap size={16} className="text-[#F16A1B]" />}
                      label="Ritmo Diário Atual" 
                      value={`${formatGoalValue(currentRhythm.dailyRate, selected.id)}/dia`} 
                      sub={`Ideal Original: ${formatGoalValue(currentGoal.targetValue / currentRhythm.totalDays, selected.id)}/dia`} 
                    />
                    <KPI 
                      icon={<Trophy size={16} className="text-orange-600" />}
                      label="Ritmo Necessário de Hoje em Diante" 
                      value={`${formatGoalValue(currentRhythm.requiredRate, selected.id)}/dia`} 
                      sub={currentRhythm.dailyRate >= currentRhythm.requiredRate ? '✅ No ritmo planejado' : '⚠️ Precisa aumentar ritmo'} 
                      accent={currentRhythm.dailyRate >= currentRhythm.requiredRate ? 'text-emerald-700' : 'text-red-600'}
                      bg={currentRhythm.dailyRate >= currentRhythm.requiredRate ? 'bg-emerald-50' : 'bg-red-50'}
                    />
                    <KPI 
                      icon={<TrendingUp size={16} className="text-blue-600" />}
                      label="Valor Esperado Hoje" 
                      value={formatGoalValue(currentRhythm.expected, selected.id)} 
                      sub={`Realizado: ${formatGoalValue(currentGoal.currentValue, selected.id)}`}
                      accent={currentGoal.currentValue >= currentRhythm.expected ? 'text-emerald-700' : 'text-red-600'}
                      bg={currentGoal.currentValue >= currentRhythm.expected ? 'bg-emerald-50' : 'bg-red-50'} 
                    />
                    <KPI 
                      icon={<BarChart3 size={16} className="text-purple-600" />}
                      label="Projeção de Fechamento" 
                      value={formatGoalValue(currentRhythm.projection, selected.id)}
                      sub={currentRhythm.projection >= currentGoal.targetValue ? '✅ Meta será atingida' : '⚠️ Abaixo da meta'}
                      accent={currentRhythm.projection >= currentGoal.targetValue ? 'text-emerald-700' : 'text-red-600'}
                      bg={currentRhythm.projection >= currentGoal.targetValue ? 'bg-emerald-50' : 'bg-red-50'} 
                    />
                    <div className="col-span-1 sm:col-span-2">
                      <KPI 
                        icon={<Target size={16} className="text-amber-600" />}
                        label="Diferença / Gap Restante para Meta" 
                        value={formatGoalValue(currentRhythm.remainingValue, selected.id)}
                        sub={`${currentRhythm.remainingDays} dias restantes`}
                        accent="text-amber-700" 
                        bg="bg-amber-50" 
                      />
                    </div>
                  </div>
                )}
                
                {/* Seção Adicional: Gráfico de Tendência e Margem Real */}
                <div className="border-t border-slate-100 my-6" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Gráfico de Tendência Diária Acumulada */}
                  <div className={`bg-slate-50 p-5 rounded-2xl border border-slate-100 ${selected.id === 'faturamento' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <LineChartIcon size={14} className="text-orange-500" /> Tendência Diária Acumulada no Período
                    </h4>
                    <div className="h-64 mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendChartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 600 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatGoalValue(v, selected.id)} />
                          <Tooltip 
                            formatter={(v: any) => [formatGoalValue(Number(v), selected.id), '']}
                            labelFormatter={(label) => `Dia: ${label}`}
                          />
                          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                          <Area 
                            type="monotone" 
                            dataKey="Realizado Acumulado" 
                            stroke="#ea580c" 
                            strokeWidth={2.5}
                            fillOpacity={1} 
                            fill="url(#colorReal)" 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Meta Esperada" 
                            stroke="#94a3b8" 
                            strokeWidth={2} 
                            strokeDasharray="5 5" 
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 text-center font-medium">
                      A linha contínua laranja representa o acumulado até hoje. A linha tracejada cinza representa a meta linear ideal.
                    </p>
                  </div>

                  {/* Coluna da Margem Real (Apenas Faturamento) */}
                  {selected.id === 'faturamento' && faturamentoMargem && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                          <DollarSign size={14} className="text-emerald-500" /> Análise de Margem Real / Sobra Líquida
                        </h4>
                        <div className="space-y-3.5">
                          <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                            <span className="text-slate-500 font-medium">Receita Bruta Acumulada:</span>
                            <span className="font-extrabold text-slate-900">{fmt(faturamentoMargem.revenue)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                            <span className="text-slate-500 font-medium">Comissões Devidas (Est.):</span>
                            <span className="font-bold text-red-600">-{fmt(faturamentoMargem.commission)} <span className="text-[10px] text-slate-400">({faturamentoMargem.commissionPct.toFixed(0)}%)</span></span>
                          </div>
                          <div className="flex justify-between items-center bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                            <span className="text-emerald-800 font-bold text-sm">Sobra Líquida (Margem Real):</span>
                            <div className="text-right">
                              <p className="font-black text-emerald-700 text-base">{fmt(faturamentoMargem.netRevenue)}</p>
                              <p className="text-[10px] text-emerald-600 font-bold">{(100 - faturamentoMargem.commissionPct).toFixed(0)}% da receita</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-3 rounded-xl">
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide mb-2">Projeção no Fechamento da Meta</p>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Receita Alvo:</span>
                          <span className="font-bold">{fmt(faturamentoMargem.targetValue)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Comissão Estimada:</span>
                          <span className="font-bold text-red-500">{fmt(faturamentoMargem.projectedCommission)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-emerald-800 border-t border-slate-200/50 pt-1 mt-1">
                          <span>Sobra Líquida Alvo:</span>
                          <span>{fmt(faturamentoMargem.projectedNetRevenue)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Histórico de Cumprimento de Metas (Calibração) */}
                {historyStats && (
                  <div className="border-t border-slate-100 my-6 pt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="relative w-16 h-16 shrink-0">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className={historyStats.pct >= 70 ? "text-emerald-500" : historyStats.pct >= 40 ? "text-amber-500" : "text-red-500"} strokeDasharray={`${historyStats.pct}, 100`} strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-800">
                            {historyStats.pct.toFixed(0)}%
                          </div>
                        </div>
                        <div className="text-left">
                          <h5 className="font-extrabold text-slate-800 text-sm">Calibração do Alvo</h5>
                          <p className="text-xs text-slate-500 font-medium">Bateu a meta em {historyStats.successes} de {historyStats.total} períodos passados.</p>
                        </div>
                      </div>
                      
                      <div className="lg:col-span-2 bg-[#F8FAFC] p-4 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600 leading-relaxed text-left flex items-start gap-2.5">
                        <Sparkles size={16} className="text-orange-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold text-slate-800">Diagnóstico de Meta:</span>
                          <p className="text-slate-500 mt-1 font-medium">{historyStats.diagnosis}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {categoryHistory.map((pastGoal, idx) => {
                        const wasHit = Number(pastGoal.currentValue) >= Number(pastGoal.targetValue);
                        const startM = new Date(pastGoal.startDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.','');
                        const endM = new Date(pastGoal.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.','');
                        const periodLabel = `${startM} - ${endM}`;
                        
                        return (
                          <div key={idx} className="bg-white border border-slate-100 hover:border-slate-200 transition-all rounded-xl p-3 text-xs shadow-sm flex flex-col justify-between gap-2 text-left">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-[10px] text-slate-400 uppercase">{periodLabel}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${wasHit ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {wasHit ? 'Batida 🏆' : 'Abaixo ⚠️'}
                                </span>
                              </div>
                              <p className="font-extrabold text-slate-700 truncate">{pastGoal.name}</p>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              <div className="flex justify-between">
                                <span>Atingido:</span>
                                <span className="font-bold text-slate-700">{formatGoalValue(pastGoal.currentValue, selected.id)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Alvo:</span>
                                <span className="font-bold text-slate-700">{formatGoalValue(pastGoal.targetValue, selected.id)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Ranking Barbeiros e Categorias ───────────────────────────────── */}
      <section className="space-y-4 text-left">
        <h3 className="text-base font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Users size={16} className="text-orange-500" /> Performance da Equipe
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card de Ranking com Filtro */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                <Trophy size={18} className="text-[#1E293B]" /> Ranking Barbeiros — % da Meta
              </h3>
              
              {/* Seletor do Ranking */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setRankingCategory('faturamento')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    rankingCategory === 'faturamento' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Faturamento
                </button>
                <button
                  onClick={() => setRankingCategory('atendimentos')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    rankingCategory === 'atendimentos' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Atendimentos
                </button>
                <button
                  onClick={() => setRankingCategory('venda_produtos')}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    rankingCategory === 'venda_produtos' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Produtos
                </button>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 flex-1">
              {barbeiroPct.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm flex-1 flex items-center justify-center">
                  Sem metas individuais ativas nesta categoria
                </div>
              ) : (
                barbeiroPct.map((item, i) => {
                  const maxVal = Math.max(...barbeiroPct.map(x => x.pct), 1);
                  return (
                    <div key={i} className="py-3.5 flex items-center gap-3 pr-1">
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm ${BADGE_COLOR(i)}`}>
                        {i + 1}º
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-[#1E293B] truncate text-sm">{item.name}</span>
                          <span className="font-bold text-[#F16A1B] whitespace-nowrap ml-2 text-sm">
                            {fmtPct(item.pct)}
                          </span>
                        </div>
                        <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-[#F16A1B] h-full rounded-full" style={{ width: `${(item.pct / maxVal) * 100}%` }} />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 text-right font-medium">
                          Realizado: {formatGoalValue(item.current, rankingCategory)} / Meta: {formatGoalValue(item.target, rankingCategory)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quebra por categoria */}
          <RankingCard title="Quebra por Categoria"
            icon={<BarChart3 size={18} className="text-[#1E293B]" />}
            items={catBreakdown}
            emptyText="Nenhuma meta ativa" mono />
        </div>
      </section>

      {/* ── Métricas Adicionais ───────────────────────────────────────────────── */}
      <section className="space-y-4 text-left">
        <h3 className="text-base font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
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
                 label="Total Atendimentos Globais" value={`${Math.round(atdGoal.currentValue)} / ${atdGoal.targetValue}`}
                 sub={fmtPct(atdGoal.targetValue > 0 ? (atdGoal.currentValue / atdGoal.targetValue) * 100 : 0) + ' da meta global'}
                 accent="text-blue-700" bg="bg-blue-50" />
          )}
          {prodGoal && (
            <KPI icon={<ArrowRight size={16} className="text-purple-600" />}
                 label="Total Venda Produtos Global" value={fmt(prodGoal.currentValue)}
                 sub={`Meta: ${fmt(prodGoal.targetValue)} (${fmtPct(prodGoal.targetValue > 0 ? (prodGoal.currentValue / prodGoal.targetValue) * 100 : 0)})`}
                 accent="text-purple-700" bg="bg-purple-50" />
          )}
        </div>

        {/* Comparativo de Períodos — 2 gráficos lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Semana */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-[#1E293B] mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-orange-500" /> Comparativo — Semana Atual vs. Anterior
            </h4>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekComparison} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
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

          {/* Mês */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-[#1E293B] mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-500" /> Comparativo — Mês Atual vs. Anterior
            </h4>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthComparison} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} width={80} />
                  <Tooltip
                    formatter={(v: any) => fmt(Number(v))}
                    labelFormatter={(l) => `${l} (mesmo nº de dias)`}
                  />
                  <Bar dataKey="value" radius={[6,6,0,0]}>
                    <Cell fill="#94a3b8" />
                    <Cell fill="#3b82f6" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium text-center">
              Comparação proporcional ao mesmo nº de dias decorridos no mês anterior
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
