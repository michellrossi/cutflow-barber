import React, { useMemo } from 'react';
import { useShop } from '../../../store';
import { DollarSign, TrendingUp, Users, Calendar, Award, ArrowUpRight, PieChart, Wallet } from 'lucide-react';

export const FinancePanel: React.FC = () => {
    const { appointments, professionals, services, settings } = useShop();

    // Processamento de Dados Financeiros
    const stats = useMemo(() => {
        // 1. Filtrar apenas finalizados
        const completed = appointments.filter(a => a.status === 'completed');
        
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
                // Se não tem profissional (improvável se completado), vai 100% pra loja?
                // Vamos assumir 100% pra loja para simplificar
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

        // Calcular altura das barras (normalização)
        const maxValue = Math.max(...chartData.map(d => d.value), 1); // Evitar div por zero

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
            maxValue,
            sortedPros
        };

    }, [appointments, professionals]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Controle Financeiro</h2>
                    <p className="text-slate-400">Visão geral de faturamento e desempenho.</p>
                </div>
                <div className="px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 text-xs text-slate-400 flex items-center gap-2">
                    <Calendar size={14} />
                    <span>Dados dos últimos 30 dias</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                        <div className="flex items-end justify-between gap-2 h-64 w-full border-b border-slate-700 pb-2">
                            {stats.chartData.map((data, idx) => {
                                const heightPercentage = (data.value / stats.maxValue) * 100;
                                return (
                                    <div key={idx} className="flex flex-col items-center justify-end h-full gap-2 flex-1 group relative">
                                        {/* Tooltip */}
                                        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-slate-900 border border-slate-600 text-white text-xs py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                                            R$ {data.value.toFixed(2)}
                                        </div>
                                        
                                        {/* Bar */}
                                        <div 
                                            className="w-full max-w-[40px] bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-sm hover:brightness-110 transition-all cursor-pointer relative"
                                            style={{ height: `${heightPercentage}%`, minHeight: '4px', opacity: 0.9 }}
                                        ></div>
                                        
                                        {/* Label */}
                                        <span className="text-[10px] text-slate-500 font-medium -rotate-45 lg:rotate-0 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center">
                                            {data.displayDate}
                                        </span>
                                    </div>
                                );
                            })}
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
    );
};