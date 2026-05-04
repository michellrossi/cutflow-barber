import React, { useState } from 'react';
import { BarChart3, Users, Briefcase, Scissors, Settings, Users as UsersIcon, Plus, Download, Package, Target } from 'lucide-react';
import { useShop } from '../../../store';
import { ReportsFinancePanel } from './ReportsFinancePanel';
import { ReportsClientsPanel } from './ReportsClientsPanel';
import { ReportsTeamPanel } from './ReportsTeamPanel';
import { ReportsServicesPanel } from './ReportsServicesPanel';
import { ReportsProductsPanel } from './ReportsProductsPanel';
import { ReportsGoalsPanel } from './ReportsGoalsPanel';
import { DateRangeFilter } from '../ui/DateRangeFilter';

type ReportSubTab = 'finance' | 'clients' | 'team' | 'services' | 'products' | 'goals';

export const ReportsPanel: React.FC<{ initialTab?: ReportSubTab }> = ({ initialTab }) => {
    const { appointments, clients, services, professionals } = useShop();
    const [activeTab, setActiveTab] = useState<ReportSubTab>(initialTab || 'finance');
    const [dateRange, setDateRange] = useState('30 dias');

    const handleExportConsolidated = () => {
        // Parse dates from range
        let start = new Date();
        let end = new Date();
        
        if (dateRange.includes('|')) {
            const [s, e] = dateRange.split('|');
            start = new Date(s + 'T00:00:00');
            end = new Date(e + 'T23:59:59');
        } else {
            const days = parseInt(dateRange);
            start.setDate(start.getDate() - days);
        }

        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const appointmentsList = Array.isArray(appointments) ? appointments : [];
        const clientsList = Array.isArray(clients) ? clients : [];
        const servicesList = Array.isArray(services) ? services : [];
        const professionalsList = Array.isArray(professionals) ? professionals : [];

        const filteredAppts = appointmentsList.filter(a => a.date >= startStr && a.date <= endStr);
        const filteredClients = clientsList.filter(c => {
            const created = new Date(c.createdAt || '');
            return created >= start && created <= end;
        });

        const faturamento = filteredAppts.filter(a => a.status === 'completed').reduce((acc, a) => acc + a.totalValue, 0);
        const totalAgendamentos = filteredAppts.length;
        const noShows = filteredAppts.filter(a => a.status === 'noshow').length;
        const ocupacao = totalAgendamentos > 0 ? ((filteredAppts.filter(a => a.status === 'completed').length / totalAgendamentos) * 100).toFixed(1) : 0;

        // Serviços mais realizados
        const serviceCounts: Record<string, number> = {};
        filteredAppts.forEach(a => {
            if (Array.isArray(a.serviceIds)) {
                a.serviceIds.forEach(sid => {
                    const sName = servicesList.find(s => s.id === sid)?.name || 'Outro';
                    serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
                });
            }
        });
        const topServices = Object.entries(serviceCounts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([n, c]) => `${n} (${c})`).join('; ');

        // Melhores Profissionais
        const proCounts: Record<string, number> = {};
        filteredAppts.filter(a => a.status === 'completed').forEach(a => {
            const pName = professionalsList.find(p => p.id === a.professionalId)?.name || 'Outro';
            proCounts[pName] = (proCounts[pName] || 0) + a.totalValue;
        });
        const topPros = Object.entries(proCounts).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([n, v]) => `${n} (R$ ${v.toFixed(2)})`).join('; ');

        const csvContent = [
            ['Relatorio Consolidado Insight Barber', `Periodo: ${startStr} ate ${endStr}`],
            [''],
            ['METRICAS GERAIS'],
            ['Faturamento Total', `R$ ${faturamento.toFixed(2)}`],
            ['Total de Agendamentos', totalAgendamentos],
            ['Total de Faltas (No-show)', noShows],
            ['Taxa de Conclusao', `${ocupacao}%`],
            ['Novos Clientes no Periodo', filteredClients.length],
            [''],
            ['RANKING DE SERVICOS (Volume)'],
            [topServices],
            [''],
            ['RANKING DE PROFISSIONAIS (Faturamento)'],
            [topPros],
            [''],
            ['DADOS DETALHADOS DOS AGENDAMENTOS'],
            ['Data', 'Hora', 'Cliente', 'Servicos', 'Profissional', 'Valor', 'Status'],
            ...filteredAppts.map(a => [
                a.date, 
                a.time, 
                a.clientName, 
                (Array.isArray(a.serviceIds) ? a.serviceIds : []).map(sid => servicesList.find(s => s.id === sid)?.name).filter(Boolean).join(' | '),
                professionalsList.find(p => p.id === a.professionalId)?.name || '---',
                a.totalValue,
                a.status
            ])
        ].map(e => e.join(',')).join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Relatorio_Geral_${startStr}_${endStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const tabs = [
        { id: 'finance',  label: 'Financeiro',  icon: BarChart3  },
        { id: 'clients',  label: 'Clientes',    icon: UsersIcon  },
        { id: 'team',     label: 'Profissionais', icon: Users    },
        { id: 'services', label: 'Serviços',    icon: Scissors   },
        { id: 'products', label: 'Produtos',    icon: Package    },
        { id: 'goals',    label: 'Metas',       icon: Target     },
    ];

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Gestão de Dados</h2>
                <p className="text-[#6b7d99] text-sm font-medium">Acompanhe o desempenho do seu negócio com dados detalhados.</p>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit overflow-x-auto no-scrollbar max-w-full">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as ReportSubTab)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-white text-orange-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleExportConsolidated}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#ea580c] text-white rounded-[50px] font-bold text-sm shadow-[0px_4px_10px_rgba(0,0,0,0.1)] hover:bg-[#d44d0b] transition-all group"
                    >
                        <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                        Exportar Relatório Geral
                    </button>
                    <DateRangeFilter onFilterChange={setDateRange} />
                </div>
            </div>

            <div className="animate-fade-in">
                {activeTab === 'finance'  && <ReportsFinancePanel  dateRange={dateRange} />}
                {activeTab === 'clients'  && <ReportsClientsPanel  dateRange={dateRange} />}
                {activeTab === 'team'     && <ReportsTeamPanel     dateRange={dateRange} />}
                {activeTab === 'services' && <ReportsServicesPanel dateRange={dateRange} />}
                {activeTab === 'products' && <ReportsProductsPanel dateRange={dateRange} />}
                {activeTab === 'goals'    && <ReportsGoalsPanel    dateRange={dateRange} />}
            </div>
        </div>
    );
};
