import React, { useState, useEffect } from 'react';
import { useShop } from '../../../store';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Scissors, DollarSign, TrendingUp } from 'lucide-react';

interface ReportsServicesPanelProps {
    dateRange: string;
}

export const ReportsServicesPanel: React.FC<ReportsServicesPanelProps> = ({ dateRange }) => {
    const { services, fetchFinancialReport } = useShop();
    const [filteredAppointments, setFilteredAppointments] = useState<any[]>([]);

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

    const serviceStats = services.map(service => {
        const appts = filteredAppointments.filter(a => a.serviceIds.includes(service.id) && a.status === 'completed');
        const totalRevenue = appts.reduce((acc, a) => acc + (service.price || 0), 0);
        return {
            name: service.name,
            realizados: appts.length,
            lucrativos: totalRevenue
        };
    });

    const monthlyServices = React.useMemo(() => {
        const dataMap: Record<string, { total: number, label: string }> = {};

        filteredAppointments.forEach(apt => {
            if (apt.status !== 'completed') return;
            const date = new Date(apt.date + 'T12:00:00');
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            
            if (!dataMap[monthKey]) {
                dataMap[monthKey] = { total: 0, label: monthLabel };
            }
            dataMap[monthKey].total += 1; // Executados neste mês
        });

        const sortedKeys = Object.keys(dataMap).sort();
        return sortedKeys.map(key => ({
            name: dataMap[key].label.charAt(0).toUpperCase() + dataMap[key].label.slice(1),
            total: dataMap[key].total
        }));
    }, [filteredAppointments]);

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-orange-500" />
                    Serviços Executados por Mês
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyServices}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="total" fill="#f97316" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
                    <h3 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                        <Scissors size={20} className="text-[#1E293B]" />
                        Serviços Mais Realizados
                    </h3>
                    <div className="flex flex-col divide-y divide-slate-100 max-h-96 overflow-y-auto no-scrollbar">
                        {(() => {
                            const sorted = [...serviceStats].sort((a, b) => b.realizados - a.realizados).slice(0, 5);
                            const maxVal = Math.max(...sorted.map(s => s.realizados), 1);
                            
                            return sorted.map((s, index) => {
                                let badgeColor = 'bg-slate-200 text-slate-700'; // 4º+
                                if (index === 0) badgeColor = 'bg-yellow-400 text-yellow-900'; // 1º
                                else if (index === 1) badgeColor = 'bg-slate-400 text-white'; // 2º
                                else if (index === 2) badgeColor = 'bg-[#cd6133] text-white'; // 3º Laranja queimado

                                const progressWidth = `${(s.realizados / maxVal) * 100}%`;

                                return (
                                    <div key={s.name} className="py-4 flex items-center gap-4 pr-2">
                                        <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm ${badgeColor}`}>
                                            {index + 1}º
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-medium text-[#1E293B] truncate">{s.name}</span>
                                                <span className="font-bold text-[#F16A1B] whitespace-nowrap ml-2">
                                                    {s.realizados}
                                                </span>
                                            </div>
                                            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-[#F16A1B] h-full rounded-full" style={{ width: progressWidth }}></div>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 text-right">
                                                execuções
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
                    <h3 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                        <DollarSign size={20} className="text-[#1E293B]" />
                        Serviços Mais Lucrativos
                    </h3>
                    <div className="flex flex-col divide-y divide-slate-100 max-h-96 overflow-y-auto no-scrollbar">
                        {(() => {
                            const sorted = [...serviceStats].sort((a, b) => b.lucrativos - a.lucrativos).slice(0, 5);
                            const maxVal = Math.max(...sorted.map(s => s.lucrativos), 1);
                            
                            return sorted.map((s, index) => {
                                let badgeColor = 'bg-slate-200 text-slate-700'; // 4º+
                                if (index === 0) badgeColor = 'bg-yellow-400 text-yellow-900'; // 1º
                                else if (index === 1) badgeColor = 'bg-slate-400 text-white'; // 2º
                                else if (index === 2) badgeColor = 'bg-[#cd6133] text-white'; // 3º Laranja queimado

                                const progressWidth = `${(s.lucrativos / maxVal) * 100}%`;

                                return (
                                    <div key={s.name} className="py-4 flex items-center gap-4 pr-2">
                                        <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm ${badgeColor}`}>
                                            {index + 1}º
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-medium text-[#1E293B] truncate">{s.name}</span>
                                                <span className="font-bold text-[#F16A1B] whitespace-nowrap ml-2">
                                                    R$ {s.lucrativos.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-[#F16A1B] h-full rounded-full" style={{ width: progressWidth }}></div>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 text-right">
                                                faturado
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
};
