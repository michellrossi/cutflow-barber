import React, { useMemo } from 'react';
import { useShop } from '../../../store';
import { 
    Users, 
    Calendar, 
    UserCheck, 
    TrendingUp, 
    Clock, 
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

// Componente de Card Padronizado
const StatCard: React.FC<{ 
    label: string; 
    value: string | number; 
    icon: React.ReactNode; 
    trend: string; 
    color: 'orange' | 'blue' | 'emerald' | 'purple';
    subtitle?: string;
    onClick?: () => void;
}> = ({ label, value, icon, trend, color, subtitle, onClick }) => {
    const colorStyles = {
        orange: "bg-orange-50 text-orange-600",
        blue: "bg-blue-50 text-blue-600",
        emerald: "bg-emerald-50 text-emerald-600",
        purple: "bg-purple-50 text-purple-600",
    };

    return (
        <motion.div 
            whileHover={{ y: -4 }}
            onClick={onClick}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer transition-all hover:shadow-md"
        >
            <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorStyles[color]}`}>
                    {React.cloneElement(icon as React.ReactElement, { size: 24 })}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    {trend}
                </span>
            </div>
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</h3>
                <p className="text-3xl font-black text-slate-900">{value}</p>
                {subtitle && (
                    <p className="text-[10px] text-orange-500 font-bold mt-1 uppercase tracking-tight flex items-center gap-1">
                        {subtitle}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

export const DashboardPanel: React.FC<{ onNavigate: (tab: any, filter?: string) => void }> = ({ onNavigate }) => {
    const { appointments, clients, settings } = useShop();
    const today = new Date().toISOString().split('T')[0];

    // Cálculos de Estatísticas
    const todayAppointments = useMemo(() => 
        appointments.filter(apt => apt.date === today && apt.status !== 'cancelled'),
    [appointments, today]);

    const newClientsThisMonth = useMemo(() => {
        const now = new Date();
        return clients.filter(client => {
            const createdAt = new Date(client.createdAt || Date.now());
            return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
        }).length;
    }, [clients]);

    const estimatedRevenue = useMemo(() => 
        todayAppointments.reduce((acc, curr) => acc + (curr.totalValue || 0), 0),
    [todayAppointments]);

    const inactiveClientsCount = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return clients.filter(c => c.status === 'inactive').length;
    }, [clients]);

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="w-full space-y-8 animate-fade-in">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Olá, Bem-vindo de volta!</h2>
                    <p className="text-[#6b7d99] text-sm font-medium">Aqui está o que está acontecendo na sua loja hoje.</p>
                </div>
            </div>

            {/* Grid de Cards Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    label="Agendamentos Hoje"
                    value={todayAppointments.length}
                    icon={<Calendar />}
                    trend="Hoje"
                    color="orange"
                    subtitle={`${todayAppointments.filter(a => a.status === 'confirmed').length} confirmados`}
                    onClick={() => onNavigate('appointments')}
                />
                <StatCard 
                    label="Clientes Inativos"
                    value={inactiveClientsCount}
                    icon={<Users />}
                    trend="+30 dias"
                    color="blue"
                    subtitle="Sem retorno recente"
                    onClick={() => onNavigate('clients', 'inactive')}
                />
                <StatCard 
                    label="Novos Clientes"
                    value={newClientsThisMonth}
                    icon={<UserCheck />}
                    trend="Mês"
                    color="emerald"
                    subtitle="Cadastrados este mês"
                    onClick={() => onNavigate('clients')}
                />
                <StatCard 
                    label="Faturamento Estimado"
                    value={formatCurrency(estimatedRevenue)}
                    icon={<TrendingUp />}
                    trend="Hoje"
                    color="purple"
                    subtitle="Total previsto"
                    onClick={() => onNavigate('finance')}
                />
            </div>

            {/* Seção de Próximos Clientes (Exemplo de Tabela/Lista Padronizada) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Clock size={18} className="text-orange-500" />
                        Próximos Atendimentos
                    </h3>
                    <button 
                        onClick={() => onNavigate('appointments')}
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 uppercase tracking-wider"
                    >
                        Ver agenda completa <ArrowRight size={14} />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Horário</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {todayAppointments.slice(0, 5).map((apt) => (
                                <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{apt.time}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-slate-900">{apt.clientName}</div>
                                        <div className="text-xs text-slate-400">{apt.services?.join(', ')}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                            apt.status === 'confirmed' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                                        }`}>
                                            {apt.status === 'confirmed' ? 'Confirmado' : 'Agendado'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {todayAppointments.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                        Nenhum agendamento para hoje até o momento.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};