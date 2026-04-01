import React, { useState } from 'react';
import { useShop } from '../../../store';
import { Users, Scissors, DollarSign, Award, LayoutGrid, Clock } from 'lucide-react';
import { DateRangeFilter } from '../ui/DateRangeFilter';

export const ReportsTeamPanel: React.FC = () => {
    const { professionals, appointments, services } = useShop();
    const [selectedProId, setSelectedProId] = useState<string>(
        professionals.length > 0 ? professionals[0].id : ''
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Filtro de Data e Seleção de Profissional */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">
                        Selecione o Profissional
                    </label>
                    <div className="flex flex-wrap gap-4">
                        {professionals.map(pro => (
                            <button
                                key={pro.id}
                                onClick={() => setSelectedProId(pro.id)}
                                className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all border-2 ${
                                    selectedProId === pro.id 
                                        ? 'border-orange-500 bg-orange-50 shadow-md scale-105' 
                                        : 'border-transparent hover:bg-slate-50 grayscale hover:grayscale-0'
                                }`}
                            >
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                                    <img src={pro.photoUrl} alt={pro.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <span className={`text-xs font-bold truncate max-w-[80px] ${selectedProId === pro.id ? 'text-orange-600' : 'text-slate-600'}`}>
                                    {pro.name.split(' ')[0]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="shrink-0">
                    <DateRangeFilter />
                </div>
            </div>

            {selectedProId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(() => {
                        const pro = professionals.find(p => p.id === selectedProId);
                        const proAppointments = appointments.filter(a => a.professionalId === selectedProId && a.status === 'completed');
                        
                        const totalServices = proAppointments.length;
                        const totalRevenue = proAppointments.reduce((acc, a) => acc + a.totalValue, 0);
                        const totalCommission = (totalRevenue * (pro?.commissionPercentage || 50)) / 100;

                        const serviceBreakdown: { [key: string]: number } = {};
                        proAppointments.forEach(appt => {
                            appt.serviceIds.forEach(sId => {
                                const service = services.find(s => s.id === sId);
                                if (service) {
                                    serviceBreakdown[service.name] = (serviceBreakdown[service.name] || 0) + 1;
                                }
                            });
                        });

                        return (
                            <>
                                {/* Card Total de Serviços */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Scissors size={20} />
                                        </div>
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total de Serviços</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-900">{totalServices}</div>
                                    <div className="text-xs text-slate-400 mt-1">Serviços finalizados</div>
                                </div>

                                {/* Card Faturamento */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                            <DollarSign size={20} />
                                        </div>
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Faturamento Total</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">Valor bruto gerado</div>
                                </div>

                                {/* Card Comissão */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                                            <Award size={20} />
                                        </div>
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Comissão Devida</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCommission)}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">{pro?.commissionPercentage}% de comissão</div>
                                </div>

                                {/* Mix de Serviços */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                            <LayoutGrid size={20} />
                                        </div>
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Mix de Serviços</span>
                                    </div>
                                    <div className="space-y-2 max-h-[120px] overflow-y-auto no-scrollbar">
                                        {Object.entries(serviceBreakdown).length > 0 ? (
                                            Object.entries(serviceBreakdown).map(([name, count]) => (
                                                <div key={name} className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 truncate mr-2">{name}</span>
                                                    <span className="font-bold text-slate-900">{count}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">Nenhum serviço registrado</div>
                                        )}
                                    </div>
                                </div>

                                {/* Tabela Detalhada */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm md:col-span-2 lg:col-span-4 overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                            <Clock size={18} className="text-slate-400" />
                                            Últimos Atendimentos Concluídos
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-slate-100">
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data/Hora</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serviços</th>
                                                    <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {proAppointments.slice(0, 10).map(appt => (
                                                    <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-medium text-slate-900">{new Date(appt.date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                                                            <div className="text-xs text-slate-400">{appt.time}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-bold text-slate-900">{appt.clientName}</div>
                                                            <div className="text-xs text-slate-400">{appt.clientPhone}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {appt.serviceIds.map(sId => {
                                                                    const s = services.find(serv => serv.id === sId);
                                                                    return (
                                                                        <span key={sId} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                                                            {s?.name || 'Serviço'}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appt.totalValue)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                    <Users size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Selecione um profissional para visualizar o relatório detalhado.</p>
                </div>
            )}
        </div>
    );
};