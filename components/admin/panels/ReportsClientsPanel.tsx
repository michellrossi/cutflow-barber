import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { DateRangeFilter } from '../ui/DateRangeFilter';
import { Users, TrendingUp, UserPlus, Award } from 'lucide-react';

export const ReportsClientsPanel: React.FC = () => {
    const clientData = [
        { name: 'Jan', atendidos: 100, novos: 20, gastoMedio: 150 },
        { name: 'Fev', atendidos: 120, novos: 25, gastoMedio: 160 },
        { name: 'Mar', atendidos: 150, novos: 30, gastoMedio: 170 },
    ];
    
    const topClients = [
        { name: 'João Silva', gasto: 'R$ 500,00' },
        { name: 'Maria Souza', gasto: 'R$ 450,00' },
        { name: 'Pedro Santos', gasto: 'R$ 400,00' },
        { name: 'Ana Oliveira', gasto: 'R$ 350,00' },
        { name: 'Lucas Lima', gasto: 'R$ 300,00' },
        { name: 'Mariana Costa', gasto: 'R$ 250,00' },
        { name: 'Ricardo Alves', gasto: 'R$ 200,00' },
        { name: 'Fernanda Rocha', gasto: 'R$ 150,00' },
        { name: 'Gabriel Martins', gasto: 'R$ 100,00' },
        { name: 'Juliana Pereira', gasto: 'R$ 50,00' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <DateRangeFilter />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Users size={16} className="text-orange-500" />
                        <h4 className="text-sm font-bold text-slate-500">Clientes Atendidos</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">370</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <UserPlus size={16} className="text-green-500" />
                        <h4 className="text-sm font-bold text-slate-500">Clientes Novos</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">75</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Award size={16} className="text-blue-500" />
                        <h4 className="text-sm font-bold text-slate-500">Assinantes Ativos</h4>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-2">45</p>
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
