import React, { useState, useMemo } from 'react';
import { useShop } from '../../../store';
import { SubscriptionPlan, ClientSubscription, Client } from '../../../types';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  CreditCard, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar,
  ChevronRight,
  Edit2,
  Trash2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SubscriptionsPanel: React.FC = () => {
  const { 
    subscriptionPlans, 
    clientSubscriptions, 
    clients,
    addSubscriptionPlan,
    updateSubscriptionPlan,
    removeSubscriptionPlan,
    addClientSubscription,
    updateClientSubscription,
    removeClientSubscription,
    settings
  } = useShop();

  const [activeTab, setActiveTab] = useState<'subscribers' | 'plans'>('subscribers');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editingSub, setEditingSub] = useState<ClientSubscription | null>(null);

  // Stats
  const stats = useMemo(() => {
    const active = clientSubscriptions.filter(s => s.status === 'active').length;
    const pending = clientSubscriptions.filter(s => s.status === 'pending').length;
    const inactive = clientSubscriptions.filter(s => s.status === 'inactive' || s.status === 'cancelled').length;
    const totalRevenue = clientSubscriptions
      .filter(s => s.status === 'active')
      .reduce((acc, sub) => {
        const plan = subscriptionPlans.find(p => p.id === sub.planId);
        return acc + (plan?.price || 0);
      }, 0);

    return { active, pending, inactive, totalRevenue };
  }, [clientSubscriptions, subscriptionPlans]);

  // Filtered Data
  const filteredSubscribers = useMemo(() => {
    return clientSubscriptions.filter(sub => {
      const client = clients.find(c => c.id === sub.clientId);
      const plan = subscriptionPlans.find(p => p.id === sub.planId);
      
      const matchesSearch = 
        client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client?.phone.includes(searchQuery) ||
        plan?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [clientSubscriptions, clients, subscriptionPlans, searchQuery, statusFilter]);

  const handleSavePlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const planData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: Number(formData.get('price')),
      servicesPerMonth: Number(formData.get('servicesPerMonth')),
      active: formData.get('active') === 'on'
    };

    if (editingPlan) {
      await updateSubscriptionPlan(editingPlan.id, planData);
    } else {
      await addSubscriptionPlan(planData);
    }
    setIsPlanModalOpen(false);
    setEditingPlan(null);
  };

  const handleSaveSub = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const subData = {
      clientId: formData.get('clientId') as string,
      planId: formData.get('planId') as string,
      status: formData.get('status') as any,
      startDate: formData.get('startDate') as string,
      nextBillingDate: formData.get('nextBillingDate') as string,
      servicesUsedThisMonth: Number(formData.get('servicesUsedThisMonth') || 0)
    };

    if (editingSub) {
      await updateClientSubscription(editingSub.id, subData);
    } else {
      await addClientSubscription(subData);
    }
    setIsSubModalOpen(false);
    setEditingSub(null);
  };

  const handleCreateSuggestedPlans = async () => {
    const suggestedPlans = [
      { name: 'Plano Básico', description: '2 serviços por mês', price: 80, servicesPerMonth: 2, active: true },
      { name: 'Plano Padrão', description: '4 serviços por mês', price: 150, servicesPerMonth: 4, active: true },
      { name: 'Plano VIP', description: 'Serviços ilimitados (8/mês)', price: 250, servicesPerMonth: 8, active: true },
      { name: 'Plano Barba & Cabelo', description: 'Corte e barba 2x no mês', price: 120, servicesPerMonth: 4, active: true },
    ];

    for (const plan of suggestedPlans) {
      await addSubscriptionPlan(plan);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Assinaturas</h2>
            
            Gestão de Assinaturas
          </h2>
          <p className="text-[#6b7d99] text-sm font-medium">Gerencie planos mensais e assinantes da sua barbearia</p>
        </div>
        <div className="flex items-center gap-2">
          {subscriptionPlans.length === 0 && (
            <button 
              onClick={handleCreateSuggestedPlans}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
            >
              <Zap className="w-4 h-4 text-yellow-500" />
              Planos Sugeridos
            </button>
          )}
          <button 
            onClick={() => { setEditingPlan(null); setIsPlanModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
          >
            <Plus className="w-4 h-4" />
            Novo Plano
          </button>
          <button 
            onClick={() => { setEditingSub(null); setIsSubModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            Novo Assinante
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users className="w-5 h-5 text-blue-400" />}
          label="Ativos"
          value={stats.active}
          color="blue"
        />
        <StatCard 
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          label="Pendentes"
          value={stats.pending}
          color="amber"
        />
        <StatCard 
          icon={<AlertCircle className="w-5 h-5 text-red-400" />}
          label="Inativos"
          value={stats.inactive}
          color="red"
        />
        <StatCard 
          icon={<Zap className="w-5 h-5 text-emerald-400" />}
          label="Receita Mensal"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)}
          color="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/50 border border-slate-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'subscribers' 
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Assinantes
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'plans' 
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Planos
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
        {activeTab === 'subscribers' ? (
          <>
            {/* Filters */}
            <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar assinante ou plano..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativos</option>
                  <option value="pending">Pendentes</option>
                  <option value="inactive">Inativos</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Cliente</th>
                    <th className="px-6 py-4 font-semibold">Plano</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Uso (Mês)</th>
                    <th className="px-6 py-4 font-semibold">Próx. Cobrança</th>
                    <th className="px-6 py-4 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredSubscribers.map((sub) => {
                    const client = clients.find(c => c.id === sub.clientId);
                    const plan = subscriptionPlans.find(p => p.id === sub.planId);
                    
                    return (
                      <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-orange-500 font-bold border border-slate-700">
                              {client?.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-white font-medium">{client?.name || 'Cliente Removido'}</div>
                              <div className="text-slate-500 text-sm">{client?.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white">{plan?.name || 'Plano Removido'}</div>
                          <div className="text-orange-500 text-sm font-medium">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan?.price || 0)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={sub.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-md overflow-hidden max-w-[80px]">
                              <div 
                                className={`h-full rounded-sm ${
                                  (sub.servicesUsedThisMonth / (plan?.servicesPerMonth || 1)) > 0.8 ? 'bg-red-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, (sub.servicesUsedThisMonth / (plan?.servicesPerMonth || 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-400">
                              {sub.servicesUsedThisMonth}/{plan?.servicesPerMonth}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString('pt-BR') : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => { setEditingSub(sub); setIsSubModalOpen(true); }}
                              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => { if(confirm('Excluir assinatura?')) removeClientSubscription(sub.id); }}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSubscribers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        Nenhum assinante encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptionPlans.map((plan) => (
              <div key={plan.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 relative group overflow-hidden">
                {!plan.active && (
                  <div className="absolute top-4 right-4 bg-red-500/10 text-red-500 text-[10px] uppercase font-bold px-2 py-1 rounded-sm border border-red-500/20">
                    Inativo
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                    <p className="text-slate-400 text-sm line-clamp-1">{plan.description}</p>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Preço Mensal</span>
                    <span className="text-white font-bold text-xl">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Serviços inclusos</span>
                    <span className="text-orange-500 font-bold">{plan.servicesPerMonth} por mês</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-700/50">
                  <button 
                    onClick={() => { setEditingPlan(plan); setIsPlanModalOpen(true); }}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => { if(confirm('Excluir plano?')) removeSubscriptionPlan(plan.id); }}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <button 
              onClick={() => { setEditingPlan(null); setIsPlanModalOpen(true); }}
              className="border-2 border-dashed border-slate-800 hover:border-orange-500/50 hover:bg-orange-500/5 rounded-lg p-6 flex flex-col items-center justify-center gap-3 transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-orange-500 group-hover:scale-110 transition-all">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-slate-500 group-hover:text-orange-500 font-medium">Criar Novo Plano</span>
            </button>
          </div>
        )}
      </div>

      {/* Plan Modal */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPlanModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-xl font-bold text-white">{editingPlan ? 'Editar Plano' : 'Novo Plano'}</h3>
              </div>
              <form onSubmit={handleSavePlan} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Nome do Plano</label>
                  <input
                    name="name"
                    defaultValue={editingPlan?.name}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                    placeholder="Ex: Plano VIP Mensal"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Descrição</label>
                  <textarea
                    name="description"
                    defaultValue={editingPlan?.description}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all resize-none h-20"
                    placeholder="O que está incluso no plano?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Preço (R$)</label>
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={editingPlan?.price}
                      required
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Serviços/Mês</label>
                    <input
                      name="servicesPerMonth"
                      type="number"
                      defaultValue={editingPlan?.servicesPerMonth}
                      required
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    name="active"
                    id="plan-active"
                    defaultChecked={editingPlan ? editingPlan.active : true}
                    className="w-4 h-4 rounded-sm border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500/20"
                  />
                  <label htmlFor="plan-active" className="text-sm text-slate-300">Plano Ativo</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsPlanModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-orange-500/20"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subscriber Modal */}
      <AnimatePresence>
        {isSubModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800">
                <h3 className="text-xl font-bold text-white">{editingSub ? 'Editar Assinatura' : 'Nova Assinatura'}</h3>
              </div>
              <form onSubmit={handleSaveSub} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Cliente</label>
                  <select
                    name="clientId"
                    defaultValue={editingSub?.clientId}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Plano</label>
                  <select
                    name="planId"
                    defaultValue={editingSub?.planId}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                  >
                    <option value="">Selecione um plano</option>
                    {subscriptionPlans.filter(p => p.active || p.id === editingSub?.planId).map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Status</label>
                    <select
                      name="status"
                      defaultValue={editingSub?.status || 'active'}
                      required
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                    >
                      <option value="active">Ativo</option>
                      <option value="pending">Pendente</option>
                      <option value="inactive">Inativo</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Serviços Usados</label>
                    <input
                      name="servicesUsedThisMonth"
                      type="number"
                      defaultValue={editingSub?.servicesUsedThisMonth || 0}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Data Início</label>
                    <input
                      name="startDate"
                      type="date"
                      defaultValue={editingSub?.startDate || new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Próx. Cobrança</label>
                    <input
                      name="nextBillingDate"
                      type="date"
                      defaultValue={editingSub?.nextBillingDate}
                      required
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsSubModalOpen(false)}
                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-orange-500/20"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'amber' | 'red' | 'emerald';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
    red: 'bg-red-500/10 border-red-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="text-slate-400 text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { label: string, classes: string, icon: React.ReactNode }> = {
    active: { 
      label: 'Ativo', 
      classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      icon: <CheckCircle2 className="w-3 h-3" />
    },
    pending: { 
      label: 'Pendente', 
      classes: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      icon: <Clock className="w-3 h-3" />
    },
    inactive: { 
      label: 'Inativo', 
      classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      icon: <AlertCircle className="w-3 h-3" />
    },
    cancelled: { 
      label: 'Cancelado', 
      classes: 'bg-red-500/10 text-red-500 border-red-500/20',
      icon: <XCircle className="w-3 h-3" />
    },
  };

  const config = configs[status] || configs.inactive;

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${config.classes} w-fit`}>
      {config.icon}
      {config.label}
    </div>
  );
};
