import React, { useMemo, useState, useEffect } from 'react';
import { useShop } from '../../../store';
import { Users, Scissors, Calendar, Clock, Phone, User, DollarSign, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export const DashboardPanel: React.FC<{ onNavigate: (tab: any, filter?: string) => void }> = ({ onNavigate }) => {
    const { appointments, clients, professionals, services, settings } = useShop();
    const [today, setToday] = useState<string>('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setToday(new Date().toISOString().split('T')[0]);
        setIsMounted(true);
    }, []);

    // Stats calculations
    const todayAppointments = useMemo(() => {
        if (!today) return [];
        return appointments.filter(apt => apt.date === today && apt.status !== 'cancelled');
    }, [appointments, today]);

    const inactiveClientsCount = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const lastAppByClient: Record<string, Date> = {};
        appointments.forEach(app => {
            if (app.clientId && app.status === 'completed') {
                const appDate = new Date(app.date + 'T12:00:00');
                if (!lastAppByClient[app.clientId] || appDate > lastAppByClient[app.clientId]) {
                    lastAppByClient[app.clientId] = appDate;
                }
            }
        });

        return Object.values(lastAppByClient).filter(lastDate => lastDate < thirtyDaysAgo).length;
    }, [appointments]);

    const birthdayClientsCount = useMemo(() => {
        if (!today) return 0;
        const todayStr = today.substring(5); // MM-DD
        return clients.filter(c => c.birthDate && c.birthDate.substring(5) === todayStr).length;
    }, [clients, today]);

    const noShowRate = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startStr = thirtyDaysAgo.toISOString().split('T')[0];

        const relevantAppts = appointments.filter(a => a.date >= startStr && a.status !== 'cancelled');
        if (relevantAppts.length === 0) return 0;

        const noShows = relevantAppts.filter(a => a.status === 'noshow').length;
        return (noShows / relevantAppts.length) * 100;
    }, [appointments]);

    const revenueStats = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        let todayVal = 0;
        let weekVal = 0;
        let monthVal = 0;
        let yearVal = 0;

        appointments.forEach(apt => {
            if (apt.status !== 'completed') return;

            const aptDate = new Date(apt.date + 'T12:00:00');
            const value = apt.totalValue;

            if (aptDate >= startOfToday) todayVal += value;
            if (aptDate >= startOfWeek) weekVal += value;
            if (aptDate >= startOfMonth) monthVal += value;
            if (aptDate >= startOfYear) yearVal += value;
        });

        return { today: todayVal, week: weekVal, month: monthVal, year: yearVal };
    }, [appointments]);

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

    if (!isMounted) return null;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Calendar size={18} />}
                    colorClass="text-orange-600 bg-orange-50"
                    label="Agendamentos Hoje"
                    value={todayAppointments.length.toString()}
                    subtitle="Volume diário"
                    onClick={() => onNavigate('appointments')}
                />
                <StatCard
                    icon={<Users size={18} />}
                    colorClass="text-red-600 bg-red-50"
                    label="Clientes Inativos"
                    value={inactiveClientsCount.toString()}
                    subtitle="Mais de 30 dias"
                    onClick={() => onNavigate('clients', 'inactive')}
                />
                <StatCard
                    icon={<User size={18} />}
                    colorClass="text-blue-600 bg-blue-50"
                    label="Aniversariantes"
                    value={birthdayClientsCount.toString()}
                    subtitle="Comemorando hoje"
                    onClick={() => onNavigate('clients', 'birthdays')}
                />
                <StatCard
                    icon={<Scissors size={18} />}
                    colorClass="text-purple-600 bg-purple-50"
                    label="Faltas (No-Show)"
                    value={`${noShowRate.toFixed(1)}%`}
                    subtitle="Últimos 30 dias"
                    onClick={() => onNavigate('appointments', 'noshow')}
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<DollarSign size={18} />}
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Receita Hoje"
                    value={`R$ ${revenueStats.today.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtitle="Faturamento do dia"
                    onClick={() => onNavigate('finance')}
                />
                <StatCard
                    icon={<TrendingUp size={18} />}
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Receita da Semana"
                    value={`R$ ${revenueStats.week.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtitle="Últimos 7 dias"
                    onClick={() => onNavigate('finance')}
                />
                <StatCard
                    icon={<DollarSign size={18} />}
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Receita do Mês"
                    value={`R$ ${revenueStats.month.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtitle="Ciclo mensal atual"
                    onClick={() => onNavigate('finance')}
                />
                <StatCard
                    icon={<TrendingUp size={18} />}
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Receita do Ano"
                    value={`R$ ${revenueStats.year.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    subtitle="Acumulado anual"
                    onClick={() => onNavigate('finance')}
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm" style={{ color: settings.primaryColor }}>
                            <Clock size={20} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Resumo da Agenda de Hoje</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">
                        {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                    </span>
                </div>

                <div className="divide-y divide-slate-100">
                    {todayAgenda.length > 0 ? (
                        todayAgenda.map((apt) => (
                            <div key={apt.id} className="p-4 hover:bg-slate-50 transition-colors grid grid-cols-1 sm:grid-cols-12 items-center gap-4">
                                <div className="sm:col-span-1 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-2 min-w-[70px]">
                                    <span className="text-lg font-black text-slate-900">{apt.time.substring(0, 5)}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Horário</span>
                                </div>
                                <div className="sm:col-span-3">
                                    <h4 className="font-bold text-slate-900 text-base truncate">{apt.clientName}</h4>
                                    <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                                        <Phone size={12} className="shrink-0" />
                                        <span className="truncate">{apt.clientPhone}</span>
                                    </div>
                                </div>
                                <div className="sm:col-span-3 flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Profissional</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: professionals.find(p => p.id === apt.professionalId)?.color || '#64748b' }} />
                                        <span className="text-sm text-slate-700 font-semibold truncate">{getProName(apt.professionalId)}</span>
                                    </div>
                                </div>
                                <div className="sm:col-span-3 flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Serviços</span>
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Scissors size={14} className="text-orange-500 shrink-0" />
                                        <span className="truncate font-medium">{getServicesNames(apt.serviceIds)}</span>
                                    </div>
                                </div>
                                <div className="sm:col-span-2 flex justify-end">
                                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${getStatusStyles(apt.status)}`}>
                                        {getStatusLabel(apt.status)}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                            <Calendar size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-bold">Nenhum agendamento para hoje.</p>
                            <p className="text-sm opacity-60">Sua agenda está livre por enquanto.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subtitle?: string;
    colorClass: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subtitle, colorClass, onClick }) => (
    <motion.div
        whileHover={{ y: -4 }}
        onClick={onClick}
        className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass.split(' ')[1]}`}>
                <div className={colorClass.split(' ')[0]}>
                    {icon}
                </div>
            </div>
            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">{label}</h3>
        </div>

        <div className="flex flex-col items-start">
            <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
    </motion.div>
);

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'scheduled': return 'text-blue-700 bg-blue-50 border-blue-100';
        case 'confirmed': return 'text-orange-700 bg-orange-50 border-orange-100';
        case 'completed': return 'text-emerald-700 bg-emerald-50 border-emerald-100';
        case 'cancelled': return 'text-red-700 bg-red-50 border-red-100';
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
