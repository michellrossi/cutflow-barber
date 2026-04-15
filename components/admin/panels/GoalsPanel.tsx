import React, { useState, useMemo, useEffect } from 'react';
import { useShop } from '../../../store';
import { Goal } from '../../../types';
import { 
  Target, 
  TrendingUp, 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  BarChart3, 
  Trophy, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Edit2,
  DollarSign,
  Briefcase,
  Package,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export const GoalsPanel: React.FC = () => {
  const { goals, professionals, upsertGoal, removeGoal, calculateGoalProgress, settings } = useShop();
  
  const [activeTab, setActiveTab] = useState<'ativos' | 'historico'>('ativos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Filtros
  const activeGoals = useMemo(() => {
    const now = new Date().toISOString().split('T')[0];
    return goals.filter(g => g.endDate >= now).sort((a,b) => a.endDate.localeCompare(b.endDate));
  }, [goals]);

  const pastGoals = useMemo(() => {
    const now = new Date().toISOString().split('T')[0];
    return goals.filter(g => g.endDate < now).sort((a,b) => b.endDate.localeCompare(a.endDate));
  }, [goals]);

  const displayedGoals = activeTab === 'ativos' ? activeGoals : pastGoals;

  // Insights globais
  const totalInGoals = activeGoals.length;
  const completedGoals = activeGoals.filter(g => calculateGoalProgress(g).percentage >= 100).length;

  const handleSaveGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const goalData = {
      id: editingGoal?.id,
      name: formData.get('name') as string,
      category: formData.get('category') as any,
      targetValue: Number(formData.get('targetValue')),
      period: formData.get('period') as any,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      professionalId: (formData.get('professionalId') as string) || undefined
    };

    const res = await upsertGoal(goalData);
    if (res.success) {
      setIsModalOpen(false);
      setEditingGoal(null);
    }
  };

  return (
    <div className="p-1">
      {/* 1. Cabeçalho e Descrição */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Gestão de Metas</h2>
        <p className="text-[#6b7d99] text-sm font-medium">
          Defina objetivos de faturamento e acompanhe a performance da sua equipe.
        </p>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <InsightCard 
          icon={<Target className="text-blue-500" />}
          label="Metas Ativas"
          value={totalInGoals.toString()}
          subtitle="Objetivos em andamento"
        />
        <InsightCard 
          icon={<Trophy className="text-orange-500" />}
          label="Concluídas"
          value={completedGoals.toString()}
          subtitle="Sucesso este mês"
        />
        <InsightCard 
          icon={<TrendingUp className="text-emerald-500" />}
          label="Taxa de Sucesso"
          value={totalInGoals > 0 ? `${((completedGoals / totalInGoals) * 100).toFixed(0)}%` : '0%'}
          subtitle="Aproveitamento geral"
        />
      </div>

      {/* 2. Sub-menu Estilo 'Interruptor' (Tabs) */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-8 overflow-x-auto no-scrollbar max-w-full">
        <button
          onClick={() => setActiveTab('ativos')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'ativos' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Target size={18} /> Metas Ativas
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'historico' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BarChart3 size={18} /> Histórico
        </button>
      </div>

      {/* Ações */}
      <div className="flex justify-end mb-6">
        <button 
          onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
        >
          <Plus size={20} /> Criar Nova Meta
        </button>
      </div>

      {/* 3. Visualização de Progresso (Grid) */}
      {displayedGoals.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Target size={40} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Sem metas no horizonte?</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-8">
                "O que não pode ser medido, não pode ser gerenciado." Defina sua primeira meta agora e impulsione seu negócio!
            </p>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="text-orange-600 font-bold flex items-center gap-2 hover:gap-3 transition-all"
            >
                Começar agora <ArrowRight size={18} />
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayedGoals.map(goal => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              professionals={professionals}
              calculateProgress={calculateGoalProgress}
              onEdit={() => { setEditingGoal(goal); setIsModalOpen(true); }}
              onDelete={() => { if(confirm('Excluir esta meta?')) removeGoal(goal.id); }}
            />
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">{editingGoal ? 'Editar Meta' : 'Configurar Nova Meta'}</h3>
              </div>
              
              <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome da Meta</label>
                  <input name="name" defaultValue={editingGoal?.name} required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-orange-500 outline-none" placeholder="Ex: Meta de Vendas Mensal" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                    <select name="category" defaultValue={editingGoal?.category || 'faturamento'} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-orange-500 outline-none">
                      <option value="faturamento">Faturamento Total</option>
                      <option value="atendimentos">Total Atendimentos</option>
                      <option value="venda_produtos">Venda de Produtos</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Período</label>
                    <select name="period" defaultValue={editingGoal?.period || 'mensal'} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-orange-500 outline-none">
                      <option value="diário">Diário</option>
                      <option value="semanal">Semanal</option>
                      <option value="mensal">Mensal</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Profissional (Opcional)</label>
                  <select name="professionalId" defaultValue={editingGoal?.professionalId || ''} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:border-orange-500 outline-none">
                    <option value="">Meta Global (Barbearia Inteira)</option>
                    {professionals.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 bg-orange-50 rounded-xl space-y-4 border border-orange-100">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-orange-600 uppercase">Valor do Objetivo (Alvo)</label>
                    <input name="targetValue" type="number" step="0.01" defaultValue={editingGoal?.targetValue} required className="w-full px-4 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="R$ 0,00" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-orange-600 uppercase">Data Início</label>
                      <input name="startDate" type="date" defaultValue={editingGoal?.startDate || new Date().toISOString().split('T')[0]} required className="w-full px-4 py-2 border border-orange-200 rounded-lg outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-orange-600 uppercase">Data Fim</label>
                      <input name="endDate" type="date" defaultValue={editingGoal?.endDate} required className="w-full px-4 py-2 border border-orange-200 rounded-lg outline-none" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20">Salvar Meta</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Componentes Auxiliares
const InsightCard: React.FC<{ icon: React.ReactNode, label: string, value: string, subtitle: string }> = ({ icon, label, value, subtitle }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-3xl font-black text-slate-900 mb-1">{value}</div>
    <div className="text-xs text-slate-400 font-medium">{subtitle}</div>
  </div>
);

const GoalCard: React.FC<{ 
  goal: Goal, 
  professionals: any[], 
  calculateProgress: any, 
  onEdit: () => void, 
  onDelete: () => void 
}> = ({ goal, professionals, calculateProgress, onEdit, onDelete }) => {
  const { percentage, remaining, status } = calculateProgress(goal);
  const pro = professionals.find(p => p.id === goal.professionalId);

  // Previsão
  const prediction = useMemo(() => {
    const start = new Date(goal.startDate);
    const end = new Date(goal.endDate);
    const now = new Date();
    
    const totalDays = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24), 1);
    const daysPassed = Math.max((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24), 0.1);
    
    const pace = goal.currentValue / daysPassed;
    const predicted = pace * totalDays;
    const onTrack = predicted >= goal.targetValue;

    return { predicted, onTrack };
  }, [goal]);

  useEffect(() => {
    if (percentage >= 100) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ea580c', '#fb923c', '#fdba74']
      });
    }
  }, [percentage]);

  const colorMap = {
    critical: 'bg-red-500',
    warning: 'bg-amber-500',
    good: 'bg-emerald-500'
  };

  const getCategoryIcon = () => {
    switch (goal.category) {
      case 'faturamento': return <DollarSign size={14} />;
      case 'atendimentos': return <Briefcase size={14} />;
      case 'venda_produtos': return <Package size={14} />;
      default: return <Target size={14} />;
    }
  };

  return (
    <motion.div 
      layout
      className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:bg-orange-50 transition-colors" />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-orange-50 text-orange-600`}>
              {getCategoryIcon()}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors uppercase text-sm">{goal.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                {goal.period} • {pro ? `Prof: ${pro.name}` : 'Global'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg"><Edit2 size={16} /></button>
            <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
          </div>
        </div>

        {/* Progress Display */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <span className="text-3xl font-black text-slate-900">{percentage.toFixed(0)}%</span>
              <span className="text-xs font-bold text-slate-400 uppercase ml-2">concluído</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 uppercase block">Alvo</span>
              <span className="font-black text-slate-700">
                {goal.category === 'atendimentos' ? goal.targetValue : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.targetValue)}
              </span>
            </div>
          </div>
          
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full shadow-sm ${colorMap[status]}`}
            />
          </div>
        </div>

        {/* Footer Info */}
        <div className="grid grid-cols-2 gap-4 items-center pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Faltam {remaining.toFixed(0)} {goal.category === 'atendimentos' ? 'itens' : 'R$'}</span>
          </div>
          
          {/* Prediction Badge */}
          <div className={`flex items-center justify-end gap-1.5`}>
            {prediction.onTrack ? (
              <div className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase flex items-center gap-1">
                <TrendingUp size={10} /> No Caminho
              </div>
            ) : (
              <div className="px-2 py-1 rounded bg-red-50 text-red-600 text-[10px] font-black uppercase flex items-center gap-1">
                <AlertCircle size={10} /> Abaixo do ritmo
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
