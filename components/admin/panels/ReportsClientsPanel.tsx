import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users, TrendingUp, UserPlus, Award } from 'lucide-react';
import { useShop } from '../../../store';

interface ReportsClientsPanelProps {
    dateRange: string;
}

export const ReportsClientsPanel: React.FC<ReportsClientsPanelProps> = ({ dateRange }) => {
    const { appointments, clients, fetchFinancialReport } = useShop();
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

    const totalAtendidos = filteredAppointments.length;
    const totalNovos = clients.filter(c => new Date(c.createdAt) >= new Date(new Date().setDate(new Date().getDate() - 30))).length; // Simplificação
    const totalAssinantes = clients.filter(c => c.loyaltyPoints > 0).length; // Exemplo

    const clientData = [
        { name: 'Jan', atendidos: 100, novos: 20, gastoMedio: 150 },
        { name: 'Fev', atendidos: 120, novos: 25, gastoMedio: 160 },
        { name: 'Mar', atendidos: 150, novos: 30, gastoMedio: 170 },
    ];
    
    const topClients = clients
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)
        .map(c => ({ name: c.name, gasto: `R$ ${c.totalSpent.toFixed(2)}` }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-orange-500" />
                        <h4 className="text-sm font-bold text-slate-500">Clientes Atendidos</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">{totalAtendidos}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <UserPlus size={16} className="text-green-500" />
                        <h4 className="text-sm font-bold text-slate-500">Clientes Novos</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">{totalNovos}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Award size={16} className="text-blue-500" />
                        <h4 className="text-sm font-bold text-slate-500">Assinantes Ativos</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">{totalAssinantes}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Clientes Atendidos por Mês</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={clientData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="atendidos" fill="#f97316" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Gasto Médio por Cliente</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={clientData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="gastoMedio" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Award size={20} className="text-orange-500" />
                    Top 10 Clientes
                </h3>
                <div className="space-y-2">
                    {topClients.map((client, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                            <span className="font-medium text-slate-900">{index + 1}. {client.name}</span>
                            <span className="font-bold text-slate-900">{client.gasto}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
