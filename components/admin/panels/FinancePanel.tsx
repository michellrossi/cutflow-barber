import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useShop } from '../../../store';
import { DollarSign, TrendingUp, Users, Calendar, Award, ArrowUpRight, PieChart, Wallet, Filter, Loader2, RefreshCw, Download, ChevronRight } from 'lucide-react';
import { Appointment } from '../../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Legend, LineChart, Line } from 'recharts';
import { useToast } from '../../ui/ToastContext';

// Custom Tooltip para o Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border-slate-200 border p-3 rounded-lg shadow-xl">
                <p className="text-[#6b7d99] text-xs mb-1 font-bold">{label}</p>
                <p className="text-orange-500 font-bold text-sm">
                    R$ {payload[0].value.toFixed(2)}
                </p>
            </div>
        );
    }
    return null;
};

export const FinancePanel: React.FC = () => {
    const { professionals, services, fetchFinancialReport, settings } = useShop();
    const { showToast } = useToast();
    
    // Filtros de Data
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 29); // Últimos 30 dias (incluindo hoje)
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [activePreset, setActivePreset] = useState<string>('30days');
    
    // Estado local para relatório
    const [reportAppointments, setReportAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Carregar dados quando as datas mudam
    const loadReport = useCallback(async () => {
        setIsLoading(true);
        const data = await fetchFinancialReport(startDate, endDate);
        setReportAppointments(data);
        setIsLoading(false);
    }, [startDate, endDate, fetchFinancialReport]);

    // Efeito para recarregar automaticamente quando as datas mudam
    useEffect(() => {
        loadReport();
    }, [loadReport]); 

    // Atalhos de Data
    const setPreset = (type: '30days' | 'thisMonth' | 'lastMonth' | 'semester') => {
        const end = new Date();
        const start = new Date();
        
        setActivePreset(type);

        if (type === '30days') {
            start.setDate(end.getDate() - 29);
        } else if (type === 'thisMonth') {
            start.setDate(1);
        } else if (type === 'lastMonth') {
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            end.setDate(0); // Último dia do mês anterior
        } else if (type === 'semester') {
            start.setMonth(start.getMonth() - 6);
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        setActivePreset('custom');
        if (type === 'start') setStartDate(value);
        else setEndDate(value);
    };

    // Função de Exportação para CSV
    const handleExport = () => {
        if (reportAppointments.length === 0) {
            showToast('Não há dados para exportar neste período.', 'info');
            return;
        }

        // Cabeçalho do CSV
        const headers = ['Data', 'Hora', 'Cliente', 'Telefone', 'Profissional', 'Status', 'Valor Bruto (R$)', 'Comissao (R$)', 'Lucro Loja (R$)'];
        
        // Linhas
        const rows = reportAppointments.map(app => {
            const pro = professionals.find(p => p.id === app.professionalId);
            const rate = pro?.commissionPercentage ?? 50;
            
            // Cálculos (apenas se finalizado conta como receita real, mas exportamos tudo para conferencia)
            const commission = app.totalValue * (rate / 100);
            const profit = app.totalValue - commission;
            
            // Formatar Data
            const dateStr = new Date(app.date + 'T12:00:00').toLocaleDateString('pt-BR');

            // Formatar valores para padrão PT-BR no Excel (vírgula decimal)
            const valStr = app.totalValue.toFixed(2).replace('.', ',');
            const commStr = commission.toFixed(2).replace('.', ',');
            const profStr = profit.toFixed(2).replace('.', ',');

            return [
                dateStr,
                app.time,
                `"${app.clientName}"`, // Aspas para evitar quebra se tiver vírgula no nome
                `"${app.clientPhone}"`,
                `"${pro ? pro.name : 'N/A'}"`,
                app.status === 'completed' ? 'Finalizado' : app.status,
                valStr,
                commStr,
                profStr
            ].join(';'); // Ponto e vírgula é melhor para Excel em PT-BR
        });

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n'); // \uFEFF adiciona BOM para acentos funcionarem
        
        // Criar Blob e Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `relatorio_cutflow_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Processamento de Dados Financeiros
    const stats = useMemo(() => {
        // 1. Filtrar apenas finalizados para KPI financeiro real
        const completed = reportAppointments.filter(a => a.status === 'completed');
        
        // 2. Totais Gerais
        let totalRevenue = 0;
        let totalCommission = 0;
        let totalOwnerShare = 0;

        completed.forEach(app => {
            totalRevenue += app.totalValue;
            
            // Calcular comissão do profissional responsável
            if (app.professionalId) {
                const pro = professionals.find(p => p.id === app.professionalId);
                const rate = pro?.commissionPercentage ?? 50; // Default 50%
                const commission = app.totalValue * (rate / 100);
                totalCommission += commission;
                totalOwnerShare += (app.totalValue - commission);
            } else {
                // Se não tem profissional (improvável se completado), vai 100% pra loja
                totalOwnerShare += app.totalValue;
            }
        });

        const totalCount = completed.length;
        const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

        // 3. Agrupamento por Data (Gráfico de Evolução)
        const revenueByDate: Record<string, number> = {};
        completed.forEach(app => {
            revenueByDate[app.date] = (revenueByDate[app.date] || 0) + app.totalValue;
        });

        // Ordenar datas e preencher array para o gráfico
        const sortedDates = Object.keys(revenueByDate).sort();
        const chartData = sortedDates.map(date => ({
            date,
            displayDate: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            value: revenueByDate[date]
        }));

        // 4. Ranking de Profissionais
        const proRanking: Record<string, { name: string, value: number, count: number, photo: string }> = {};
        
        completed.forEach(app => {
            const proId = app.professionalId || 'unknown';
            if (!proRanking[proId]) {
                const pro = professionals.find(p => p.id === proId);
                proRanking[proId] = {
                    name: pro ? pro.name : 'Sem preferência / Deletado',
                    photo: pro ? pro.photoUrl : '',
                    value: 0,
                    count: 0
                };
            }
            proRanking[proId].value += app.totalValue;
            proRanking[proId].count += 1;
        });

        const sortedPros = Object.values(proRanking).sort((a, b) => b.value - a.value);

        // 5. Payment Methods
        const paymentMethods: Record<string, number> = {
            pix: 0,
            credit: 0,
            cash: 0,
            unknown: 0
        };

        completed.forEach(app => {
            const method = app.paymentMethod || 'unknown';
            paymentMethods[method] += app.totalValue;
        });

        const paymentMethodData = [
            { name: 'PIX', value: paymentMethods.pix, color: '#10b981' }, // green-500
            { name: 'Cartão de Crédito', value: paymentMethods.credit, color: '#3b82f6' }, // blue-500
            { name: 'Dinheiro', value: paymentMethods.cash, color: '#f59e0b' }, // amber-500
            { name: 'Não Informado', value: paymentMethods.unknown, color: '#64748b' } // slate-500
        ].filter(item => item.value > 0);

        // 6. Service Profitability
        const serviceRevenue: Record<string, number> = {};
        completed.forEach(app => {
            app.serviceIds.forEach(sid => {
                const service = services.find(s => s.id === sid);
                const name = service ? service.name : 'Serviço Deletado';
                serviceRevenue[name] = (serviceRevenue[name] || 0) + (service ? service.price : 0);
            });
        });

        const serviceData = Object.entries(serviceRevenue)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 services

        // 7. Client Ranking
        const clientRevenue: Record<string, { name: string, value: number, count: number, phone: string }> = {};
        completed.forEach(app => {
            const clientId = app.clientId || app.clientPhone; // Fallback to phone if no ID
            if (!clientRevenue[clientId]) {
                clientRevenue[clientId] = {
                    name: app.clientName,
                    phone: app.clientPhone,
                    value: 0,
                    count: 0
                };
            }
            clientRevenue[clientId].value += app.totalValue;
            clientRevenue[clientId].count += 1;
        });

        const sortedClients = Object.values(clientRevenue)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10 clients

        return {
            totalRevenue,
            totalCommission,
            totalOwnerShare,
            totalCount,
            avgTicket,
            chartData,
            sortedPros,
            paymentMethodData,
            serviceData,
            sortedClients
        };

    }, [reportAppointments, professionals, services]);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Controle Financeiro</h2>
                    <p className="text-[#6b7d99] font-medium">Visão geral de faturamento e desempenho.</p>
                </div>
                
                <button 
                    onClick={handleExport}
                    disabled={isLoading || reportAppointments.length === 0}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/10"
                >
                    <Download size={18} />
                    Exportar Relatório
                </button>
            </div>

            {/* BARRA DE FILTROS MODERNA */}
            <div className="bg-white p-1.5 rounded-xl border border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-2 shadow-sm">
                
                {/* Abas de Atalho */}
                <div className="flex bg-slate-50 p-1 rounded-full w-full lg:w-auto overflow-x-auto hide-scrollbar border border-slate-200">
                    {[
                        { id: '30days', label: '30 Dias' },
                        { id: 'thisMonth', label: 'Este Mês' },
                        { id: 'lastMonth', label: 'Mês Passado' },
                        { id: 'semester', label: 'Semestre' }
                    ].map((preset) => (
                        <button
                            key={preset.id}
                            onClick={() => setPreset(preset.id as any)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                                activePreset === preset.id 
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                                : 'text-[#6b7d99] hover:text-slate-900 hover:bg-white'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Seletor de Datas Unificado */}
                <div className="flex items-center gap-2 w-full lg:w-auto bg-slate-50 px-3 py-2 rounded-full border border-slate-200 focus-within:border-orange-500/50 transition-colors">
                    <Calendar size={16} className="text-[#6b7d99] shrink-0" />
                    <div className="flex items-center gap-2 flex-1">
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => handleDateChange('start', e.target.value)}
                            className="bg-transparent border-none text-slate-700 text-sm focus:outline-none w-full cursor-pointer font-sans"
                        />
                        <span className="text-[#6b7d99] font-medium">até</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => handleDateChange('end', e.target.value)}
                            className="bg-transparent border-none text-slate-700 text-sm focus:outline-none w-full cursor-pointer font-sans"
                        />
                    </div>
                </div>
            </div>

            {/* LOADING STATE OVERLAY */}
            <div className={`transition-opacity duration-300 relative ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Loader2 className="animate-spin text-orange-500" size={32} />
                    </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {/* Faturamento Total */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 relative overflow-hidden group hover:border-slate-300 transition-colors shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-500 border border-blue-100">
                                <DollarSign size={20} />
                            </div>
                            <span className="text-[#6b7d99] font-bold text-xs uppercase tracking-wider">Faturamento Bruto</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 mt-2">
                            R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Lucro da Loja (Owner Share) */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 relative overflow-hidden group hover:border-slate-300 transition-colors shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-50 rounded-lg text-green-500 border border-green-100">
                                <Wallet size={20} />
                            </div>
                            <span className="text-[#6b7d99] font-bold text-xs uppercase tracking-wider">Lucro da Loja</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600 mt-2">
                            R$ {stats.totalOwnerShare.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Comissões a Pagar */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 relative overflow-hidden group hover:border-slate-300 transition-colors shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-50 rounded-lg text-orange-500 border border-orange-100">
                                <PieChart size={20} />
                            </div>
                            <span className="text-[#6b7d99] font-bold text-xs uppercase tracking-wider">Comissões (Equipe)</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-600 mt-2">
                            R$ {stats.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>

                    {/* Ticket Médio */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 relative overflow-hidden group hover:border-slate-300 transition-colors shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-50 rounded-lg text-purple-500 border border-purple-100">
                                <Award size={20} />
                            </div>
                            <span className="text-[#6b7d99] font-bold text-xs uppercase tracking-wider">Ticket Médio</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 mt-2">
                            R$ {stats.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* Gráficos Principais */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    
                    {/* Gráfico de Evolução Diária */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 flex flex-col min-h-[400px] shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-6">Evolução do Faturamento</h3>
                        
                        {stats.chartData.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-[#6b7d99] h-64 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <TrendingUp size={32} className="mb-2 opacity-50"/>
                                <p>Sem dados financeiros para o período.</p>
                            </div>
                        ) : (
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} vertical={false} />
                                        <XAxis 
                                            dataKey="displayDate" 
                                            stroke="#6b7d99" 
                                            fontSize={12} 
                                            tickLine={false} 
                                            axisLine={false}
                                            dy={10}
                                            minTickGap={20}
                                        />
                                        <YAxis 
                                            stroke="#6b7d99" 
                                            fontSize={12} 
                                            tickLine={false} 
                                            axisLine={false}
                                            tickFormatter={(value) => `R$${value}`}
                                            width={60}
                                        />
                                        <Tooltip 
                                            content={<CustomTooltip />} 
                                            cursor={{fill: '#f1f5f9', opacity: 0.5}} 
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]} animationDuration={1000}>
                                            {stats.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={settings.primaryColor || '#f97316'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Formas de Pagamento */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 flex flex-col min-h-[400px] shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <PieChart size={18} className="text-blue-500"/>
                            Formas de Pagamento
                        </h3>
                        {stats.paymentMethodData.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-[#6b7d99] h-full border border-dashed border-slate-200 rounded-xl bg-slate-50">
                                <PieChart size={32} className="mb-2 opacity-50"/>
                                <p>Sem dados financeiros.</p>
                            </div>
                        ) : (
                            <div className="flex-1 w-full min-h-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={stats.paymentMethodData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {stats.paymentMethodData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                                            contentStyle={{ 
                                                backgroundColor: '#ffffff', 
                                                borderColor: '#e2e8f0', 
                                                borderRadius: '0.5rem', 
                                                border: '1px solid',
                                                color: '#1e293b'
                                            }}
                                            itemStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                        />
                                        <Legend 
                                            verticalAlign="bottom" 
                                            align="center"
                                            iconType="circle"
                                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                                        />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                                {/* Centro do Donut */}
                                <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                    <p className="text-[10px] font-bold text-[#6b7d99] uppercase tracking-widest">Total</p>
                                    <p className="text-xl font-bold text-slate-900">R$ {stats.totalRevenue.toFixed(0)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Rankings em Linha */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Ranking de Profissionais */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col h-[450px] shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Award size={18} className="text-yellow-500"/>
                            Top Profissionais
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                            {stats.sortedPros.length === 0 ? (
                                <p className="text-[#6b7d99] text-sm text-center py-10 font-medium italic">Nenhum dado disponível.</p>
                            ) : (
                                stats.sortedPros.map((pro, idx) => (
                                    <div key={idx} className="flex items-center gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 group">
                                        <div className="relative shrink-0">
                                            <img src={pro.photo || 'https://via.placeholder.com/40'} alt={pro.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 group-hover:border-slate-300 transition-colors" referrerPolicy="no-referrer" />
                                            {idx < 3 && (
                                                <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : 'bg-orange-700'}`}>
                                                    {idx + 1}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-slate-900 truncate">{pro.name}</span>
                                                <span className="text-sm font-bold text-green-600">R$ {pro.value.toFixed(0)}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className="bg-green-500 h-full rounded-full transition-all duration-1000" 
                                                    style={{ width: `${(pro.value / (stats.totalRevenue || 1)) * 100}%` }}
                                                ></div>
                                            </div>
                                            <div className="mt-1 text-xs text-[#6b7d99] text-right font-medium">
                                                {pro.count} atendimentos
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Ranking de Clientes */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col h-[450px] shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Users size={18} className="text-orange-500"/>
                            Top Clientes
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                            {stats.sortedClients.length === 0 ? (
                                <p className="text-[#6b7d99] text-sm text-center py-10 font-medium italic">Nenhum dado disponível.</p>
                            ) : (
                                stats.sortedClients.map((client, idx) => (
                                    <div key={idx} className="flex items-center gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 group">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-700' : 'bg-slate-300'}`}>
                                            {idx + 1}º
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-slate-900 truncate">{client.name}</span>
                                                <span className="text-sm font-bold text-orange-600">R$ {client.value.toFixed(0)}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className="bg-orange-500 h-full rounded-full transition-all duration-1000" 
                                                    style={{ width: `${(client.value / (stats.totalRevenue || 1)) * 100}%` }}
                                                ></div>
                                            </div>
                                            <div className="mt-1 text-xs text-[#6b7d99] text-right font-medium">
                                                {client.count} visitas
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Ranking de Serviços */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col h-[450px] shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <TrendingUp size={18} className="text-green-500"/>
                            Top Serviços
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                            {stats.serviceData.length === 0 ? (
                                <p className="text-[#6b7d99] text-sm text-center py-10 font-medium italic">Nenhum dado disponível.</p>
                            ) : (
                                stats.serviceData.map((item, index) => {
                                    const maxVal = Math.max(...stats.serviceData.map(d => d.value));
                                    const percentage = (item.value / maxVal) * 100;
                                    
                                    return (
                                        <div key={index} className="space-y-2 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-slate-700 truncate">{item.name}</span>
                                                <span className="text-sm font-bold text-slate-900">R$ {item.value.toFixed(0)}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full transition-all duration-1000"
                                                    style={{ 
                                                        width: `${percentage}%`,
                                                        backgroundColor: settings.primaryColor 
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};