import React, { useState, useEffect } from 'react';
import { BarChart, PieChart, TrendingUp, DollarSign, Users, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { DateRangeFilter } from '../ui/DateRangeFilter';
import { useShop } from '../../../store';

export const ReportsFinancePanel: React.FC = () => {
    const { appointments, fetchFinancialReport } = useShop();
    const [dateRange, setDateRange] = useState('30 dias');
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

    const totalRevenue = filteredAppointments.reduce((acc, a) => acc + a.totalValue, 0);
    const totalCommissions = filteredAppointments.reduce((acc, a) => acc + (a.totalValue * 0.5), 0); // Exemplo: 50% comissão
    const profit = totalRevenue - totalCommissions;
    const avgTicket = filteredAppointments.length > 0 ? totalRevenue / filteredAppointments.length : 0;

    const paymentData = [
        { name: 'Cartão', value: filteredAppointments.filter(a => a.paymentMethod === 'credit').length },
        { name: 'Dinheiro', value: filteredAppointments.filter(a => a.paymentMethod === 'cash').length },
        { name: 'Pix', value: filteredAppointments.filter(a => a.paymentMethod === 'pix').length },
    ].filter(d => d.value > 0);

    const COLORS = ['#3b82f6', '#eab308', '#22c55e'];

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <DateRangeFilter onFilterChange={setDateRange} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign size={16} className="text-orange-500" />
                        <h4 className="text-sm font-bold text-slate-500">Faturamento Total</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ {totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-green-500" />
                        <h4 className="text-sm font-bold text-slate-500">Lucro da Loja</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ {profit.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-blue-500" />
                        <h4 className="text-sm font-bold text-slate-500">Comissões</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ {totalCommissions.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-purple-500" />
                        <h4 className="text-sm font-bold text-slate-500">Ticket Médio</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ {avgTicket.toFixed(2)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Formas de Pagamento</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                                <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                    {paymentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
