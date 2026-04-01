import React, { useState } from 'react';
import { BarChart3, Users, Briefcase, Scissors, Settings, Users as UsersIcon } from 'lucide-react';
import { ReportsFinancePanel } from './ReportsFinancePanel';
import { ReportsClientsPanel } from './ReportsClientsPanel';
import { ReportsTeamPanel } from './ReportsTeamPanel';
import { ReportsServicesPanel } from './ReportsServicesPanel';
import { DateRangeFilter } from '../ui/DateRangeFilter';

type ReportSubTab = 'finance' | 'clients' | 'team' | 'services';

export const ReportsPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ReportSubTab>('finance');
    const [dateRange, setDateRange] = useState('30 dias');

    const tabs = [
        { id: 'finance', label: 'Financeiro', icon: BarChart3 },
        { id: 'clients', label: 'Clientes', icon: UsersIcon },
        { id: 'team', label: 'Profissionais', icon: Users },
        { id: 'services', label: 'Serviços', icon: Scissors },
    ];

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Relatórios</h2>
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
                <DateRangeFilter onFilterChange={setDateRange} />
            </div>

            <div className="animate-fade-in">
                {activeTab === 'finance' && <ReportsFinancePanel dateRange={dateRange} />}
                {activeTab === 'clients' && <ReportsClientsPanel dateRange={dateRange} />}
                {activeTab === 'team' && <ReportsTeamPanel dateRange={dateRange} />}
                {activeTab === 'services' && <ReportsServicesPanel dateRange={dateRange} />}
            </div>
        </div>
    );
};
