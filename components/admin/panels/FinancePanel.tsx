import React, { useMemo, useState, useEffect } from 'react';
import { useShop } from '../../../store';
import { DollarSign, TrendingUp, Users, Calendar, Award, ArrowUpRight, PieChart, Wallet, Filter, Loader2, RefreshCw } from 'lucide-react';
import { Appointment } from '../../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Custom Tooltip para o Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                <p className="text-slate-400 text-xs mb-1 font-bold">{label}</p>
                <p className="text-orange-500 font-bold text-sm">
                    R$ {payload[0].value.toFixed(2)}
                </p>
            </div>
        );
    }
    return null;
};

export const FinancePanel: React.FC = () => {
    const { professionals, fetchFinancialReport, settings } = useShop();
    
    // Filtros de Data
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    
    // Estado local para relatório
    const [reportAppointments, setReportAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Carregar dados quando as datas mudam
    const loadReport = async () => {
        setIsLoading(true);
        const data = await fetchFinancialReport(startDate, endDate);
        setReportAppointments(data);
        setIsLoading(false);
    };

    // Carregar na montagem inicial
    useEffect(() => {
        loadReport();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Atalhos de Data
    const setPreset = (type: '30days' | 'thisMonth' | 'lastMonth' | 'semester') => {
        const end = new Date();
        const start = new Date();
        
        if (type === '30days') {
            start.setDate(end.getDate() - 30);
        } else if (type === 'thisMonth') {
            start.setDate(1);
        } else if (type === 'lastMonth') {
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            end.setDate(0); // Último dia do mês anterior
        } else if (type === 'semester') {
            start.setMonth(start.getMonth() - 6);
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
        // Trigger load via effect or manual call? 
        // Better manual call in next render or simple useEffect dependency on dates
        // But useEffect on dates might cause double fetch on manual inputs. 
        // Let's rely on the user clicking "Filtrar" for manual inputs, 
        // but for presets we trigger load immediately after state update (handled by effect if we added deps, but let's do manual trigger for control)
    };

    // Processamento de Dados Financeiros
    const stats = useMemo(() => {
        // 1. Filtrar apenas finalizados
        const completed = reportAppointments.filter(a => a.status === 'completed');
        
        // 2. Totais Gerais
        let totalRevenue = 0;
        let totalCommission = 0;
        let totalOwnerShare = 0;

        completed.forEach(app => {
            totalRevenue += app.totalValue;
            
            // Calcular comissão do profissional responsável
            if (app.professionalId) {
                const pro = professionals.find(p => p.id === app.professionalId);
                const rate = pro?.commissionPercentage ?? 50; // Default 50%
                const commission = app.totalValue * (rate / 100);
                totalCommission += commission;
                totalOwnerShare += (app.totalValue - commission);
            } else {
                // Se não tem profissional (improvável se completado), vai 100% pra loja
                totalOwnerShare += app.totalValue;
            }
        });

        const totalCount = completed.length;
        const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

        // 3. Agrupamento por Data (Gráfico de Evolução)
        const revenueByDate: Record<string, number> = {};
        completed.forEach(app => {
            revenueByDate[app.date] = (revenueByDate[app.date] || 0) + app.totalValue;
        });

        // Ordenar datas e preencher array para o gráfico
        const sortedDates = Object.keys(revenueByDate).sort();
        const chartData = sortedDates.map(date => ({
            date,
            displayDate: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            value: revenueByDate[date]
        }));

        // 4. Ranking de Profissionais
        const proRanking: Record<string, { name: string, value: number, count: number, photo: string }> = {};
        
        completed.forEach(app => {
            const proId = app.professionalId || 'unknown';
            if (!proRanking[proId]) {
                const pro = professionals.find(p => p.id === proId);
                proRanking[proId] = {
                    name: pro ? pro.name : 'Sem preferência / Deletado',
                    photo: pro ? pro.photoUrl : '',
                    value: 0,
                    count: 0
                };
            }
            proRanking[proId].value += app.totalValue;
            proRanking[proId].count += 1;
        });

        const sortedPros = Object.values(proRanking).sort((a, b) => b.value - a.value);

        return {
            totalRevenue,
            totalCommission,
            totalOwnerShare,
            totalCount,
            avgTicket,
            chartData,
            sortedPros
        };

    }, [reportAppointments, professionals]);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Controle Financeiro</h2>
                    <p className="text-slate-400">Visão geral de faturamento e desempenho.</p>
                </div>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col lg:flex-row gap-4 justify-between items-center">
                
                {/* Atalhos */}
                <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 hide-scrollbar">
                    <button onClick={() => setPreset('30days')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white font-medium whitespace-nowrap transition-colors">Últimos 30 dias</button>
                    <button onClick={() => setPreset('thisMonth')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white font-medium whitespace-nowrap transition-colors">Este Mês</button>
                    <button onClick={() => setPreset('lastMonth')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white font-medium whitespace-nowrap transition-colors">Mês Passado</button>
                    <button onClick={() => setPreset('semester')} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white font-medium whitespace-nowrap transition-colors">Semestre</button>
                </div>

                {/* Seletores Manuais */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-700 w-full sm:w-auto">
                        <Calendar size={14} className="text-slate-500 ml-2" />
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-slate-300 text-sm focus:outline-none py-1.5 px-2 w-full sm:w-auto"
                        />
                        <span className="text-slate-600">-</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-slate-300 text-sm focus:outline-none py-1.5 px-2 w-full sm:w-auto"
                        />
                    </div>
                    <button 
                        onClick={loadReport}
                        disabled={isLoading}
                        className="w-full sm:w-auto px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Filtrar
                    </button>
                </div>
            </div>

            {/* LOADING STATE OVERLAY */}
            <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {/* Faturamento Total */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 border border-blue-500/20">
                                <DollarSign size={20} />
                            </div>
                            <span className="text-slate-400 font-medium text-sm">Faturamento Bruto</span>
                        </div>
                        <div className="text-2xl font-bold text-white mt-2">
                            R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Lucro da Loja (Owner Share) */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-500/10 rounded-lg text-green-500 border border-green-500/20">
                                <Wallet size={20} />
                            </div>
                            <span className="text-slate-400 font-medium text-sm">Lucro da Loja</span>
                        </div>
                        <div className="text-2xl font-bold text-green-400 mt-2">
                            R$ {stats.totalOwnerShare.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Comissões a Pagar */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 border border-orange-500/20">
                                <PieChart size={20} />
                            </div>
                            <span className="text-slate-400 font-medium text-sm">Comissões (Equipe)</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-400 mt-2">
                            R$ {stats.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Ticket Médio */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden group">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500 border border-purple-500/20">
                                <Award size={20} />
                            </div>
                            <span className="text-slate-400 font-medium text-sm">Ticket Médio</span>
                        </div>
                        <div className="text-2xl font-bold text-white mt-2">
                            R$ {stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* Gráfico de Barras e Ranking */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Gráfico de Evolução Diária */}
                    <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-6">Evolução do Faturamento</h3>
                        
                        {stats.chartData.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-slate-500 h-64">
                                Sem dados financeiros para o período.
                            </div>
                        ) : (
                            <div className="w-full h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                                        <XAxis 
                                            dataKey="displayDate" 
                                            stroke="#94a3b8" 
                                            fontSize={12} 
                                            tickLine={false} 
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis 
                                            stroke="#94a3b8" 
                                            fontSize={12} 
                                            tickLine={false} 
                                            axisLine={false}
                                            tickFormatter={(value) => `R$${value}`}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.2}} />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {stats.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={settings.primaryColor || '#f97316'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Ranking de Profissionais */}
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
                        <h3 className="text-lg font-bold text-white mb-4">Top Profissionais</h3>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 max-h-[300px]">
                            {stats.sortedPros.length === 0 ? (
                                <p className="text-slate-500 text-sm">Nenhum dado disponível.</p>
                            ) : (
                                stats.sortedPros.map((pro, idx) => (
                                    <div key={idx} className="flex items-center gap-3 pb-3 border-b border-slate-700/50 last:border-0 last:pb-0">
                                        <div className="relative">
                                            <img src={pro.photo || 'https://via.placeholder.com/40'} alt={pro.name} className="w-10 h-10 rounded-full object-cover border border-slate-600" />
                                            {idx < 3 && (
                                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : 'bg-orange-700'}`}>
                                                    {idx + 1}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-white truncate max-w-[120px]">{pro.name}</span>
                                                <span className="text-sm font-bold text-green-400">R$ {pro.value.toFixed(0)}</span>
                                            </div>
                                            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className="bg-green-500 h-full rounded-full" 
                                                    style={{ width: `${(pro.value / (stats.totalRevenue || 1)) * 100}%` }}
                                                ></div>
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500 text-right">
                                                {pro.count} atendimentos
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};