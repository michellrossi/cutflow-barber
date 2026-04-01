import React from 'react';
import { useShop } from '../../../store';
import { Users, Scissors, DollarSign, Award, LayoutGrid, Clock } from 'lucide-react';
import { DateRangeFilter } from '../ui/DateRangeFilter';

export const ReportsTeamPanel: React.FC = () => {
    const { professionals, appointments, services } = useShop();

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <DateRangeFilter />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {professionals.map(pro => {
                    const proAppointments = appointments.filter(a => a.professionalId === pro.id && a.status === 'completed');
                    const totalRevenue = proAppointments.reduce((acc, a) => acc + a.totalValue, 0);
                    
                    return (
                        <div key={pro.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                                <img src={pro.photoUrl} alt={pro.name} className="w-12 h-12 rounded-full object-cover" />
                                <div>
                                    <h4 className="font-bold text-slate-900">{pro.name}</h4>
                                    <p className="text-xs text-slate-500">{pro.role}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 flex items-center gap-1"><Scissors size={12} /> Atendimentos</p>
                                    <p className="font-bold text-slate-900">{proAppointments.length}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 flex items-center gap-1"><DollarSign size={12} /> Faturamento</p>
                                    <p className="font-bold text-slate-900">R$ {totalRevenue.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Top Profissionais */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Award size={20} className="text-orange-500" />
                    Top Profissionais
                </h3>
                <div className="space-y-2">
                    {professionals
                        .sort((a, b) => {
                            const revA = appointments.filter(appt => appt.professionalId === a.id && appt.status === 'completed').reduce((acc, appt) => acc + appt.totalValue, 0);
                            const revB = appointments.filter(appt => appt.professionalId === b.id && appt.status === 'completed').reduce((acc, appt) => acc + appt.totalValue, 0);
                            return revB - revA;
                        })
                        .map((pro, index) => (
                            <div key={pro.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-400">#{index + 1}</span>
                                    <img src={pro.photoUrl} alt={pro.name} className="w-8 h-8 rounded-full object-cover" />
                                    <span className="font-bold text-slate-900">{pro.name}</span>
                                </div>
                                <span className="font-bold text-slate-900">
                                    R$ {appointments.filter(appt => appt.professionalId === pro.id && appt.status === 'completed').reduce((acc, appt) => acc + appt.totalValue, 0).toFixed(2)}
                                </span>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    );
};
