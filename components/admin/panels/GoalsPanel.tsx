import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useShop } from '../../../store';
import { Goal } from '../../../types';
import {
  Target, TrendingUp, Plus, Trophy, Trash2, Edit2,
  DollarSign, Briefcase, Package, ArrowRight, Star, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

type PeriodTab = 'diário' | 'semanal' | 'mensal' | 'anual';

// ===================== HELPERS =====================
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const localDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayStr = () => localDate(new Date());

// Formata YYYY-MM-DD → DD/MM/AAAA
const fmtDate = (d: string): string => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

// Valor monetário compacto (para caber nas bolinhas)
const fmtShort = (v: number): string => {
  if (v >= 10000) return `R$${(v / 1000).toFixed(0)}k`;
  if (v >= 1000)  return `R$${(v / 1000).toFixed(1).replace('.0', '')}k`;
  return `R$${v.toFixed(0)}`;
};

const getStatusColors = (pct: number) => {
  if (pct >= 100) return { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  if (pct >= 80)  return { bar: 'bg-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-slate-200' };
  if (pct >= 50)  return { bar: 'bg-amber-400',   text: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-slate-200' };
  return              { bar: 'bg-red-400',     text: 'text-red-600',     bg: 'bg-red-50',     border: 'border-slate-200' };
};

const getBubbleClass = (pct: number, isFuture: boolean) => {
  if (isFuture)  return 'bg-slate-100 border-slate-200 text-slate-400';
  if (pct >= 100) return 'bg-emerald-500 border-emerald-400 text-white';
  if (pct >= 80)  return 'bg-emerald-300 border-emerald-200 text-white';
  if (pct >= 50)  return 'bg-amber-400   border-amber-300   text-white';
  return               'bg-red-400   border-red-300   text-white';
};

// Builds a Sun-aligned calendar grid for the given date range
const buildCalendarGrid = (startDate: string, endDate: string) => {
  // Use T12:00:00 (noon local) to avoid DST shifts changing the date
  const start = new Date(startDate + 'T12:00:00');
  const end   = new Date(endDate   + 'T12:00:00');

  // Pad to previous Sunday
  const calStart = new Date(start);
  calStart.setDate(calStart.getDate() - calStart.getDay());

  // Pad to next Saturday
  const calEnd = new Date(end);
  calEnd.setDate(calEnd.getDate() + (6 - calEnd.getDay()));

  const days: { date: string; isInRange: boolean }[] = [];
  const cur = new Date(calStart);
  while (cur <= calEnd) {
    const d = localDate(cur);
    days.push({ date: d, isInRange: d >= startDate && d <= endDate });
    cur.setDate(cur.getDate() + 1);
  }

  // Chunk into weeks
  const weeks: typeof days[0][][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
};

const CAT_ICON = (cat: string, cls = '') => {
  if (cat === 'faturamento')  return <DollarSign size={16} className={cls} />;
  if (cat === 'atendimentos') return <Briefcase  size={16} className={cls} />;
  return <Package size={16} className={cls} />;
};

// ===================== MAIN =====================
export const GoalsPanel: React.FC = () => {
  const { goals, professionals, appointments, upsertGoal, removeGoal } = useShop();
  const [activeTab, setActiveTab]   = useState<PeriodTab>('mensal');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deleteId, setDeleteId]       = useState<string | null>(null);

  const completedApts = useMemo(() =>
    appointments.filter(a => a.status === 'completed'), [appointments]);

  const tabGoals = useMemo(() =>
    (goals || [])
      .filter(g => g.period === activeTab)
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [goals, activeTab]);

  const stats = useMemo(() => {
    const total = tabGoals.length;
    const done  = tabGoals.filter(g => g.currentValue >= g.targetValue).length;
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [tabGoals]);

  const openEdit = (g: Goal) => { setEditingGoal(g); setIsModalOpen(true); };
  const openNew  = ()        => { setEditingGoal(null); setIsModalOpen(true); };
  const closeModal = ()      => { setIsModalOpen(false); setEditingGoal(null); };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd           = new FormData(e.currentTarget);
    const period       = fd.get('period')       as PeriodTab;
    const category     = fd.get('category')     as string;
    const professionalId = (fd.get('professionalId') as string) || undefined;

    // Prevent duplicates
    const dup = (goals || []).find(g =>
      g.id !== editingGoal?.id &&
      g.period === period &&
      g.category === category &&
      (g.professionalId || '') === (professionalId || '')
    );
    if (dup) {
      alert(`Já existe uma meta ${period} de "${category}" ${professionalId ? 'para este profissional' : '(global)'}. Edite ou exclua a existente.`);
      return;
    }

    const res = await upsertGoal({
      id: editingGoal?.id,
      name: fd.get('name') as string,
      category: category as any,
      targetValue: Number(fd.get('targetValue')),
      period: period as any,
      startDate: fd.get('startDate') as string,
      endDate:   fd.get('endDate')   as string,
      professionalId
    });

    if (res.success) closeModal();
    else alert(res.error || 'Erro ao salvar meta.');
  };

  const TABS: PeriodTab[] = ['diário', 'semanal', 'mensal', 'anual'];
  const TAB_LABELS: Record<PeriodTab, string> = {
    'diário': 'Diário', 'semanal': 'Semanal', 'mensal': 'Mensal', 'anual': 'Anual'
  };

  return (
    <div className="p-1">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Gestão de Metas</h2>
        <p className="text-[#6b7d99] text-sm font-medium">
          Defina objetivos e acompanhe a performance com metas diárias, semanais, mensais e anuais.
        </p>
      </div>


      {/* Tabs + Criar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === t ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 whitespace-nowrap">
          <Plus size={18} /> Criar Nova Meta
        </button>
      </div>

      {/* Content */}
      {tabGoals.length === 0 ? (
        <EmptyState period={activeTab} onNew={openNew} />
      ) : activeTab === 'diário' ? (
        <div className="space-y-6">
          {tabGoals.map(g => (
            <DailyGoalCalendar key={g.id} goal={g} appointments={completedApts}
              onEdit={() => openEdit(g)} onDelete={() => setDeleteId(g.id)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {tabGoals.map(g => (
            <GoalProgressCard key={g.id} goal={g} professionals={professionals}
              onEdit={() => openEdit(g)} onDelete={() => setDeleteId(g.id)} />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-500" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Excluir esta meta?</h3>
              <p className="text-sm text-slate-500 mb-6">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={async () => { await removeGoal(deleteId!); setDeleteId(null); }}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all">Excluir</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <GoalModal editingGoal={editingGoal} defaultPeriod={activeTab}
            professionals={professionals} onClose={closeModal} onSubmit={handleSave} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ===================== INSIGHT CARD =====================
const InsightCard: React.FC<{ icon: React.ReactNode; label: string; value: string; subtitle: string }> = ({ icon, label, value, subtitle }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">{icon}</div>
      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-3xl font-black text-slate-900 mb-1">{value}</div>
    <div className="text-xs text-slate-400 font-medium">{subtitle}</div>
  </div>
);

// ===================== GOAL PROGRESS CARD =====================
const GoalProgressCard: React.FC<{
  goal: Goal; professionals: any[]; onEdit: () => void; onDelete: () => void;
}> = ({ goal, professionals, onEdit, onDelete }) => {
  const rawPct   = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
  const clampPct = Math.min(rawPct, 100);
  const colors   = getStatusColors(rawPct);
  const isCount  = goal.category === 'atendimentos';
  const remaining = Math.max(goal.targetValue - goal.currentValue, 0);
  const pro      = professionals.find(p => p.id === goal.professionalId);
  const isBeat   = rawPct >= 100;
  const confettied = useRef(false);

  useEffect(() => {
    if (isBeat && !confettied.current) {
      confettied.current = true;
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#ea580c', '#fb923c', '#fdba74'] });
    }
  }, [isBeat]);

  const motiveText = () => {
    if (isBeat)        return '🏆 Meta atingida!';
    if (clampPct >= 80) return '🔥 Quase lá!';
    if (clampPct >= 50) return '⚡ No caminho';
    return '⚠️ Atenção necessária';
  };

  return (
    <motion.div layout
      className={`bg-white rounded-3xl border-2 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group ${colors.border}`}>
      {isBeat && <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-white opacity-70 pointer-events-none" />}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colors.bg}`}>
              {CAT_ICON(goal.category, colors.text)}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">{goal.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                {pro ? pro.name : 'Global'} • {fmtDate(goal.startDate)} → {fmtDate(goal.endDate)}
              </p>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit}   className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"><Edit2  size={14} /></button>
            <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-500   hover:bg-red-50   rounded-lg transition-all"><Trash2 size={14} /></button>
          </div>
        </div>

        {/* Atual / Alvo / Falta */}
        <div className="grid grid-cols-3 gap-3 mb-5 p-4 bg-slate-50 rounded-2xl">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Atual</p>
            <p className="text-base font-black text-slate-900">
              {isCount ? Math.round(goal.currentValue) : fmt(goal.currentValue)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Alvo</p>
            <p className="text-base font-black text-slate-500">
              {isCount ? goal.targetValue : fmt(goal.targetValue)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Falta</p>
            <p className={`text-base font-black ${colors.text}`}>
              {isBeat ? '—' : isCount ? Math.ceil(remaining) : fmt(remaining)}
            </p>
          </div>
        </div>

        {/* % + Barra */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-2xl font-black ${colors.text}`}>{rawPct.toFixed(1)}%</span>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
              isBeat ? 'bg-emerald-100 text-emerald-700' :
              clampPct >= 80 ? 'bg-emerald-50 text-emerald-600' :
              clampPct >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
            }`}>
              {isBeat && <Star size={10} className="inline mr-0.5 fill-current" />}
              {motiveText()}
            </span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${clampPct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className={`h-full rounded-full shadow-sm ${colors.bar}`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ===================== DAILY CALENDAR =====================
const DailyGoalCalendar: React.FC<{
  goal: Goal; appointments: any[]; onEdit: () => void; onDelete: () => void;
}> = ({ goal, appointments, onEdit, onDelete }) => {
  const isCount  = goal.category === 'atendimentos';
  const today    = todayStr();
  const weeks    = useMemo(() => buildCalendarGrid(goal.startDate, goal.endDate), [goal.startDate, goal.endDate]);

  const dayValues = useMemo(() => {
    const map: Record<string, number> = {};
    weeks.flat().filter(d => d.isInRange).forEach(({ date }) => {
      const dayApts = appointments.filter(a =>
        a.date === date && (!goal.professionalId || a.professionalId === goal.professionalId)
      );
      map[date] = isCount
        ? dayApts.length
        : dayApts.reduce((s, a) => s + (a.totalValue || 0), 0);
    });
    return map;
  }, [weeks, appointments, goal, isCount]);

  const passedDays = weeks.flat().filter(d => d.isInRange && d.date <= today);
  const beatDays   = passedDays.filter(d => (dayValues[d.date] || 0) >= goal.targetValue);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-50">
            {CAT_ICON(goal.category, 'text-orange-600')}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 uppercase tracking-wide">{goal.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
              Meta diária: {isCount ? `${goal.targetValue} atend.` : fmt(goal.targetValue)}
              &nbsp;•&nbsp;{fmtDate(goal.startDate)} → {fmtDate(goal.endDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase">Dias batidos</p>
            <p className="text-xl font-black text-emerald-600">
              {beatDays.length}<span className="text-slate-400 font-bold text-sm">/{passedDays.length}</span>
            </p>
          </div>
          <button onClick={onEdit}   className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"><Edit2  size={14} /></button>
          <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-500   hover:bg-red-50   rounded-lg transition-all"><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, i) => (
          <div key={i} className="text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      {/* Calendar grid — sem rolagem, dias quadrados */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map(({ date, isInRange }) => {
              const dayNum  = parseInt(date.split('-')[2]);
              if (!isInRange) return <div key={date} className="aspect-square" />;

              const val      = dayValues[date] || 0;
              const pct      = goal.targetValue > 0 ? (val / goal.targetValue) * 100 : 0;
              const isFuture = date > today;
              const isToday  = date === today;
              const bubble   = getBubbleClass(pct, isFuture);

              return (
                <div key={date}
                  className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${bubble} ${
                    isToday ? 'ring-2 ring-orange-500 ring-offset-1' : ''
                  } ${isFuture ? 'opacity-35' : 'cursor-default'}`}>
                  <span className="text-[11px] font-black leading-none">{dayNum}</span>
                  {!isFuture ? (
                    <>
                      <span className="text-[9px] font-bold leading-tight text-center w-full px-0.5 mt-0.5">
                        {isCount
                          ? `${Math.round(val)}/${goal.targetValue}`
                          : `${fmtShort(val)}/${fmtShort(goal.targetValue)}`}
                      </span>
                      <span className="text-[9px] font-black leading-none mt-0.5">
                        ({pct.toFixed(0)}%)
                      </span>
                    </>
                  ) : (
                    <span className="text-[9px] opacity-25">–</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100">
        {[
          { cls: 'bg-emerald-500', label: 'Meta batida (≥100%)' },
          { cls: 'bg-emerald-300', label: '≥ 80%' },
          { cls: 'bg-amber-400',   label: '≥ 50%' },
          { cls: 'bg-red-400',     label: '< 50%' },
          { cls: 'bg-slate-200',   label: 'Futuro' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${cls}`} />
            <span className="text-[10px] text-slate-500 font-bold">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===================== GOAL MODAL =====================
const GoalModal: React.FC<{
  editingGoal: Goal | null;
  defaultPeriod: PeriodTab;
  professionals: any[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}> = ({ editingGoal, defaultPeriod, professionals, onClose, onSubmit }) => {
  const [category, setCategory] = useState<string>(editingGoal?.category || 'faturamento');
  const isCount = category === 'atendimentos';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">

        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">{editingGoal ? 'Editar Meta' : 'Nova Meta'}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Nome */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome da Meta</label>
            <input name="name" defaultValue={editingGoal?.name} required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 outline-none text-sm"
              placeholder="Ex: Faturamento de Abril" />
          </div>

          {/* Categoria + Período */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Categoria</label>
              <select name="category" value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 outline-none text-sm">
                <option value="faturamento">Faturamento Total</option>
                <option value="atendimentos">Total Atendimentos</option>
                <option value="venda_produtos">Venda de Produtos</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Período</label>
              <select name="period" defaultValue={editingGoal?.period || defaultPeriod}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 outline-none text-sm">
                <option value="diário">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
              </select>
            </div>
          </div>

          {/* Profissional */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Profissional (Opcional)</label>
            <select name="professionalId" defaultValue={editingGoal?.professionalId || ''}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-orange-500 outline-none text-sm">
              <option value="">Meta Global (Barbearia Inteira)</option>
              {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Valor Alvo + Datas */}
          <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-4">
            <div>
              <label className="text-xs font-bold text-orange-600 uppercase block mb-1">
                {isCount ? 'Quantidade de Atendimentos (Alvo)' : 'Valor Alvo (R$)'}
              </label>
              <div className="relative">
                {!isCount && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>}
                <input name="targetValue" type="number" step={isCount ? '1' : '0.01'} min="1"
                  defaultValue={editingGoal?.targetValue} required
                  className={`w-full py-2.5 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold ${!isCount ? 'pl-10 pr-4' : 'px-4'}`}
                  placeholder={isCount ? 'Ex: 50' : 'Ex: 5000'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-orange-600 uppercase block mb-1">Data Início</label>
                <input name="startDate" type="date"
                  defaultValue={editingGoal?.startDate || new Date().toLocaleDateString('en-CA')} required
                  className="w-full px-4 py-2.5 border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-orange-600 uppercase block mb-1">Data Fim</label>
                <input name="endDate" type="date"
                  defaultValue={editingGoal?.endDate} required
                  className="w-full px-4 py-2.5 border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">
              Cancelar
            </button>
            <button type="submit"
              className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20">
              {editingGoal ? 'Salvar Alterações' : 'Criar Meta'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ===================== EMPTY STATE =====================
const EmptyState: React.FC<{ period: PeriodTab; onNew: () => void }> = ({ period, onNew }) => {
  const labels: Record<PeriodTab, string> = {
    'diário': 'diárias', 'semanal': 'semanais', 'mensal': 'mensais', 'anual': 'anuais'
  };
  return (
    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
        <Target size={40} className="text-slate-300" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Sem metas {labels[period]}</h3>
      <p className="text-slate-500 max-w-md mx-auto mb-8">
        Crie sua primeira meta {period} e acompanhe o progresso em tempo real.
      </p>
      <button onClick={onNew} className="text-orange-600 font-bold flex items-center gap-2 hover:gap-3 transition-all">
        Criar agora <ArrowRight size={18} />
      </button>
    </div>
  );
};
