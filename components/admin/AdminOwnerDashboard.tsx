import React, { useState, useEffect, useMemo } from 'react';
import { useShop } from '../../store';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, DollarSign, TrendingUp, Activity, Smartphone, Calendar, Search, Filter, ShieldCheck, CreditCard, ChevronDown, CheckCircle, XCircle } from 'lucide-react';

export const AdminOwnerDashboard: React.FC = () => {
    const { fetchGlobalShops, formatCurrencyBRL } = useShop();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPlan, setFilterPlan] = useState<string>('all');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    const PLAN_PRICE = 97.00; // Valor base simulado do plano SaaS

    const loadData = async () => {
        setLoading(true);
        const res = await fetchGlobalShops();
        if (res.success && res.data) {
            setShops(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    // KPIs
    const kpis = useMemo(() => {
        const activeList = shops.filter(s => s.plan === 'active');
        const trialList = shops.filter(s => s.plan === 'trial');
        const suspendedList = shops.filter(s => s.plan === 'suspended');
        
        const totalSubscribers = activeList.length;
        const mrr = totalSubscribers * PLAN_PRICE;
        
        // Simulação de Churn: Suspensos / (Ativos + Suspensos + Trial) * 100
        const totalForChurn = shops.length > 0 ? shops.length : 1;
        const churnRate = ((suspendedList.length / totalForChurn) * 100).toFixed(1);

        return { mrr, totalSubscribers, totalTrial: trialList.length, churnRate };
    }, [shops]);

    // Últimos 7 dias cadastros
    const last7DaysChart = useMemo(() => {
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            
            const count = shops.filter(s => s.created_at && s.created_at.startsWith(dateStr)).length;
            chartData.push({ date: displayDate, count });
        }
        return chartData;
    }, [shops]);

    const maxChartValue = Math.max(...last7DaysChart.map((d: any) => d.count), 1);

    const filteredShops = useMemo(() => {
        let filtered = shops;
        if (searchTerm) {
            filtered = filtered.filter(s => 
                s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                s.users?.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (filterPlan !== 'all') {
            filtered = filtered.filter(s => s.plan === filterPlan);
        }
        return filtered;
    }, [shops, searchTerm, filterPlan]);

    const updatePlan = async (shopId: string, newPlan: 'active' | 'trial' | 'suspended') => {
        if (!confirm(`Tem certeza que deseja alterar o plano para ${newPlan.toUpperCase()}?`)) return;
        
        setActionLoadingId(shopId);
        try {
            const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                ? 'http://localhost:3000' 
                : `https://${window.location.hostname}`;
                
            const res = await fetch(`${serverUrl}/api/saas/shops/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopId, plan: newPlan })
            });
            const result = await res.json();
            
            if (!res.ok) throw new Error(result.error || 'Erro na API');
            
            setShops(prev => prev.map((s: any) => s.id === shopId ? { ...s, plan: newPlan } : s));
        } catch (error: any) {
            alert('Erro ao atualizar plano: ' + error.message);
        } finally {
            setActionLoadingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-['Plus_Jakarta_Sans']">
                <div className="flex flex-col items-center animate-pulse">
                    <Activity size={48} className="text-orange-500 mb-4" />
                    <span className="text-slate-500 font-bold tracking-widest uppercase">Carregando painel admin...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans'] p-4 md:p-8 text-slate-900">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-orange-600" size={32} />
                        CutFlow Master Admin
                    </h1>
                    <p className="text-slate-500 font-medium">Monitoramento unificado do crescimento do SaaS.</p>
                </div>
                <button onClick={loadData} className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                    Atualizar Dados
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <DollarSign size={20} />
                        </div>
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">MRR Total</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{formatCurrencyBRL(kpis.mrr)}</p>
                    <p className="text-xs font-medium text-emerald-600 mt-2">Soma de recebíveis</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                            <CheckCircle size={20} />
                        </div>
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Assinantes</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{kpis.totalSubscribers}</p>
                    <p className="text-xs font-medium text-slate-400 mt-2">Lojas no plano Ativo</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Users size={20} />
                        </div>
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Lojas em Trial</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{kpis.totalTrial}</p>
                    <p className="text-xs font-medium text-slate-400 mt-2">Testando a ferramenta</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                            <Activity size={20} />
                        </div>
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Churn Rate</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-900">{kpis.churnRate}%</p>
                    <p className="text-xs font-medium text-slate-400 mt-2">Porcentagem de cancelados</p>
                </motion.div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lojas List */}
                <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50 shrink-0">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Users size={20} className="text-orange-500"/>
                            Lojas e Leads
                        </h2>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar loja ou e-mail..."
                                    value={searchTerm}
                                    onChange={(e: any) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>
                            <select 
                                value={filterPlan} 
                                onChange={(e: any) => setFilterPlan(e.target.value)}
                                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none"
                            >
                                <option value="all">Todos</option>
                                <option value="active">Ativos</option>
                                <option value="trial">Trial</option>
                                <option value="suspended">Suspensos</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto bg-slate-50/20">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-slate-900">Barbearia</th>
                                    <th className="px-6 py-4 font-bold text-slate-900 text-center">Status / Ação</th>
                                    <th className="px-6 py-4 font-bold text-slate-900">Contato</th>
                                    <th className="px-6 py-4 font-bold text-slate-900">Data Base</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredShops.map((shop: any, i: number) => (
                                    <motion.tr 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        key={shop.id} 
                                        className="hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900">{shop.name}</span>
                                                <span className="text-xs text-slate-500">{shop.users?.email || 'Sem e-mail'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    shop.plan === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                                    shop.plan === 'trial' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                                    'bg-red-100 text-red-800 border border-red-200'
                                                }`}>
                                                    {shop.plan || 'desconhecido'}
                                                </span>
                                                
                                                <div className="relative group">
                                                    <button disabled={actionLoadingId === shop.id} className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded">
                                                        <ChevronDown size={14} />
                                                    </button>
                                                    <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden hidden group-hover:block z-20">
                                                        <button onClick={() => updatePlan(shop.id, 'active')} className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50">Ativar Plano</button>
                                                        <button onClick={() => updatePlan(shop.id, 'trial')} className="w-full text-left px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50">Voltar Trial</button>
                                                        <button onClick={() => updatePlan(shop.id, 'suspended')} className="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Suspender</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <a 
                                                href={`https://wa.me/55${shop.phone?.replace(/\D/g, '') || ''}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-bold rounded-lg transition-colors"
                                            >
                                                <Smartphone size={14} />
                                                Chamar WA
                                            </a>
                                            <div className="mt-1 text-[10px] text-slate-400 font-medium">
                                                {shop.whatsapp_connected ? <span className="text-emerald-500">Bot Ativo</span> : <span>Sem Bot</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                <Calendar size={14} />
                                                {new Date(shop.created_at).toLocaleDateString('pt-BR')}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                                {filteredShops.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                            Nenhuma loja encontrada para os filtros aplicados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Growth Chart */}
                <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp size={20} className="text-orange-500"/>
                            Crescimento Recente
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">Novas lojas criadas nos últimos 7 dias</p>
                    </div>
                    
                    <div className="flex-1 p-6 flex items-end justify-between gap-2">
                        {last7DaysChart.map((d: any, i: number) => {
                            const barHeight = Math.max((d.count / maxChartValue) * 100, 5); // min 5% height
                            return (
                                <div key={i} className="flex flex-col items-center gap-3 w-full group">
                                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {d.count}
                                    </span>
                                    <motion.div 
                                        initial={{ height: 0 }}
                                        animate={{ height: `${barHeight}%` }}
                                        transition={{ delay: i * 0.1, duration: 0.5, type: 'spring' }}
                                        className="w-full bg-orange-500 rounded-t-lg group-hover:bg-orange-600 transition-colors relative overflow-hidden"
                                    >
                                        <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/20 to-transparent" />
                                    </motion.div>
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider rotate-[-45deg] origin-top-left mt-2 px-2">
                                        {d.date}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
        </div>
    );
};
