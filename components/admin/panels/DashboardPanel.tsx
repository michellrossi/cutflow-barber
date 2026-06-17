import React, { useMemo, useState, useEffect } from 'react';
import { useShop } from '../../../store';
import { Users, Scissors, Calendar, Clock, Phone, User, DollarSign, TrendingUp, Smartphone, CheckCircle, Share2, Package, Star, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

export const DashboardPanel: React.FC<{ onNavigate: (tab: any, filter?: string) => void }> = ({ onNavigate }) => {
    const { 
        appointments, clients, professionals, services, settings, 
        products, cashSessions, cashFlowEntries,
        getWhatsAppStatus, formatCurrencyBRL 
    } = useShop();
    const [today, setToday] = useState<string>('');
    const [isMounted, setIsMounted] = useState(false);
    const [whatsappStatus, setWhatsappStatus] = useState<{ connected: boolean } | null>(null);
    const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
        try { return localStorage.getItem('cutflow_onboarding_done') === 'true'; } catch { return false; }
    });

    useEffect(() => {
        let isMountedComponent = true;
        setToday(dayjs().format('YYYY-MM-DD'));
        setIsMounted(true);

        const fetchWaStatus = async () => {
            const res = await getWhatsAppStatus();
            if (isMountedComponent && !res.error) {
                setWhatsappStatus({ connected: res.connected });
            }
        };

        fetchWaStatus();
        const intv = setInterval(fetchWaStatus, 60000);
        return () => {
            isMountedComponent = false;
            clearInterval(intv);
        };
    }, []);

    // --- Novas Métricas ---

    // 1. Serviço Mais Vendido (Semana)
    const topService = useMemo(() => {
        const sevenDaysAgo = dayjs().subtract(7, 'days').format('YYYY-MM-DD');
        const recentAppts = appointments.filter(a => a.date >= sevenDaysAgo && a.status === 'completed');
        const counts: Record<string, number> = {};
        recentAppts.forEach(a => {
            a.serviceIds.forEach(id => {
                counts[id] = (counts[id] || 0) + 1;
            });
        });
        const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (!topId) return null;
        const service = services.find(s => s.id === topId);
        return service ? { name: service.name, count: counts[topId] } : null;
    }, [appointments, services]);

    // 2. Estoque Crítico
    const criticalStockCount = useMemo(() => {
        return (products || []).filter(p => p.currentStock <= p.minStock).length;
    }, [products]);

    // 3. Saldo do Caixa Aberto (Físico - Gaveta)
    const cashBalance = useMemo(() => {
        const openSession = (cashSessions || []).find(s => s.status === 'open');
        if (!openSession) return null;
        
        const isCashEntry = (entry: any) => {
            if (entry.type === 'output') {
                const desc = (entry.description || '').toLowerCase();
                return !(
                    desc.includes('método: bank') || 
                    desc.includes('método: pix') || 
                    desc.includes('método: digital') || 
                    desc.includes('método: credit') || 
                    desc.includes('método: debit')
                );
            }
            if (entry.category !== 'Venda / Serviço') {
                return true;
            }
            const desc = (entry.description || '').toLowerCase();
            if (desc.includes('| método:')) {
                return desc.includes('método: cash') || desc.includes('método: dinheiro');
            }
            return true;
        };

        const entries = (cashFlowEntries || []).filter(e => e.sessionId === openSession.id && isCashEntry(e));
        return entries.reduce((acc, e) => e.type === 'input' ? acc + e.amount : acc - e.amount, openSession.openingBalance);
    }, [cashSessions, cashFlowEntries]);

    // 4. NPS da Semana
    const npsStats = useMemo(() => {
        const sevenDaysAgo = dayjs().subtract(7, 'days').format('YYYY-MM-DD');
        const recentNps = appointments.filter(a => a.date >= sevenDaysAgo && (a.npsScore ?? 0) > 0);
        if (recentNps.length === 0) return { avg: 0, count: 0 };
        const sum = recentNps.reduce((acc, a) => acc + (a.npsScore || 0), 0);
        return { avg: sum / recentNps.length, count: recentNps.length };
    }, [appointments]);

    // 5. Top Barbeiro do Mês
    const topBarber = useMemo(() => {
        const firstDayOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
        const monthAppts = appointments.filter(a => a.date >= firstDayOfMonth && a.status === 'completed');
        const stats: Record<string, { revenue: number, count: number }> = {};
        monthAppts.forEach(a => {
            if (!a.professionalId) return;
            if (!stats[a.professionalId]) stats[a.professionalId] = { revenue: 0, count: 0 };
            stats[a.professionalId].revenue += a.totalValue;
            stats[a.professionalId].count += 1;
        });
        const topId = Object.entries(stats).sort((a, b) => b[1].revenue - a[1].revenue)[0]?.[0];
        if (!topId) return null;
        const pro = professionals.find(p => p.id === topId);
        return pro ? { name: pro.name, ...stats[topId] } : null;
    }, [appointments, professionals]);

    // 6. Ticket Médio do Mês
    const ticketStats = useMemo(() => {
        const startOfMonth = dayjs().startOf('month');
        const startOfLastMonth = dayjs().subtract(1, 'month').startOf('month');
        const endOfLastMonth = dayjs().subtract(1, 'month').endOf('month');

        const curMonthAppts = appointments.filter(a => a.date >= startOfMonth.format('YYYY-MM-DD') && a.status === 'completed');
        const lastMonthAppts = appointments.filter(a => a.date >= startOfLastMonth.format('YYYY-MM-DD') && a.date <= endOfLastMonth.format('YYYY-MM-DD') && a.status === 'completed');

        const curRevenue = curMonthAppts.reduce((acc, a) => acc + a.totalValue, 0);
        const lastRevenue = lastMonthAppts.reduce((acc, a) => acc + a.totalValue, 0);

        const curTicket = curMonthAppts.length > 0 ? curRevenue / curMonthAppts.length : 0;
        const lastTicket = lastMonthAppts.length > 0 ? lastRevenue / lastMonthAppts.length : 0;

        const delta = lastTicket > 0 ? ((curTicket - lastTicket) / lastTicket) * 100 : 0;

        return { value: curTicket, delta };
    }, [appointments]);

    // --- Stats calculations legados ---
    const todayAppointments = useMemo(() => {
        if (!today) return [];
        return appointments.filter(apt => apt.date === today && apt.status !== 'cancelled');
    }, [appointments, today]);

    const inactiveClientsCount = useMemo(() => {
        let count = 0;
        const now = dayjs();
        
        clients.forEach(client => {
            const clientAppts = appointments.filter(a => 
                (a.clientId === client.id) || 
                (!a.clientId && a.clientPhone === client.phone)
            ).filter(a => a.status === 'completed');

            if (clientAppts.length > 0) {
                clientAppts.sort((a, b) => dayjs(b.date + 'T' + b.time).unix() - dayjs(a.date + 'T' + a.time).unix());
                const lastCutDate = clientAppts[0].date;
                const daysSinceLastCut = now.diff(dayjs(lastCutDate), 'day');
                
                if (daysSinceLastCut > 30) {
                    count++;
                }
            }
        });
        
        return count;
    }, [clients, appointments]);

    const birthdayClientsCount = useMemo(() => {
        if (!today) return 0;
        const todayStr = today.substring(5); // MM-DD
        return clients.filter(c => c.birthDate && c.birthDate.substring(5) === todayStr).length;
    }, [clients, today]);

    const noShowRate = useMemo(() => {
        const thirtyDaysAgo = dayjs().subtract(30, 'days').format('YYYY-MM-DD');
        const relevantAppts = appointments.filter(a => a.date >= thirtyDaysAgo && a.status !== 'cancelled');
        if (relevantAppts.length === 0) return 0;
        const noShows = relevantAppts.filter(a => a.status === 'noshow').length;
        return (noShows / relevantAppts.length) * 100;
    }, [appointments]);

    const revenueStats = useMemo(() => {
        const startOfToday = dayjs().startOf('day');
        const startOfWeek = dayjs().startOf('week');
        const startOfMonth = dayjs().startOf('month');
        const startOfYear = dayjs().startOf('year');

        let todayVal = 0;
        let weekVal = 0;
        let monthVal = 0;
        let yearVal = 0;

        appointments.forEach(apt => {
            if (apt.status !== 'completed') return;
            const aptDate = dayjs(apt.date);
            const value = apt.totalValue;

            if (aptDate.isSame(startOfToday, 'day') || aptDate.isAfter(startOfToday)) todayVal += value;
            if (aptDate.isSame(startOfWeek, 'day') || aptDate.isAfter(startOfWeek)) weekVal += value;
            if (aptDate.isSame(startOfMonth, 'day') || aptDate.isAfter(startOfMonth)) monthVal += value;
            if (aptDate.isSame(startOfYear, 'day') || aptDate.isAfter(startOfYear)) yearVal += value;
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


            {/* Guia de Onboarding */}
            {(() => {
                const allDone = services.length > 0 && professionals.length > 0
                    && whatsappStatus?.connected === true && appointments.length > 0;
                
                if (allDone && !onboardingDismissed) {
                    try { localStorage.setItem('cutflow_onboarding_done', 'true'); } catch {}
                    setOnboardingDismissed(true);
                }

                if (onboardingDismissed) return null;
                if (services.length > 0 && professionals.length > 0 && appointments.length > 0 && whatsappStatus?.connected) return null;

                return (
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
                            <button
                                onClick={() => {
                                    try { localStorage.setItem('cutflow_onboarding_done', 'true'); } catch {}
                                    setOnboardingDismissed(true);
                                }}
                                className="shrink-0 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-bold rounded-lg transition-all border border-white/10"
                            >
                                Fechar guia ✕
                            </button>
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
                                    const url = `https://${settings?.slug || 'agendar'}.insightbarber.com.br`;
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
                );
            })()}

            {/* Grid 1: Operacional Crítico */}
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
                    icon={<Star size={18} />}
                    colorClass="text-purple-600 bg-purple-50"
                    label="Serviço Mais Vendido"
                    value={topService?.name || '---'}
                    subtitle={`${topService?.count || 0} na semana`}
                    onClick={() => onNavigate('reports-services')}
                />
                <StatCard
                    icon={<Package size={18} />}
                    colorClass="text-red-600 bg-red-50"
                    label="Estoque Crítico"
                    value={criticalStockCount.toString()}
                    subtitle="Produtos abaixo do mín."
                    onClick={() => onNavigate('inventory', 'critical')}
                />
                <StatCard
                    icon={<DollarSign size={18} />}
                    colorClass={`${(cashBalance || 0) > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}
                    label="Caixa Aberto"
                    value={cashBalance !== null ? formatCurrencyBRL(cashBalance) : 'Fechado'}
                    subtitle="Saldo atual em tempo real"
                    onClick={() => onNavigate('financial', 'cash')}
                />
            </div>

            {/* Grid 2: Qualidade e Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Star size={18} />}
                    colorClass="text-amber-500 bg-amber-50"
                    label="NPS da Semana"
                    value={npsStats.avg > 0 ? npsStats.avg.toFixed(1) : '---'}
                    subtitle={`${npsStats.count} avaliações`}
                    onClick={() => onNavigate('reports-team')}
                />
                <StatCard
                    icon={<Award size={18} />}
                    colorClass="text-blue-600 bg-blue-50"
                    label="Top Barbeiro"
                    value={topBarber?.name || '---'}
                    subtitle={topBarber ? `${formatCurrencyBRL(topBarber.revenue)} (${topBarber.count} atend.)` : 'Mês atual'}
                    onClick={() => onNavigate('reports-team')}
                />
                <StatCard
                    icon={<TrendingUp size={18} />}
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Ticket Médio"
                    value={formatCurrencyBRL(ticketStats.value)}
                    subtitle={`${ticketStats.delta >= 0 ? '+' : ''}${ticketStats.delta.toFixed(1)}% vs mês ant.`}
                    onClick={() => onNavigate('reports-finance')}
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

            {/* Grid 3: Receita Legada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<DollarSign size={18} />}
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Receita Hoje"
                    value={formatCurrencyBRL(revenueStats.today)}
                    subtitle="Faturamento do dia"
                    onClick={() => onNavigate('financial', 'billing')}
                />
                <StatCard
                    icon={<TrendingUp size={18} />}
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Receita da Semana"
                    value={formatCurrencyBRL(revenueStats.week)}
                    subtitle="Últimos 7 dias"
                    onClick={() => onNavigate('financial', 'billing')}
                />
                <StatCard
                    icon={<DollarSign size={18} />}
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Receita do Mês"
                    value={formatCurrencyBRL(revenueStats.month)}
                    subtitle="Ciclo mensal atual"
                    onClick={() => onNavigate('financial', 'billing')}
                />
                <StatCard
                    icon={<Users size={18} />}
                    colorClass="text-red-600 bg-red-50"
                    label="Clientes Inativos"
                    value={inactiveClientsCount.toString()}
                    subtitle="Mais de 30 dias"
                    onClick={() => onNavigate('clients', 'inactive')}
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
    <div onClick={onClick} className={`p-4 flex items-center justify-between rounded-xl border transition-all duration-300 cursor-pointer ${done ? 'bg-white/5 border-emerald-500/30 opacity-60 select-none' : 'bg-white/10 border-white/10 hover:border-orange-500/50 hover:bg-white/20 shadow-lg active:scale-[0.98]'}`}>
        <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl transition-colors ${done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white group-hover:bg-orange-500/20 group-hover:text-orange-400'}`}>
                {done ? <CheckCircle size={20} /> : icon}
            </div>
            <span className={`font-bold text-sm tracking-tight ${done ? 'text-slate-400 line-through' : 'text-white'}`}>{text}</span>
        </div>
        {!done && (
            <div className="flex items-center gap-2">
                <span className="text-orange-400 text-[10px] font-black px-2 py-1 bg-orange-500/20 uppercase tracking-widest rounded border border-orange-500/20">Pendente</span>
            </div>
        )}
    </div>
);
