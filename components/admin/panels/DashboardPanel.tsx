import React, { useMemo } from 'react';
import { useShop } from '../../../store';
import { Users, Calendar, UserCheck, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

// Componente de Card com o design da imagem
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
                {/* Ícone no círculo conforme a imagem */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorStyles[color]}`}>
                    {React.cloneElement(icon as React.ReactElement, { size: 24 })}
                </div>
                {/* Badge de Trend */}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    {trend}
                </span>
            </div>
            <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</h3>
                {/* Valor em destaque font-black */}
                <p className="text-3xl font-black text-slate-900">{value}</p>
                {subtitle && (
                    <p className="text-[10px] text-orange-500 font-bold mt-1 uppercase tracking-tight">
                        {subtitle}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

export const DashboardPanel: React.FC<{ onNavigate: (tab: any, filter?: string) => void }> = ({ onNavigate }) => {
    const { appointments, clients } = useShop();
    const today = new Date().toISOString().split('T')[0];

    // Restaurando os 4 cálculos originais do seu arquivo
    const todayAppointments = useMemo(() => 
        appointments.filter(apt => apt.date === today && apt.status !== 'cancelled'),
    [appointments, today]);

    const inactiveClientsCount = useMemo(() => {
        return clients.filter(c => c.status === 'inactive').length;
    }, [clients]);

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

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="w-full space-y-8 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h2>
                <p className="text-[#6b7d99] text-sm font-medium">Visão geral da sua barbearia hoje.</p>
            </div>

            {/* Grid com os 4 cards originais recuperados */}
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

            {/* Tabela original mantida conforme solicitado */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Clock size={18} className="text-orange-500" />
                        Próximos Atendimentos
                    </h3>
                    <button 
                        onClick={() => onNavigate('appointments')}
                        className="text-orange-500 text-sm hover:underline flex items-center gap-1"
                    >
                        Ver todos <ArrowRight size={16} />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-800/30">
                                <th className="px-4 py-3 text-slate-400 font-medium text-sm">Horário</th>
                                <th className="px-4 py-3 text-slate-400 font-medium text-sm">Cliente</th>
                                <th className="px-4 py-3 text-slate-400 font-medium text-sm">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {todayAppointments.slice(0, 5).map((apt) => (
                                <tr key={apt.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-4 py-3 text-white font-medium">{apt.time}</td>
                                    <td className="px-4 py-3">
                                        <div className="text-white font-medium">{apt.clientName}</div>
                                        <div className="text-slate-500 text-xs">{apt.services?.join(', ')}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                            apt.status === 'confirmed' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                        }`}>
                                            {apt.status === 'confirmed' ? 'Confirmado' : 'Agendado'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};