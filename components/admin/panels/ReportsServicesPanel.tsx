import React from 'react';
import { useShop } from '../../../store';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { DateRangeFilter } from '../ui/DateRangeFilter';
import { Scissors, DollarSign, TrendingUp } from 'lucide-react';

export const ReportsServicesPanel: React.FC = () => {
    const { appointments, services } = useShop();

    // Data for services
    const serviceStats = services.map(service => {
        const appts = appointments.filter(a => a.serviceIds.includes(service.id) && a.status === 'completed');
        const totalRevenue = appts.reduce((acc, a) => acc + (service.price || 0), 0);
        return {
            name: service.name,
            realizados: appts.length,
            lucrativos: totalRevenue
        };
    });

    // Mock data for monthly services
    const monthlyServices = [
        { name: 'Jan', total: 150 },
        { name: 'Fev', total: 180 },
        { name: 'Mar', total: 200 },
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <DateRangeFilter />
            </div>
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
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Scissors size={20} className="text-orange-500" />
                        Serviços Mais Realizados
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                        {serviceStats.sort((a, b) => b.realizados - a.realizados).map((s, index) => (
                            <div key={s.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-900">{index + 1}. {s.name}</span>
                                <span className="font-bold text-slate-900">{s.realizados}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <DollarSign size={20} className="text-orange-500" />
                        Serviços Mais Lucrativos
                    </h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                        {serviceStats.sort((a, b) => b.lucrativos - a.lucrativos).map((s, index) => (
                            <div key={s.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                <span className="font-medium text-slate-900">{index + 1}. {s.name}</span>
                                <span className="font-bold text-slate-900">R$ {s.lucrativos.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
