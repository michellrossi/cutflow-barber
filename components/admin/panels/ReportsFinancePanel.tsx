import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, PieChart, TrendingUp, DollarSign, Users, Clock, Wallet, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RechartsPieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { useShop } from '../../../store';

interface ReportsFinancePanelProps {
    dateRange: string;
}

export const ReportsFinancePanel: React.FC<ReportsFinancePanelProps> = ({ dateRange }) => {
    const { appointments, fetchFinancialReport, settings, professionals, clients } = useShop();
    const [filteredAppointments, setFilteredAppointments] = useState(appointments);

    useEffect(() => {
        const loadData = async () => {
            const now = new Date();
            let startDate = new Date();
            
            if (dateRange && dateRange.includes('|')) {
                const [startStr, endStr] = dateRange.split('|');
                startDate = new Date(startStr + 'T00:00:00');
                now.setTime(new Date(endStr + 'T23:59:59').getTime());
            } else if (dateRange === '30 dias') startDate.setDate(now.getDate() - 30);
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

    const stats = useMemo(() => {
        const completed = filteredAppointments.filter(a => a.status === 'completed');
        
        // CÁLCULO REAL BASEADO NOS PROFISSIONAIS
        let totalRevenue = 0;
        let totalCommissions = 0;

        completed.forEach(app => {
            totalRevenue += app.totalValue;
            
            if (app.professionalId) {
                const pro = professionals.find(p => p.id === app.professionalId);
                const rate = pro?.commissionPercentage ?? 50;
                const commission = app.totalValue * (rate / 100);
                totalCommissions += commission;
            }
        });

        const profit = totalRevenue - totalCommissions;
        const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

        // Agrupamento por Data (Gráfico de Evolução)
        const revenueByDate: Record<string, number> = {};
        completed.forEach(app => {
            revenueByDate[app.date] = (revenueByDate[app.date] || 0) + app.totalValue;
        });

        const sortedDates = Object.keys(revenueByDate).sort();
        const chartData = sortedDates.map(date => ({
            date,
            displayDate: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            value: revenueByDate[date]
        }));

        const paymentData = [
            { name: 'Cartão', value: completed.filter(a => a.paymentMethod === 'credit').length, color: '#3b82f6' },
            { name: 'Dinheiro', value: completed.filter(a => a.paymentMethod === 'cash').length, color: '#eab308' },
            { name: 'Pix', value: completed.filter(a => a.paymentMethod === 'pix').length, color: '#22c55e' },
        ].filter(d => d.value > 0);

        // --- DADOS PARA O GRÁFICO DE OCUPAÇÃO ---
        const occupancyData: { date: string; displayDate: string; occupancy: number; fill: string }[] = [];
        
        // Obter horas de funcionamento (fallback para 10h diárias se não configurado)
        let totalDailyHours = 10;
        if (settings?.businessHours) {
            // Lógica simplificada: média de horas dos dias úteis
            // Na implementação real baseada no Supabase, leremos do JSON
            // ex: const schedule = settings.businessHours.monday;
            // totalDailyHours = (schedule.end - schedule.start)
        }
        
        const activeProfessionalsCount = professionals.length > 0 ? professionals.length : 1;
        const totalAvailableHoursPerDay = totalDailyHours * activeProfessionalsCount;

        // --- CÁLCULO MENSAL CLIENTES NOVOS E OCUPAÇÃO ---
        const monthlyDataMap: Record<string, { novos: number, bookedHours: number, label: string }> = {};

        completed.forEach(app => {
            const dateStr = app.date; // YYYY-MM-DD
            if (!monthlyDataMap[dateStr]) {
                const d = new Date(dateStr + 'T12:00:00');
                monthlyDataMap[dateStr] = { 
                    novos: 0, 
                    bookedHours: 0, 
                    label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) 
                };
            }
            monthlyDataMap[dateStr].bookedHours += 1; // Simplificando 1 agendamento = 1 hora
        });

        // Contar clientes novos (criados naquele dia)
        clients.forEach(c => {
            if (!c.createdAt) return;
            const dateStr = c.createdAt.split('T')[0];
            if (!monthlyDataMap[dateStr]) {
                const d = new Date(dateStr + 'T12:00:00');
                monthlyDataMap[dateStr] = { 
                    novos: 0, 
                    bookedHours: 0, 
                    label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) 
                };
            }
            monthlyDataMap[dateStr].novos += 1;
        });

        const sortedDailyKeys = Object.keys(monthlyDataMap).sort();
        
        const combinedDailyData = sortedDailyKeys.map(key => {
            const booked = monthlyDataMap[key].bookedHours;
            const occupancyRate = (booked / totalAvailableHoursPerDay) * 100;
            let fillColor = '#ef4444'; // Red < 50%
            if (occupancyRate >= 80) fillColor = '#22c55e'; // Green >= 80%
            else if (occupancyRate >= 50) fillColor = '#eab308'; // Yellow 50-79%

            return {
                name: monthlyDataMap[key].label,
                novos: monthlyDataMap[key].novos,
                occupancyRate: Math.min(occupancyRate, 100),
                fill: fillColor
            };
        });

        return { totalRevenue, totalCommissions, profit, avgTicket, chartData, paymentData, combinedDailyData };
    }, [filteredAppointments, professionals, clients, settings]);

    return (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Faturamento Total */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <DollarSign size={20} />
          </div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Faturamento Total</span>
        </div>
        <div className="text-3xl font-black text-slate-900">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)}
        </div>
        <div className="text-xs text-slate-400 mt-1">Valor bruto acumulado</div>
      </div>

      {/* Lucro da Loja */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp size={20} />
          </div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Lucro da Loja</span>
        </div>
        <div className="text-3xl font-black text-slate-900">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.profit)}
        </div>
        <div className="text-xs text-slate-400 mt-1">Líquido após comissões</div>
      </div>

      {/* Comissões */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Users size={20} />
          </div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Comissões</span>
        </div>
        <div className="text-3xl font-black text-slate-900">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalCommissions)}
        </div>
        <div className="text-xs text-slate-400 mt-1">Total pago à equipe</div>
      </div>

      {/* Ticket Médio */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Clock size={20} />
          </div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Ticket Médio</span>
        </div>
        <div className="text-3xl font-black text-slate-900">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.avgTicket)}
        </div>
        <div className="text-xs text-slate-400 mt-1">Média por atendimento</div>
      </div>
    </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-3">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-orange-500" />
                        Evolução do Faturamento
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.chartData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={settings.primaryColor || '#f97316'} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={settings.primaryColor || '#f97316'} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="displayDate" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="value" stroke={settings.primaryColor || '#f97316'} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <PieChartIcon size={20} className="text-orange-500" />
                        Formas de Pagamento
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                                <Pie data={stats.paymentData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                    {stats.paymentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </RechartsPieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Novo Gráfico: Ocupação */}
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Clock size={20} className="text-blue-500" />
                        Taxa de Ocupação (Diária)
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={stats.combinedDailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Ocupação']} />
                                <Bar dataKey="occupancyRate" radius={[4, 4, 0, 0]}>
                                    {stats.combinedDailyData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> &ge; 80%</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> 50% - 79%</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> &lt; 50%</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
