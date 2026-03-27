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
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg" style={{ color: settings.primaryColor }}>
                            <Clock size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-white">Resumo da Agenda de Hoje</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </span>
                </div>

                <div className="divide-y divide-slate-700/50">
                    {todayAgenda.length > 0 ? (
                        todayAgenda.map((apt) => (
                            <div key={apt.id} className="p-4 hover:bg-slate-700/30 transition-colors grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                                {/* Horário */}
                                <div className="sm:col-span-1 flex flex-col items-center justify-center bg-slate-900 border border-slate-700 rounded-xl p-2 min-w-[70px]">
                                    <span className="text-lg font-bold text-white">{apt.time.substring(0, 5)}</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Horário</span>
                                </div>

                                {/* Cliente */}
                                <div className="sm:col-span-3">
                                    <h4 className="font-bold text-white text-base">{apt.clientName}</h4>
                                    <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                                        <Phone size={12} />
                                        <span>{apt.clientPhone}</span>
                                    </div>
                                </div>

                                {/* Profissional */}
                                <div className="sm:col-span-2 flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Profissional</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: professionals.find(p => p.id === apt.professionalId)?.color || '#64748b' }} />
                                        <span className="text-sm text-slate-300 font-medium">{getProName(apt.professionalId)}</span>
                                    </div>
                                </div>

                                {/* Serviços */}
                                <div className="sm:col-span-4 flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Serviços</span>
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <Scissors size={14} className="text-orange-500" />
                                        <span className="truncate max-w-[250px]">{getServicesNames(apt.serviceIds)}</span>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="sm:col-span-2 flex justify-end">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyles(apt.status)}`}>
                                        {getStatusLabel(apt.status)}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
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
        className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-lg hover:border-slate-600 transition-all"
    >
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-700">
                {icon}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-900/50 px-2 py-1 rounded">
                {trend}
            </span>
        </div>
        <h3 className="text-slate-400 text-sm font-medium mb-1">{label}</h3>
        <p className="text-3xl font-bold text-white">{value}</p>
    </motion.div>
);

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'scheduled': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
        case 'confirmed': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
        case 'completed': return 'text-green-400 bg-green-400/10 border-green-400/20';
        case 'cancelled': return 'text-red-400 bg-red-400/10 border-red-400/20';
        case 'noshow': return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
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
