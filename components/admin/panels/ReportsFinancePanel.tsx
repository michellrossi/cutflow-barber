import React from 'react';
import { BarChart, PieChart, TrendingUp, DollarSign, Users, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

export const ReportsFinancePanel: React.FC = () => {
    // Mock data for charts
    const revenueData = [
        { name: 'Jan', value: 4000 },
        { name: 'Fev', value: 3000 },
        { name: 'Mar', value: 5000 },
    ];
    const paymentData = [
        { name: 'Cartão', value: 400 },
        { name: 'Dinheiro', value: 300 },
        { name: 'Pix', value: 300 },
    ];
    const COLORS = ['#f97316', '#fb923c', '#fdba74'];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-500">Faturamento Total</h4>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ 12.000,00</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-500">Lucro da Loja</h4>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ 4.500,00</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-500">Comissões</h4>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ 3.000,00</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-500">Ticket Médio</h4>
                    <p className="text-2xl font-bold text-slate-900 mt-2">R$ 120,00</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Evolução do Faturamento</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#f97316" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Formas de Pagamento</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                                <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                    {paymentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
