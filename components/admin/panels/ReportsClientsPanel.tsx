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
        
        return {
            totalClients,
            activeSubscribers,
            avgTicket: filteredAppointments.length > 0 
                ? filteredAppointments.reduce((acc, a) => acc + a.totalValue, 0) / filteredAppointments.length 
                : 0
        };
    }, [clients, clientSubscriptions, filteredAppointments]);

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Dados para os gráficos (exemplo)
    const monthlyData = [
        { name: 'Jan', atendidos: 40, gastoMedio: 100, novos: 10 },
        { name: 'Fev', atendidos: 30, gastoMedio: 120, novos: 15 },
        { name: 'Mar', atendidos: 50, gastoMedio: 90, novos: 8 },
    ];

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
                        {clients.filter(c => {
                            const lastAppt = appointments.filter(a => a.clientId === c.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                            if (!lastAppt) return true;
                            const diff = new Date().getTime() - new Date(lastAppt.date).getTime();
                            return diff > 30 * 24 * 60 * 60 * 1000;
                        }).length}
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
            
            {/* Ranking de Clientes (Padrão de Lista) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 lg:col-span-2>
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Award size={20} className="text-orange-500" />
                    Top 10 Clientes
                </h3>
                <div className="space-y-2">
                    {clients.slice(0, 10).map((client, index) => (
                        <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-400 w-6">#{index + 1}</span>
                                <span className="font-bold text-slate-900">{client.name}</span>
                            </div>
                            <span className="font-black text-orange-600">{formatCurrency(client.totalSpent || 0)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};