import React, { useState, useEffect } from 'react';
import { useShop } from '../../../store';
import { Users, Scissors, DollarSign, Award, LayoutGrid, Clock } from 'lucide-react';

interface ReportsTeamPanelProps {
    dateRange: string;
}

export const ReportsTeamPanel: React.FC<ReportsTeamPanelProps> = ({ dateRange }) => {
    const { professionals, appointments, services, fetchFinancialReport } = useShop();
    const [selectedProId, setSelectedProId] = useState<string>(
        professionals.length > 0 ? professionals[0].id : ''
    );
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

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Seleção de Profissional */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">
                        Selecione o Profissional
                    </label>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => setSelectedProId('all')}
                            className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all border-2 ${
                                selectedProId === 'all' 
                                    ? 'border-orange-500 bg-orange-50 shadow-md scale-105' 
                                    : 'border-transparent hover:bg-slate-50'
                            }`}
                        >
                            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                                <Users size={32} className="text-slate-500" />
                            </div>
                            <span className={`text-xs font-bold truncate max-w-[80px] ${selectedProId === 'all' ? 'text-orange-600' : 'text-slate-600'}`}>
                                Todos
                            </span>
                        </button>
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
            </div>

            {selectedProId ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(() => {
                        const isAll = selectedProId === 'all';
                        const proAppointments = isAll 
                            ? filteredAppointments.filter(a => a.status === 'completed')
                            : filteredAppointments.filter(a => a.professionalId === selectedProId && a.status === 'completed');
                        
                        const totalServices = proAppointments.length;
                        const totalRevenue = proAppointments.reduce((acc, a) => acc + a.totalValue, 0);
                        
                        // Cálculo de comissão apenas se um profissional específico for selecionado
                        const pro = isAll ? null : professionals.find(p => p.id === selectedProId);
                        const totalCommission = isAll 
                            ? 0 
                            : (totalRevenue * (pro?.commissionPercentage || 50)) / 100;

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

                                {/* Card Comissão (apenas se não for 'Todos') */}
                                {!isAll && (
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
                                )}

                                {/* Card Comissão Geral Devida (apenas se for 'Todos') */}
                                {isAll && (
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                                                <Award size={20} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Comissão Geral Devida</span>
                                        </div>
                                        <div className="text-3xl font-black text-slate-900">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                professionals.reduce((acc, pro) => {
                                                    const proRevenue = filteredAppointments
                                                        .filter(a => a.professionalId === pro.id && a.status === 'completed')
                                                        .reduce((acc, a) => acc + a.totalValue, 0);
                                                    return acc + (proRevenue * (pro.commissionPercentage || 50)) / 100;
                                                }, 0)
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1">Total acumulado</div>
                                    </div>
                                )}

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

                                {/* Top Profissionais (apenas se for 'Todos') */}
                                {isAll && (
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] md:col-span-2 lg:col-span-2">
                                        <h3 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                                            <Users size={20} className="text-[#1E293B]" />
                                            Top Profissionais
                                        </h3>
                                        <div className="flex flex-col divide-y divide-slate-100">
                                            {(() => {
                                                const sorted = professionals.map(pro => {
                                                    const proAppts = filteredAppointments.filter(a => a.professionalId === pro.id && a.status === 'completed');
                                                    const proRevenue = proAppts.reduce((acc, a) => acc + a.totalValue, 0);
                                                    return { ...pro, revenue: proRevenue, visits: proAppts.length };
                                                }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

                                                const maxVal = Math.max(...sorted.map(s => s.revenue), 1);
                                                
                                                return sorted.map((pro, index) => {
                                                    let badgeColor = 'bg-slate-200 text-slate-700'; // 4º+
                                                    if (index === 0) badgeColor = 'bg-yellow-400 text-yellow-900';
                                                    else if (index === 1) badgeColor = 'bg-slate-400 text-white';
                                                    else if (index === 2) badgeColor = 'bg-[#cd6133] text-white';

                                                    const progressWidth = `${(pro.revenue / maxVal) * 100}%`;

                                                    return (
                                                        <div key={pro.id} className="py-4 flex items-center gap-4">
                                                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-sm ${badgeColor}`}>
                                                                {index + 1}º
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <img src={pro.photoUrl} alt={pro.name} className="w-6 h-6 rounded-full shrink-0" referrerPolicy="no-referrer" />
                                                                        <span className="font-medium text-[#1E293B] truncate">{pro.name}</span>
                                                                    </div>
                                                                    <span className="font-bold text-[#F16A1B] whitespace-nowrap ml-2">
                                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pro.revenue)}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-[#F1F5F9] h-1.5 rounded-full overflow-hidden">
                                                                    <div className="bg-[#F16A1B] h-full rounded-full" style={{ width: progressWidth }}></div>
                                                                </div>
                                                                <div className="text-xs text-slate-500 mt-1 text-right">
                                                                    {pro.visits} atendimentos
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {/* Tabela Detalhada (REMOVIDA) */}
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