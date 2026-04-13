import React, { useMemo, useState, useEffect } from 'react';
import { useShop } from '../../../store';
import { Users, Scissors, Calendar, Clock, Phone, User, DollarSign, TrendingUp, Smartphone, CheckCircle, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const DashboardPanel: React.FC<{ onNavigate: (tab: any, filter?: string) => void }> = ({ onNavigate }) => {
    const { appointments, clients, professionals, services, settings, getWhatsAppStatus } = useShop();
    const [today, setToday] = useState<string>('');
    const [isMounted, setIsMounted] = useState(false);
    const [whatsappStatus, setWhatsappStatus] = useState<{ connected: boolean } | null>(null);

    useEffect(() => {
        let isMountedComponent = true;
        setToday(new Date().toISOString().split('T')[0]);
        setIsMounted(true);

        const fetchWaStatus = async () => {
            const res = await getWhatsAppStatus();
            if (isMountedComponent && !res.error) {
                setWhatsappStatus({ connected: res.connected });
            }
        };

        fetchWaStatus();
        const intv = setInterval(fetchWaStatus, 60000); // Poll a cada minuto em tempo real real
        return () => {
            isMountedComponent = false;
            clearInterval(intv);
        };
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

            {/* WA Health Indicator e Botão de Ação Crítica */}
            <div className={`p-4 rounded-xl flex items-center justify-between shadow-sm border ${whatsappStatus?.connected ? 'bg-emerald-50 border-emerald-100' : (whatsappStatus ? 'bg-red-50 border-red-200 shadow-red-500/10' : 'bg-slate-50 border-slate-100')}`}>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Smartphone className={whatsappStatus?.connected ? 'text-emerald-500' : (whatsappStatus ? 'text-red-500' : 'text-slate-400')} size={28} />
                        {whatsappStatus && !whatsappStatus.connected && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border border-white rounded-full animate-ping" />
                        )}
                    </div>
                    <div>
                        <h4 className={`font-bold text-lg ${whatsappStatus?.connected ? 'text-emerald-800' : (whatsappStatus ? 'text-red-800' : 'text-slate-600')}`}>
                            {whatsappStatus === null ? 'Verificando Saúde do WhatsApp...' : (whatsappStatus.connected ? 'WhatsApp Conectado e Operante' : 'WhatsApp Desconectado!')}
                        </h4>
                        <p className={`text-sm ${whatsappStatus?.connected ? 'text-emerald-600' : (whatsappStatus ? 'text-red-600 font-medium' : 'text-slate-500')}`}>
                            {whatsappStatus?.connected ? 'Suas mensagens automáticas e lembretes estão sendo enviados normalmente.' : 'Atenção: conecte (ou reconecte) sua instância para conseguir enviar lembretes e confirmar agendamentos.'}
                        </p>
                    </div>
                </div>
                {whatsappStatus && !whatsappStatus.connected && (
                    <button onClick={() => onNavigate('reminders', 'whatsapp')} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-all shadow-md active:scale-95">
                        Conectar Agora
                    </button>
                )}
            </div>

            {/* Guia de Onboarding (Anti-Churn Checklist) */}
            {(services.length === 0 || professionals.length === 0 || appointments.length === 0 || !whatsappStatus?.connected) && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-8 rounded-2xl border border-slate-800/50 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] transform rotate-12 scale-150 transition-transform group-hover:scale-[1.6] duration-700">
                        <Scissors size={220} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h3 className="text-2xl font-black mb-2 flex items-center gap-3">
                                    Checklist de Ativação <span className="animate-bounce">🚀</span>
                                </h3>
                                <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
                                    Bem-vindo! Usuários que concluem esses passos básicos nos primeiros dias aumentam em até 40% a redução de faltas nas suas barbearias. Siga a ordem e prepare a sua estufa digital para rodar.
                                </p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <CheckStep 
                                done={services.length > 0} 
                                text="Adicione seu primeiro serviço" 
                                icon={<Scissors size={18}/>} 
                                onClick={() => onNavigate('services')} 
                            />
                            <CheckStep 
                                done={professionals.length > 0} 
                                text="Adicione um profissional" 
                                icon={<User size={18}/>} 
                                onClick={() => onNavigate('team')} 
                            />
                            <CheckStep 
                                done={whatsappStatus?.connected === true} 
                                text="Configure seu WhatsApp" 
                                icon={<Smartphone size={18}/>} 
                                onClick={() => onNavigate('reminders', 'whatsapp')} 
                            />
                            <CheckStep 
                                done={false} 
                                text="Compartilhe seu link público" 
                                icon={<Share2 size={18}/>} 
                                onClick={() => { 
                                    const url = `https://${settings?.slug || 'agendar'}.cutflow.com.br`;
                                    navigator.clipboard.writeText(url); 
                                    alert('Link copiado! Coloque-o em sua Bio do Instagram.'); 
                                }} 
                            />
                            <CheckStep 
                                done={appointments.length > 0} 
                                text="Faça um agendamento de teste" 
                                icon={<Calendar size={18}/>} 
                                onClick={() => onNavigate('appointments')} 
                            />
                        </div>
                    </div>
                </div>
            )}

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

const CheckStep = ({ done, text, icon, onClick }: { done: boolean, text: string, icon: React.ReactNode, onClick: () => void }) => (
    <div onClick={onClick} className={`p-4 flex items-center justify-between rounded-xl border transition-all duration-300 cursor-pointer ${done ? 'bg-slate-900 border-emerald-500/20 opacity-50 select-none' : 'bg-slate-900 border-slate-800 hover:border-orange-500/50 hover:bg-slate-800/80 shadow-lg active:scale-[0.98]'}`}>
        <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl transition-colors ${done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 group-hover:bg-orange-500/10 group-hover:text-orange-500'}`}>
                {done ? <CheckCircle size={20} /> : icon}
            </div>
            <span className={`font-bold text-sm tracking-tight ${done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{text}</span>
        </div>
        {!done && (
            <div className="flex items-center gap-2">
                <span className="text-orange-400 text-[10px] font-black px-2 py-1 bg-orange-500/10 uppercase tracking-widest rounded border border-orange-500/20">Pendente</span>
            </div>
        )}
    </div>
);
