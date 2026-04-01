import React from 'react';
import { useShop } from '../../../store';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

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

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Serviços Executados por Mês</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={serviceStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="realizados" fill="#f97316" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Serviços Mais Realizados</h3>
                    <div className="space-y-4">
                        {serviceStats.sort((a, b) => b.realizados - a.realizados).slice(0, 5).map((s, index) => (
                            <div key={s.name} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                                <span className="font-bold text-slate-900">#{index + 1} {s.name}</span>
                                <span className="font-bold text-orange-600">{s.realizados}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Serviços Mais Lucrativos</h3>
                    <div className="space-y-4">
                        {serviceStats.sort((a, b) => b.lucrativos - a.lucrativos).slice(0, 5).map((s, index) => (
                            <div key={s.name} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                                <span className="font-bold text-slate-900">#{index + 1} {s.name}</span>
                                <span className="font-bold text-orange-600">R$ {s.lucrativos.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
