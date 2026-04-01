import React, { useMemo } from 'react';
import { useShop } from '../../../store';
import { Users, Scissors, Calendar, UserCheck, Clock, Phone, User, ChevronRight, DollarSign, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export const DashboardPanel: React.FC<{ onNavigate: (tab: any, filter?: string) => void }> = ({ onNavigate }) => {
    const { appointments, clients, professionals, services, settings } = useShop();
const today = new Date().toISOString().split('T')[0];

    // Stats calculations
    const todayAppointments = useMemo(() => 
        appointments.filter(apt => apt.date === today && apt.status !== 'cancelled'),
    [appointments, today]);

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

    const activeClientsCount = useMemo(() => clients.length, [clients]);
const professionalsCount = useMemo(() => professionals.length, [professionals]);
    const servicesCount = useMemo(() => services.length, [services]);

// Revenue calculations
    const revenueStats = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        
        let today = 0;
        let week = 0;
        let month = 0;
        let year = 0;
        
        appointments.forEach(apt => {
            if (apt.status !== 'completed') return;
            
            const aptDate = new Date(apt.date + 'T12:00:00');
            const value = apt.totalValue;
            
            if (aptDate >= startOfToday) today += value;
            if (aptDate >= startOfWeek) week += value;
      if (aptDate >= startOfMonth) month += value;
            if (aptDate >= startOfYear) year += value;
});
        
        return { today, week, month, year };
    }, [appointments]);

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
                    icon={<Calendar size={20} />} 
                    colorClass="text-orange-600 bg-orange-50"
      label="Agendamentos Hoje" 
                    value={todayAppointments.length.toString()} 
                    trend="Hoje"
                    subtitle="Volume Diário"
                    onClick={() => onNavigate('appointments')}
                />
   <StatCard 
                    icon={<Users size={20} />} 
                    colorClass="text-red-600 bg-red-50"
                    label="Clientes Inativos" 
                    value={inactiveClientsCount.toString()} 
                    trend="Alerta"
            subtitle="Mais de 30 dias"
                    onClick={() => onNavigate('clients', 'inactive')}
                />
                <StatCard 
                    icon={<User size={20} />} 
                    colorClass="text-blue-600 bg-blue-50"
                  label="Profissionais" 
                    value={professionalsCount.toString()} 
                    trend="Equipe"
                    subtitle="Corpo Técnico"
                    onClick={() => onNavigate('team')}
                />
              <StatCard 
                    icon={<Scissors size={20} />} 
                    colorClass="text-purple-600 bg-purple-50"
                    label="Serviços" 
                    value={servicesCount.toString()} 
 trend="Catálogo"
                    subtitle="Opções Disponíveis"
                    onClick={() => onNavigate('services')}
                />
            </div>

            {/* Revenue Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<StatCard 
                    icon={<DollarSign size={20} />} 
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Receita Hoje" 
                    value={`R$ ${revenueStats.today.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    trend="Hoje"
                    subtitle="Valor Bruto"
             onClick={() => onNavigate('finance')}
                />
                <StatCard 
                    icon={<TrendingUp size={20} />} 
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Receita da Semana" 
               value={`R$ ${revenueStats.week.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    trend="Semana"
                    subtitle="Acumulado 7 dias"
                    onClick={() => onNavigate('finance')}
                />
                <StatCard 
                icon={<DollarSign size={20} />} 
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Receita do Mês" 
                    value={`R$ ${revenueStats.month.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    trend="Mês"
                    subtitle="Ciclo Atual"
         onClick={() => onNavigate('finance')}
                />
                <StatCard 
                    icon={<TrendingUp size={20} />} 
                    colorClass="text-emerald-600 bg-emerald-50"
                    label="Receita do Ano" 
           value={`R$ ${revenueStats.year.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
                    trend="Ano"
                    subtitle="Total Anual"
                    onClick={() => onNavigate('finance')}
                />
            </div>

{/* Today's Agenda Summary */}
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
    trend: string;
    subtitle?: string;
    colorClass: string;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, subtitle, colorClass, onClick }) => (
    <motion.div 
        whileHover={{ y: -4, shadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
        onClick={onClick}
        className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className="flex justify-between items-start mb-6">
 <div className={`p-3 rounded-full flex items-center justify-center ${colorClass.split(' ')[1]}`}>
                <div className={colorClass.split(' ')[0]}>
                    {icon}
                </div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                {trend}
            </span>
        </div>
        
        <div className="flex flex-col items-start">
            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{label}</h3>
            <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
            {subtitle && <p className="text-[10px] text-orange-500 font-bold uppercase mt-2 tracking-tighter">{subtitle}</p>}
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