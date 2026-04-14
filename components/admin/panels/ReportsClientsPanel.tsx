import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { Users, TrendingUp, UserPlus, Award, DollarSign, Calendar, UserX } from 'lucide-react';
import { useShop } from '../../../store';

interface ReportsClientsPanelProps {
    dateRange: string;
}

export const ReportsClientsPanel: React.FC<ReportsClientsPanelProps> = ({ dateRange }) => {
    const { appointments, clients, clientSubscriptions, fetchFinancialReport, settings } = useShop();
    const [filteredAppointments, setFilteredAppointments] = useState(appointments);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            const now = new Date();
            let startDate = new Date();
            
            if (dateRange && dateRange.includes('|')) {
                const [startStr, endStr] = dateRange.split('|');
                startDate = new Date(startStr + 'T00:00:00');
                now.setTime(new Date(endStr + 'T23:59:59').getTime());
            } else if (dateRange === '30 dias') startDate.setDate(now.getDate() - 30);
            else if (dateRange === 'Este mês') startDate.setDate(1);
            else if (dateRange === 'Mês passado') {
                startDate.setMonth(now.getMonth() - 1);
                startDate.setDate(1);
                now.setMonth(now.getMonth());
                now.setDate(0);
            } else if (dateRange === 'Semestre') startDate.setMonth(now.getMonth() - 6);
            else if (dateRange === 'Todo o período') startDate = new Date(2000, 0, 1);
            else startDate = new Date(0);

            const data = await fetchFinancialReport(startDate.toISOString().split('T')[0], now.toISOString().split('T')[0]);
            setFilteredAppointments(data);
        };
        loadData();
    }, [dateRange, fetchFinancialReport]);

    const stats = useMemo(() => {
        const activeSubscribers = clientSubscriptions.filter(sub => sub.status === 'active').length;
        const totalClients = clients.length;
        
        // CÁLCULO REAL DE CLIENTES INATIVOS
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const lastAppByClient: Record<string, Date> = {};
        appointments.forEach(app => {
            const clientId = app.clientId || app.clientPhone;
            if (clientId && app.status === 'completed') {
                const appDate = new Date(app.date + 'T12:00:00');
                if (!lastAppByClient[clientId] || appDate > lastAppByClient[clientId]) {
                    lastAppByClient[clientId] = appDate;
                }
            }
        });

        const inactiveClients = Object.values(lastAppByClient).filter(lastDate => lastDate < thirtyDaysAgo).length;

        // NO-SHOW: calculado sobre agendamentos do período filtrado
        const totalFinalized = filteredAppointments.filter(a =>
            a.status === 'completed' || a.status === 'noshow'
        ).length;
        const totalNoShows = filteredAppointments.filter(a => a.status === 'noshow').length;
        const noShowRate = totalFinalized > 0 ? (totalNoShows / totalFinalized) * 100 : 0;

        return {
            totalClients,
            activeSubscribers,
            inactiveClients,
            noShowRate,
            totalNoShows,
            totalFinalized,
            avgTicket: filteredAppointments.length > 0 
                ? filteredAppointments.reduce((acc, a) => acc + a.totalValue, 0) / filteredAppointments.length 
                : 0
        };
    }, [clients, clientSubscriptions, filteredAppointments, appointments]);

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Dados Diários de Clientes Novos (Da Antiga Aba Financeiro)
    const combinedDailyData = useMemo(() => {
        const monthlyDataMap: Record<string, { novos: number, label: string }> = {};

        // Contar clientes novos (criados naquele dia)
        clients.forEach(c => {
            if (!c.createdAt) return;
            const dateStr = c.createdAt.split('T')[0];
            if (!monthlyDataMap[dateStr]) {
                const d = new Date(dateStr + 'T12:00:00');
                monthlyDataMap[dateStr] = { 
                    novos: 0, 
                    label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) 
                };
            }
            monthlyDataMap[dateStr].novos += 1;
        });

        const sortedDailyKeys = Object.keys(monthlyDataMap).sort();
        
        return sortedDailyKeys.map(key => ({
            name: monthlyDataMap[key].label,
            novos: monthlyDataMap[key].novos
        }));
    }, [clients]);

    // Dados Dinâmicos para os gráficos
    const monthlyData = useMemo(() => {
        const dataMap: Record<string, { atendidos: Set<string>, receita: number, novos: number, label: string }> = {};

        // 1. Receita e Atendidos por mês (usando filteredAppointments)
        filteredAppointments.forEach(apt => {
            if (apt.status !== 'completed') return;
            const date = new Date(apt.date + 'T12:00:00');
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            
            if (!dataMap[monthKey]) {
                dataMap[monthKey] = { atendidos: new Set(), receita: 0, novos: 0, label: monthLabel };
            }
            
            dataMap[monthKey].atendidos.add(apt.clientId || apt.clientPhone);
            dataMap[monthKey].receita += apt.totalValue;
        });

        // 2. Novos clientes (usando clients)
        clients.forEach(c => {
            if (!c.createdAt) return;
            const date = new Date(c.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (dataMap[monthKey]) {
                dataMap[monthKey].novos += 1;
            }
        });

        const sortedKeys = Object.keys(dataMap).sort();
        
        return sortedKeys.map(key => {
            const numAtendidos = dataMap[key].atendidos.size;
            return {
                name: dataMap[key].label.charAt(0).toUpperCase() + dataMap[key].label.slice(1),
                atendidos: numAtendidos,
                gastoMedio: numAtendidos > 0 ? (dataMap[key].receita / numAtendidos) : 0,
                novos: dataMap[key].novos
            };
        });
    }, [filteredAppointments, clients]);

    // Tendência mensal de no-shows
    const noShowMonthlyData = useMemo(() => {
        const dataMap: Record<string, { noshow: number; total: number; label: string }> = {};
        filteredAppointments.forEach(apt => {
            if (apt.status !== 'completed' && apt.status !== 'noshow') return;
            const date = new Date(apt.date + 'T12:00:00');
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            if (!dataMap[monthKey]) dataMap[monthKey] = { noshow: 0, total: 0, label };
            dataMap[monthKey].total += 1;
            if (apt.status === 'noshow') dataMap[monthKey].noshow += 1;
        });
        return Object.keys(dataMap).sort().map(k => ({
            name: dataMap[k].label.charAt(0).toUpperCase() + dataMap[k].label.slice(1),
            taxa: dataMap[k].total > 0 ? parseFloat(((dataMap[k].noshow / dataMap[k].total) * 100).toFixed(1)) : 0,
            noShows: dataMap[k].noshow
        }));
    }, [filteredAppointments]);

    if (!isMounted) return null;

    return (
        <div className="w-full space-y-8 animate-fade-in">
            {/* Cards no Padrão Correto */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Users size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total de Clientes</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{stats.totalClients}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Assinantes Ativos</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{stats.activeSubscribers}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                            <Users size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Inativos (&gt;30 dias)</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">
                        {stats.inactiveClients}
                    </div>
                </div>

                {/* Card No-Show */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <UserX size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Taxa de No-Show</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="text-3xl font-black text-slate-900">
                            {stats.noShowRate.toFixed(1)}%
                        </div>
                        {stats.noShowRate >= 15 && (
                            <span className="text-xs font-bold text-red-500 mb-1">⚠ Alta</span>
                        )}
                        {stats.noShowRate > 0 && stats.noShowRate < 15 && (
                            <span className="text-xs font-bold text-green-600 mb-1">✓ Normal</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        {stats.totalNoShows} falta{stats.totalNoShows !== 1 ? 's' : ''} de {stats.totalFinalized} encerrados
                    </p>
                </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Users size={20} className="text-blue-500" />
                        Nº de clientes atendidos por mês
                    </h3>
                    <div className="h-64 w-full">
                        {monthlyData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                                <p>Sem dados disponíveis</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip />
                                    <Bar dataKey="atendidos" fill={settings.primaryColor} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <DollarSign size={20} className="text-orange-500" />
                        Gasto Médio dos Clientes por Mês
                    </h3>
                    <div className="h-64 w-full">
                        {monthlyData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                                <p>Sem dados disponíveis</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Gasto Médio']} />
                                    <Bar dataKey="gastoMedio" fill="#fb923c" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-purple-500" />
                        Clientes Novos (Diário)
                    </h3>
                    <div className="h-64 w-full">
                        {combinedDailyData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                                <p>Sem dados disponíveis</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={combinedDailyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="novos" stroke={settings.primaryColor || '#8b5cf6'} fillOpacity={0.2} fill={settings.primaryColor || '#8b5cf6'} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* Gráfico: Tendência de No-Show */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <UserX size={20} className="text-amber-500" />
                    Taxa de No-Show por Mês
                </h3>
                <p className="text-xs text-slate-400 mb-6">Percentual de agendamentos encerrados sem comparecimento — <span className="text-green-600 font-bold">Verde</span> &lt;8% · <span className="text-amber-500 font-bold">Amarelo</span> 8–14% · <span className="text-red-500 font-bold">Vermelho</span> ≥15%</p>
                {noShowMonthlyData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <UserX size={40} className="text-slate-200" />
                        <p className="text-sm">Sem dados disponíveis</p>
                    </div>
                ) : (
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={noShowMonthlyData} barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} unit="%" tick={{ fontSize: 12 }} domain={[0, (dataMax: number) => Math.max(dataMax + 5, 20)]} />
                                <Tooltip
                                    formatter={(value: number, _: string, props: any) => [
                                        `${value}% (${props.payload.noShows} falta${props.payload.noShows !== 1 ? 's' : ''})`,
                                        'Taxa de No-Show'
                                    ]}
                                />
                                <Bar dataKey="taxa" radius={[6, 6, 0, 0]}>
                                    {noShowMonthlyData.map((entry, index) => (
                                        <Cell
                                            key={index}
                                            fill={entry.taxa >= 15 ? '#ef4444' : entry.taxa >= 8 ? '#f59e0b' : '#22c55e'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
            
            {/* Ranking de Clientes (Padrão cutflow4) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] lg:col-span-1">
                <h3 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                    <Users size={20} className="text-[#1E293B]" />
                    Top Clientes
                </h3>
                <div className="flex flex-col divide-y divide-slate-100">
                    {(() => {
                        const topClients = [...clients].sort((a,b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 5);
                        const maxSpent = Math.max(...topClients.map(c => c.totalSpent || 0), 1); 
                        
                        return topClients.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 text-sm">Sem dados disponíveis</div>
                        ) : topClients.map((client, index) => {
                            let badgeColor = 'bg-slate-200 text-slate-700'; 
                            if (index === 0) badgeColor = 'bg-yellow-400 text-yellow-900';
                            else if (index === 1) badgeColor = 'bg-slate-400 text-white';
                            else if (index === 2) badgeColor = 'bg-[#cd6133] text-white'; 

                            const progressWidth = `${((client.totalSpent || 0) / maxSpent) * 100}%`;
                            
                            // Calcula as visitas com base em client.loyaltyCardCount, com fallback seguro para histórico
                            const visitasCount = appointments.filter(a => (a.clientId === client.id || a.clientPhone === client.phone) && a.status === 'completed').length || client.loyaltyCardCount || 0;

                            return (
                                <div key={index} className="py-4 flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm ${badgeColor}`}>
                                        {index + 1}º
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-[#1E293B] truncate">{client.name}</span>
                                            <span className="font-bold text-[#F16A1B] whitespace-nowrap ml-2">
                                                {formatCurrency(client.totalSpent || 0)}
                                            </span>
                                        </div>
                                        <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-[#F16A1B] h-full rounded-full" style={{ width: progressWidth }}></div>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 text-right">
                                            {visitasCount} visitas
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </div>
    );
};
