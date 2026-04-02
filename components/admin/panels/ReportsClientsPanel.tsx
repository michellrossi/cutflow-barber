import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LineChart, Line } from 'recharts';
import { Users, TrendingUp, UserPlus, Award, DollarSign, Calendar } from 'lucide-react';
import { useShop } from '../../../store';

interface ReportsClientsPanelProps {
    dateRange: string;
}

export const ReportsClientsPanel: React.FC<ReportsClientsPanelProps> = ({ dateRange }) => {
    const { appointments, clients, clientSubscriptions, fetchFinancialReport, settings } = useShop();
    const [filteredAppointments, setFilteredAppointments] = useState(appointments);

    useEffect(() => {
        const loadData = async () => {
            const now = new Date();
            let startDate = new Date();
            
            if (dateRange === '30 dias') startDate.setDate(now.getDate() - 30);
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

        return {
            totalClients,
            activeSubscribers,
            inactiveClients,
            avgTicket: filteredAppointments.length > 0 
                ? filteredAppointments.reduce((acc, a) => acc + a.totalValue, 0) / filteredAppointments.length 
                : 0
        };
    }, [clients, clientSubscriptions, filteredAppointments, appointments]);

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Users size={20} className="text-blue-500" />
                        Nº de clientes atendidos por mês
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="atendidos" fill={settings.primaryColor} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <DollarSign size={20} className="text-orange-500" />
                        Gasto Médio dos Clientes por Mês
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Gasto Médio']} />
                                <Bar dataKey="gastoMedio" fill="#fb923c" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-purple-500" />
                        Clientes Novos por Mês
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="novos" stroke={settings.primaryColor} strokeWidth={3} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {/* Ranking de Clientes (Padrão cutflow4) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] lg:col-span-1">
                <h3 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                    <Users size={20} className="text-[#1E293B]" />
                    Top Clientes
                </h3>
                <div className="flex flex-col divide-y divide-slate-100">
                    {(() => {
                        const topClients = clients.slice(0, 5);
                        const maxSpent = Math.max(...topClients.map(c => c.totalSpent || 0), 1); 
                        
                        return topClients.map((client, index) => {
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