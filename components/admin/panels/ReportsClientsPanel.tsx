import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Users, TrendingUp, UserPlus, Award, DollarSign } from 'lucide-react';
import { useShop } from '../../../store';

interface ReportsClientsPanelProps {
    dateRange: string;
}

export const ReportsClientsPanel: React.FC<ReportsClientsPanelProps> = ({ dateRange }) => {
    const { appointments, clients, settings } = useShop();

    // Lógica de processamento de dados (Mantenha sua lógica atual aqui)
    const stats = {
        totalClients: clients.length,
        newClients: 12, // Exemplo: filtre por data se necessário
        activeClients: clients.filter(c => c.status === 'active').length,
        avgTicket: 85.50 // Exemplo: calculado dos atendimentos
    };

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="w-full space-y-8 animate-fade-in">
            {/* Cards no Padrão Correto */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Users size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total de Clientes</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{stats.totalClients}</div>
                    <div className="text-xs text-slate-400 mt-1">Clientes cadastrados</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <UserPlus size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Novos Clientes</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{stats.newClients}</div>
                    <div className="text-xs text-slate-400 mt-1">Neste período</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Clientes Ativos</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{stats.activeClients}</div>
                    <div className="text-xs text-slate-400 mt-1">Com agendamentos recentes</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                            <DollarSign size={20} />
                        </div>
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Ticket Médio</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{formatCurrency(stats.avgTicket)}</div>
                    <div className="text-xs text-slate-400 mt-1">Média por cliente</div>
                </div>
            </div>

            {/* Gráfico no Padrão de Design do Sistema */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-orange-500" />
                    Análise de Gasto por Cliente
                </h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={clients.slice(0, 8)}> {/* Exemplo de dados */}
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#64748b', fontSize: 12}}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#64748b', fontSize: 12}}
                                tickFormatter={(value) => `R$ ${value}`}
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [formatCurrency(value), 'Gasto Total']}
                            />
                            <Bar dataKey="totalSpent" radius={[4, 4, 0, 0]}>
                                {clients.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? settings.primaryColor : '#fb923c'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {/* Ranking de Clientes (Padrão de Lista) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Award size={20} className="text-orange-500" />
                    Top 10 Clientes
                </h3>
                <div className="space-y-2">
                    {clients.slice(0, 10).map((client, index) => (
                        <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-400 w-6">#{index + 1}</span>
                                <span className="font-bold text-slate-900">{client.name}</span>
                            </div>
                            <span className="font-black text-orange-600">{formatCurrency(client.totalSpent || 0)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};