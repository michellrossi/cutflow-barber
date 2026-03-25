
import React, { useState, useEffect } from 'react';
import { useShop } from '../../store';
import { Users, Scissors, Tag, Palette, CalendarCheck, LogOut, ExternalLink, Smartphone, DollarSign, AlertTriangle, Lock, Settings, UserCircle, Award, Sparkles, Moon, Sun } from 'lucide-react';
import { TeamPanel } from './panels/TeamPanel';
import { ServicesPanel } from './panels/ServicesPanel';
import { CouponsPanel } from './panels/CouponsPanel';
import { AppointmentsPanel } from './panels/AppointmentsPanel';
import { FinancePanel } from './panels/FinancePanel';
import { ClientsPanel } from './panels/ClientsPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { LoyaltyPanel } from './panels/LoyaltyPanel';
import { InsightPanel } from './panels/InsightPanel';
import { PaywallScreen } from '../billing/PaywallScreen';
import { PaymentModal } from '../billing/PaymentModal';

type AdminTab = 'team' | 'services' | 'coupons' | 'appointments' | 'finance' | 'clients' | 'settings' | 'loyalty' | 'insight';

export const AdminDashboard: React.FC<{ onLogout: () => void, onViewClient: () => void }> = ({ onLogout, onViewClient }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
      const saved = localStorage.getItem('adminActiveTab');
      return (saved as AdminTab) || 'team';
  });
  
  const { settings, trialStatus, daysRemaining, theme, toggleTheme } = useShop();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
      localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  // --- 1. PAYWALL CHECK ---
  if (trialStatus === 'expired') {
      return <PaywallScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'team': return <TeamPanel />;
      case 'services': return <ServicesPanel />;
      case 'coupons': return <CouponsPanel />;
      case 'appointments': return <AppointmentsPanel />;
      case 'finance': return <FinancePanel />;
      case 'clients': return <ClientsPanel />;
      case 'loyalty': return <LoyaltyPanel />;
      case 'settings': return <SettingsPanel />;
      case 'insight': return <InsightPanel />;
      default: return <TeamPanel />;
    }
  };

  const getTabLabel = (tab: AdminTab) => {
      switch(tab) {
          case 'team': return 'Gerenciar Equipe';
          case 'services': return 'Gerenciar Serviços';
          case 'coupons': return 'Gerenciar Cupons';
          case 'appointments': return 'Vendas & Agenda';
          case 'finance': return 'Financeiro';
          case 'clients': return 'Gestão de Clientes';
          case 'loyalty': return 'Programa de Fidelidade';
          case 'settings': return 'Configurações';
          case 'insight': return 'Insights com IA';
      }
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden flex-col md:flex-row w-full">
      
      <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} />

      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold overflow-hidden" style={{ backgroundColor: settings.primaryColor }}>
             {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Scissors size={18} />}
          </div>
          <span className="font-bold text-xl tracking-tight truncate">{settings.name}</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem icon={<Users size={20} />} label="Equipe" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
          <SidebarItem icon={<Scissors size={20} />} label="Serviços" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
          <SidebarItem icon={<Tag size={20} />} label="Cupons" active={activeTab === 'coupons'} onClick={() => setActiveTab('coupons')} />
          <SidebarItem icon={<CalendarCheck size={20} />} label="Agendamentos" active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} />
          <SidebarItem icon={<UserCircle size={20} />} label="Clientes" active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
          <SidebarItem icon={<Award size={20} />} label="Fidelidade" active={activeTab === 'loyalty'} onClick={() => setActiveTab('loyalty')} />
          <SidebarItem icon={<Sparkles size={20} />} label="Insights (IA)" active={activeTab === 'insight'} onClick={() => setActiveTab('insight')} />
          <SidebarItem icon={<DollarSign size={20} />} label="Financeiro" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
          <SidebarItem icon={<Settings size={20} />} label="Configurações" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          
          <div className="pt-4 mt-2">
              <div className="h-px bg-slate-800 mb-4 mx-2"></div>
              <button 
                  onClick={onViewClient}
                  className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition-colors group"
              >
                  <Smartphone size={20} className="group-hover:text-orange-500 transition-colors" />
                  <span className="flex-1 text-left">Agenda Digital</span>
                  <ExternalLink size={14} className="opacity-50" />
              </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut size={20} />
            <span>Sair / Home</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* --- 2. TRIAL BANNER --- */}
        {trialStatus === 'active' && (
            <div className={`w-full px-4 py-2 flex items-center justify-between shadow-md z-20 ${daysRemaining <= 3 ? 'bg-red-600 text-white' : 'bg-amber-500 text-slate-900'}`}>
                <div className="flex items-center gap-2 text-sm font-bold">
                    {daysRemaining <= 3 ? <AlertTriangle size={18} /> : <Lock size={18} />}
                    <span>
                        Você está no período de teste gratuito. {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}.
                    </span>
                </div>
                <button 
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="bg-white text-slate-900 px-4 py-1 rounded text-xs font-bold hover:bg-slate-100 transition-colors uppercase tracking-wide"
                >
                    Assinar Agora
                </button>
            </div>
        )}

        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 md:px-8 justify-between shrink-0">
             <h2 className="text-xl md:text-2xl font-bold">{getTabLabel(activeTab)}</h2>
             <div className="flex items-center gap-4">
                <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button 
                    onClick={onViewClient}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 text-sm font-medium transition-colors md:hidden"
                >
                    <ExternalLink size={16}/> Ver Agenda
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">A</div>
                    <span className="text-sm text-slate-300 hidden md:inline">Admin</span>
                </div>
             </div>
        </header>
        
        {/* Mobile Nav (Improved) */}
        <div className="md:hidden bg-slate-950 border-b border-slate-800 shrink-0 sticky top-0 z-30">
            <div className="relative">
                <div className="flex overflow-x-auto gap-1 p-2 scrollbar-hide no-scrollbar mask-fade-right">
                    <MobileNavItem icon={<Users size={16} />} label="Equipe" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
                    <MobileNavItem icon={<CalendarCheck size={16} />} label="Agenda" active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} />
                    <MobileNavItem icon={<UserCircle size={16} />} label="Clientes" active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
                    <MobileNavItem icon={<Award size={16} />} label="Fidelidade" active={activeTab === 'loyalty'} onClick={() => setActiveTab('loyalty')} />
                    <MobileNavItem icon={<DollarSign size={16} />} label="Financeiro" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
                    <MobileNavItem icon={<Scissors size={16} />} label="Serviços" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
                    <MobileNavItem icon={<Tag size={16} />} label="Cupons" active={activeTab === 'coupons'} onClick={() => setActiveTab('coupons')} />
                    <MobileNavItem icon={<Sparkles size={16} />} label="IA" active={activeTab === 'insight'} onClick={() => setActiveTab('insight')} />
                    <MobileNavItem icon={<Settings size={16} />} label="Config" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => {
    const { settings } = useShop();
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all duration-200 ${active ? 'bg-slate-800 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            style={active ? { borderLeft: `4px solid ${settings.primaryColor}` } : {}}
        >
            <span className={active ? `text-[${settings.primaryColor}]` : ''} style={{ color: active ? settings.primaryColor : 'inherit' }}>{icon}</span>
            <span>{label}</span>
        </button>
    );
}

const MobileNavItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => {
    const { settings } = useShop();
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[64px] ${active ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 active:bg-slate-900'}`}
            style={active ? { color: settings.primaryColor } : {}}
        >
            <span className={active ? 'scale-110 transition-transform' : 'opacity-70'}>{icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-tighter whitespace-nowrap">{label}</span>
        </button>
    );
}
