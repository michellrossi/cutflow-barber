import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, PieChart, TrendingUp, DollarSign, Users, Clock, Wallet, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { useShop } from '../../../store';

interface ReportsFinancePanelProps {
    dateRange: string;
}

export const ReportsFinancePanel: React.FC<ReportsFinancePanelProps> = ({ dateRange }) => {
    const { appointments, fetchFinancialReport, settings } = useShop();
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
        const completed = filteredAppointments.filter(a => a.status === 'completed');
        const totalRevenue = completed.reduce((acc, a) => acc + a.totalValue, 0);
        const totalCommissions = completed.reduce((acc, a) => acc + (a.totalValue * 0.5), 0);
        const profit = totalRevenue - totalCommissions;
        const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

        // Agrupamento por Data (Gráfico de Evolução)
        const revenueByDate: Record<string, number> = {};
        completed.forEach(app => {
            revenueByDate[app.date] = (revenueByDate[app.date] || 0) + app.totalValue;
        });

        const sortedDates = Object.keys(revenueByDate).sort();
        const chartData = sortedDates.map(date => ({
            date,
            displayDate: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            value: revenueByDate[date]
        }));

        const paymentData = [
            { name: 'Cartão', value: completed.filter(a => a.paymentMethod === 'credit').length, color: '#3b82f6' },
            { name: 'Dinheiro', value: completed.filter(a => a.paymentMethod === 'cash').length, color: '#eab308' },
            { name: 'Pix', value: completed.filter(a => a.paymentMethod === 'pix').length, color: '#22c55e' },
        ].filter(d => d.value > 0);

        return { totalRevenue, totalCommissions, profit, avgTicket, chartData, paymentData };
    }, [filteredAppointments]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={16} className="text-orange-500" />
                        <h4 className="text-sm font-bold text-slate-500">Faturamento Total</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ {stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-green-500" />
                        <h4 className="text-sm font-bold text-slate-500">Lucro da Loja</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ {stats.profit.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-blue-500" />
                        <h4 className="text-sm font-bold text-slate-500">Comissões</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ {stats.totalCommissions.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-purple-500" />
                        <h4 className="text-sm font-bold text-slate-500">Ticket Médio</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ {stats.avgTicket.toFixed(2)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-orange-500" />
                        Evolução do Faturamento
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={settings.primaryColor || '#f97316'} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={settings.primaryColor || '#f97316'} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="displayDate" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="value" stroke={settings.primaryColor || '#f97316'} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <PieChartIcon size={20} className="text-orange-500" />
                        Formas de Pagamento
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                                <Pie data={stats.paymentData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                    {stats.paymentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
