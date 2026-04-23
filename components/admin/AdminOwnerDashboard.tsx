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
    const [chartPlanFilter, setChartPlanFilter] = useState<string>('all');
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
        const mrr = activeList.reduce((sum, s) => sum + (Number(s.monthly_price) || PLAN_PRICE), 0);
        
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
            
            const count = shops.filter(s => {
                const isSameDate = s.created_at && s.created_at.startsWith(dateStr);
                const matchesPlan = chartPlanFilter === 'all' || s.plan === chartPlanFilter;
                return isSameDate && matchesPlan;
            }).length;
            
            chartData.push({ date: displayDate, count });
        }
        return chartData;
    }, [shops, chartPlanFilter]);

    const maxChartValue = Math.max(...last7DaysChart.map((d: any) => d.count), 1);

    const filteredShops = useMemo(() => {
        let filtered = shops;
        if (searchTerm) {
            filtered = filtered.filter(s => 
                s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                s.owner_email?.toLowerCase().includes(searchTerm.toLowerCase())
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

    const updateShopPrice = async (shopId: string, newPrice: number) => {
        setActionLoadingId(shopId + '-price');
        try {
            const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
                ? 'http://localhost:3000' 
                : `https://${window.location.hostname}`;
                
            const res = await fetch(`${serverUrl}/api/saas/shops/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopId, monthly_price: newPrice })
            });
            const result = await res.json();
            
            if (!res.ok) throw new Error(result.error || 'Erro na API');
            
            setShops(prev => prev.map((s: any) => s.id === shopId ? { ...s, monthly_price: newPrice } : s));
        } catch (error: any) {
            console.error('Erro ao atualizar preço:', error);
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
                        InsightBarber Master Admin
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
                                    <th className="px-6 py-4 font-bold text-slate-900 text-center">Mensalidade</th>
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
                                                <span className="text-xs text-slate-500">{shop.owner_email || 'Sem e-mail'}</span>
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
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <div className="relative group/price">
                                                    <input 
                                                        type="number"
                                                        defaultValue={shop.monthly_price || PLAN_PRICE}
                                                        disabled={actionLoadingId === shop.id + '-price'}
                                                        onBlur={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            if (val !== shop.monthly_price) updateShopPrice(shop.id, val);
                                                        }}
                                                        className="w-20 text-center bg-slate-100 border border-transparent hover:border-slate-300 focus:bg-white focus:border-orange-500 rounded px-1 py-1 text-sm font-bold transition-all outline-none"
                                                    />
                                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/price:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                                                        Editar Valor Mensal
                                                    </span>
                                                </div>
                                                <span className="text-slate-400 font-bold text-xs">R$</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <a 
                                                href={`https://wa.me/55${shop.phone?.replace(/\D/g, '') || ''}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="inline-flex items-center justify-center p-2 bg-green-500 text-white hover:bg-green-600 rounded-full transition-colors shadow-sm"
                                                title="Chamar WhatsApp"
                                            >
                                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.063 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                                </svg>
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
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 shrink-0 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <TrendingUp size={20} className="text-orange-500"/>
                                Crescimento Recente
                            </h2>
                            <p className="text-xs text-slate-500 font-medium mt-1">Novas lojas criadas nos últimos 7 dias</p>
                        </div>
                        <select 
                            value={chartPlanFilter}
                            onChange={(e) => setChartPlanFilter(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg text-[10px] font-bold uppercase p-1.5 focus:outline-none"
                        >
                            <option value="all">Filtro</option>
                            <option value="active">Ativos</option>
                            <option value="trial">Trial</option>
                        </select>
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
