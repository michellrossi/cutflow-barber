import React, { useMemo } from 'react';
import { useShop } from '../../../store';
import { Users, Scissors, Calendar, UserCheck, Clock, Phone, User, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const DashboardPanel: React.FC = () => {
    const { appointments, clients, professionals, services, settings } = useShop();

    const today = new Date().toISOString().split('T')[0];

    // Stats calculations
    const todayAppointments = useMemo(() => 
        appointments.filter(apt => apt.date === today && apt.status !== 'cancelled'),
    [appointments, today]);

    const activeClientsCount = useMemo(() => clients.length, [clients]);
    const professionalsCount = useMemo(() => professionals.length, [professionals]);
    const servicesCount = useMemo(() => services.length, [services]);

    // Today's agenda summary
    const todayAgenda = useMemo(() => {
        return [...todayAppointments].sort((a, b) => a.time.localeCompare(b.time));
    }, [todayAppointments]);

    const getProName = (id: string | null) => {
        if (!id) return 'Sem preferência';
        return professionals.find(p => p.id === id)?.name || 'Desconhecido';
    };

    const getServicesNames = (ids: string[]) => {
        return ids.map(id => services.find(s => s.id === id)?.name).join(', ');
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    icon={<Calendar className="text-blue-500" size={24} />} 
                    label="Agendamentos Hoje" 
                    value={todayAppointments.length.toString()} 
                    trend="Hoje"
                />
                <StatCard 
                    icon={<UserCheck className="text-green-500" size={24} />} 
                    label="Clientes Ativos" 
                    value={activeClientsCount.toString()} 
                    trend="Total"
                />
                <StatCard 
                    icon={<User className="text-purple-500" size={24} />} 
                    label="Profissionais" 
                    value={professionalsCount.toString()} 
                    trend="Equipe"
                />
                <StatCard 
                    icon={<Scissors className="text-orange-500" size={24} />} 
                    label="Serviços" 
                    value={servicesCount.toString()} 
                    trend="Catálogo"
                />
            </div>

            {/* Today's Agenda Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg" style={{ color: settings.primaryColor }}>
                            <Clock size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Resumo da Agenda de Hoje</h3>
                    </div>
                    <span className="text-xs font-bold text-[#6b7d99] uppercase tracking-widest">
                        {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </span>
                </div>

                <div className="divide-y divide-slate-100">
                    {todayAgenda.length > 0 ? (
                        todayAgenda.map((apt) => (
                            <div key={apt.id} className="p-4 hover:bg-slate-50 transition-colors grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                                {/* Horário */}
                                <div className="sm:col-span-1 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-2 min-w-[70px]">
                                    <span className="text-lg font-bold text-slate-900">{apt.time.substring(0, 5)}</span>
                                    <span className="text-[10px] font-bold text-[#6b7d99] uppercase tracking-tighter">Horário</span>
                                </div>

                                {/* Cliente */}
                                <div className="sm:col-span-3">
                                    <h4 className="font-bold text-slate-900 text-base truncate">{apt.clientName}</h4>
                                    <div className="flex items-center gap-2 text-[#6b7d99] text-xs mt-1">
                                        <Phone size={12} className="shrink-0" />
                                        <span className="truncate">{apt.clientPhone}</span>
                                    </div>
                                </div>

                                {/* Profissional */}
                                <div className="sm:col-span-3 flex flex-col">
                                    <span className="text-[10px] font-bold text-[#6b7d99] uppercase tracking-widest mb-1">Profissional</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: professionals.find(p => p.id === apt.professionalId)?.color || '#64748b' }} />
                                        <span className="text-sm text-slate-700 font-medium truncate">{getProName(apt.professionalId)}</span>
                                    </div>
                                </div>

                                {/* Serviços */}
                                <div className="sm:col-span-3 flex flex-col">
                                    <span className="text-[10px] font-bold text-[#6b7d99] uppercase tracking-widest mb-1">Serviços</span>
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <Scissors size={14} className="text-orange-500 shrink-0" />
                                        <span className="truncate">{getServicesNames(apt.serviceIds)}</span>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="sm:col-span-2 flex justify-end">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${getStatusStyles(apt.status)}`}>
                                        {getStatusLabel(apt.status)}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-[#6b7d99] flex flex-col items-center justify-center">
                            <Calendar size={48} className="mb-4 opacity-10" />
                            <p className="text-lg font-medium">Nenhum agendamento para hoje.</p>
                            <p className="text-sm opacity-60">Sua agenda está livre por enquanto.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string, trend: string }> = ({ icon, label, value, trend }) => (
    <motion.div 
        whileHover={{ y: -4 }}
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
    >
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                {icon}
            </div>
            <span className="text-[10px] font-bold text-[#6b7d99] uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                {trend}
            </span>
        </div>
        <h3 className="text-[#6b7d99] text-sm font-medium mb-1">{label}</h3>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
    </motion.div>
);

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'scheduled': return 'text-blue-700 bg-blue-50 border-blue-200';
        case 'confirmed': return 'text-orange-700 bg-orange-50 border-orange-200';
        case 'completed': return 'text-[#1a8a6c] bg-[#f0fdfa] border-[#ccfbf1]';
        case 'cancelled': return 'text-red-700 bg-red-50 border-red-200';
        case 'noshow': return 'text-slate-700 bg-slate-50 border-slate-200';
        default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'scheduled': return 'Agendado';
        case 'confirmed': return 'Confirmado';
        case 'completed': return 'Finalizado';
        case 'cancelled': return 'Cancelado';
        case 'noshow': return 'Não veio';
        default: return status;
    }
};
