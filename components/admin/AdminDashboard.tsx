
import React, { useState, useEffect } from 'react';
import { useShop } from '../../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Scissors, Tag, Palette, CalendarCheck, LogOut, ExternalLink, Smartphone, DollarSign, AlertTriangle, Lock, Settings, UserCircle, Award, Sparkles, Moon, Sun, ChevronDown, ChevronUp, Store, Clock, MessageSquare, Bell, CreditCard, Shield, Globe, LayoutGrid, Info, ShieldCheck, Pin, BarChart3, User } from 'lucide-react';
import { DashboardPanel } from './panels/DashboardPanel';
import { TeamPanel } from './panels/TeamPanel';
import { ServicesPanel } from './panels/ServicesPanel';
import { CouponsPanel } from './panels/CouponsPanel';
import { AppointmentsPanel } from './panels/AppointmentsPanel';
import { FinancePanel } from './panels/FinancePanel';
import { ClientsPanel } from './panels/ClientsPanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { LoyaltyPanel } from './panels/LoyaltyPanel';
import { ReportsPanel } from './panels/ReportsPanel';
import { InsightPanel } from './panels/InsightPanel';
import { RemindersPanel } from './panels/RemindersPanel';
import { SubscriptionsPanel } from './panels/SubscriptionsPanel';
import { PaywallScreen } from '../billing/PaywallScreen';
import { PaymentModal } from '../billing/PaymentModal';

import { PlanPanel } from './panels/PlanPanel';
import { ProfilePanel } from './panels/ProfilePanel';

type AdminTab = 'dashboard' | 'team' | 'services' | 'coupons' | 'appointments' | 'finance' | 'clients' | 'settings' | 'loyalty' | 'insight' | 'reminders' | 'subscriptions' | 'plan' | 'reports' | 'profile';

type TeamSubTab = 'list' | 'schedules' | 'blocks';

export const AdminDashboard: React.FC<{ onLogout: () => void, onViewClient: () => void }> = ({ onLogout, onViewClient }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [teamSubTab, setTeamSubTab] = useState<TeamSubTab>('list');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Load preferences after hydration
  useEffect(() => {
    const savedTab = localStorage.getItem('adminActiveTab');
    if (savedTab) setActiveTab(savedTab as AdminTab);

    const savedTeamSub = localStorage.getItem('adminTeamSubTab');
    if (savedTeamSub) setTeamSubTab(savedTeamSub as TeamSubTab);

    const savedPinned = localStorage.getItem('adminSidebarPinned');
    if (savedPinned !== null) setIsSidebarPinned(savedPinned === 'true');
    
    if (savedTab === 'settings') setIsSettingsOpen(true);
  }, []);

  const { settings, trialStatus, daysRemaining, theme, toggleTheme } = useShop();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const isSidebarExpanded = isSidebarPinned || isSidebarHovered;

  useEffect(() => {
      localStorage.setItem('adminSidebarPinned', String(isSidebarPinned));
  }, [isSidebarPinned]);

  const handleTabChange = (tab: AdminTab, filter?: string) => {
      setActiveTab(tab);
      if (filter && tab === 'clients') {
          setClientFilter(filter);
      }
      if (tab !== 'settings') setIsSettingsOpen(false);
  };

  useEffect(() => {
      localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
      localStorage.setItem('adminTeamSubTab', teamSubTab);
  }, [teamSubTab]);

  // --- 1. PAYWALL CHECK ---
  if (trialStatus === 'expired') {
      return <PaywallScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPanel onNavigate={handleTabChange} />;
      case 'team': return <TeamPanel initialTab={teamSubTab} onTabChange={setTeamSubTab} />;
      case 'services': return <ServicesPanel />;
      case 'coupons': return <CouponsPanel />;
      case 'appointments': return <AppointmentsPanel />;
      case 'finance': return <FinancePanel />;
      case 'clients': return <ClientsPanel initialFilter={clientFilter as any} />;
      case 'loyalty': return <LoyaltyPanel />;
      case 'reports': return <ReportsPanel />;
      case 'settings': return <SettingsPanel />;
      case 'insight': return <InsightPanel />;
      case 'reminders': return <RemindersPanel />;
      case 'subscriptions': return <SubscriptionsPanel />;
      case 'plan': return <PlanPanel />;
      case 'profile': return <ProfilePanel />;
      default: return <DashboardPanel />;
    }
  };

  const getTabLabel = (tab: AdminTab) => {
      switch(tab) {
          case 'dashboard': return 'Dashboard';
          case 'team': return 'Gerenciar Equipe';
          case 'services': return 'Gerenciar Serviços';
          case 'coupons': return 'Gerenciar Cupons';
          case 'appointments': return 'Agenda';
          case 'finance': return 'Financeiro';
          case 'clients': return 'Gestão de Clientes';
          case 'loyalty': return 'Programa de Fidelidade';
          case 'reports': return 'Relatórios';
          case 'settings': return 'Configurações';
          case 'insight': return 'Insights com IA';
          case 'reminders': return 'Automação';
          case 'subscriptions': return 'Assinaturas';
          case 'plan': return 'Meu Plano';
          case 'profile': return 'Perfil';
      }
  }

  return (
    <div className="flex h-screen bg-[#0B0F19] text-slate-100 overflow-hidden flex-col md:flex-row w-full">
      
      <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} />

      {/* Sidebar */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`bg-slate-950 border-r border-slate-800 flex flex-col hidden md:flex transition-all duration-300 ease-in-out relative z-40 ${isSidebarExpanded ? 'w-64' : 'w-20'} admin-sidebar`}
      >
        <div className={`p-6 flex items-center border-b border-slate-800 transition-all duration-300 ${isSidebarExpanded ? 'gap-3' : 'justify-center p-4'}`}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
             <img src="https://iili.io/BRpSlzQ.md.png" alt="Insight Barber Logo" className="w-full h-full object-contain" />
          </div>
          
          {isSidebarExpanded && (
            <button 
              onClick={() => setIsSidebarPinned(!isSidebarPinned)}
              className={`ml-auto p-1.5 rounded-lg transition-colors ${isSidebarPinned ? 'text-orange-500 bg-orange-500/10' : 'text-slate-500 hover:bg-slate-800'}`}
              title={isSidebarPinned ? "Desafixar Menu" : "Fixar Menu"}
            >
              <Pin size={16} className={isSidebarPinned ? 'fill-current rotate-45' : ''} />
            </button>
          )}
        </div>
        
        <nav className="flex-1 px-2 py-2 space-y-0.5 no-scrollbar">
  <SidebarItem 
    icon={<LayoutGrid size={18} />} 
    label="Dashboard" 
    active={activeTab === 'dashboard'} 
    onClick={() => handleTabChange('dashboard')} 
    expanded={isSidebarExpanded}
  />
  
  <SidebarItem 
    icon={<Users size={18} />} 
    label="Equipe" 
    active={activeTab === 'team'} 
    onClick={() => handleTabChange('team')} 
    expanded={isSidebarExpanded}
  />

  <SidebarItem icon={<Scissors size={18} />} label="Serviços" active={activeTab === 'services'} onClick={() => handleTabChange('services')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<CalendarCheck size={18} />} label="Agenda" active={activeTab === 'appointments'} onClick={() => handleTabChange('appointments')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<UserCircle size={18} />} label="Clientes" active={activeTab === 'clients'} onClick={() => handleTabChange('clients')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<CreditCard size={18} />} label="Assinaturas" active={activeTab === 'subscriptions'} onClick={() => handleTabChange('subscriptions')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<Tag size={18} />} label="Cupons" active={activeTab === 'coupons'} onClick={() => handleTabChange('coupons')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<Award size={18} />} label="Fidelidade" active={activeTab === 'loyalty'} onClick={() => handleTabChange('loyalty')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<BarChart3 size={18} />} label="Relatórios" active={activeTab === 'reports'} onClick={() => handleTabChange('reports')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<MessageSquare size={18} />} label="Automação" active={activeTab === 'reminders'} onClick={() => handleTabChange('reminders')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<Sparkles size={18} />} label="Insights (IA)" active={activeTab === 'insight'} onClick={() => handleTabChange('insight')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<DollarSign size={18} />} label="Financeiro" active={activeTab === 'finance'} onClick={() => handleTabChange('finance')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<ShieldCheck size={18} />} label="Meu Plano" active={activeTab === 'plan'} onClick={() => handleTabChange('plan')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<User size={18} />} label="Perfil" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<Settings size={18} />} label="Configurações" active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} expanded={isSidebarExpanded} />
  
  <div className="pt-2 mt-1">
      <div className="h-px bg-slate-800 mb-2 mx-2"></div>
      <button 
          onClick={onViewClient}
          className={`flex items-center px-4 py-2 w-full rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition-colors group ${isSidebarExpanded ? 'gap-3' : 'justify-center'}`}
      >
          <Smartphone size={18} className="group-hover:text-orange-500 transition-colors shrink-0" />
          {isSidebarExpanded && (
            <>
              <span className="flex-1 text-left text-sm">Agenda Digital</span>
              <ExternalLink size={12} className="opacity-50" />
            </>
          )}
      </button>
  </div>
</nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className={`flex items-center px-4 py-3 w-full text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors ${isSidebarExpanded ? 'gap-3' : 'justify-center'}`}>
            <LogOut size={20} className="shrink-0" />
            {isSidebarExpanded && <span>Sair / Home</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* --- 2. TRIAL BANNER --- */}
        {trialStatus === 'active' && (
            <div className={`w-full px-4 py-2 flex items-center justify-between shadow-md z-20 ${daysRemaining <= 3 ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>
                <div className="flex items-center gap-2 text-sm font-bold">
                    {daysRemaining <= 3 ? <AlertTriangle size={18} /> : <Lock size={18} />}
                    <span>
                        Você está no período de teste gratuito. {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}.
                    </span>
                </div>
                <button 
                    onClick={() => setActiveTab('plan')}
                    className="bg-white text-slate-900 px-4 py-1 rounded-md text-[10px] font-black hover:bg-slate-100 transition-colors uppercase tracking-widest shadow-sm"
                >
                    Assinar Agora
                </button>
            </div>
        )}

        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 md:px-8 justify-between shrink-0">
             <h2 className="text-xl md:text-2xl font-bold text-white">{getTabLabel(activeTab)}</h2>
             <div className="flex items-center gap-4">
                <button 
                    onClick={onViewClient}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-sm font-medium transition-colors md:hidden"
                >
                    <ExternalLink size={16}/> Ver Agenda
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold uppercase shadow-lg shadow-orange-500/20">
                        {settings.name?.charAt(0) || 'A'}
                    </div>
                    <span className="text-sm text-slate-300 hidden md:inline font-bold">
                        {settings.name || 'Admin'}
                    </span>
                </div>
             </div>
        </header>
        
        {/* Mobile Nav (Improved) */}
        <div className="md:hidden bg-slate-900 border-b border-slate-800 shrink-0 sticky top-0 z-30">
            <div className="relative">
                <div className="flex overflow-x-auto gap-1 p-2 scrollbar-hide no-scrollbar mask-fade-right">
    <MobileNavItem icon={<LayoutGrid size={16} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
    <MobileNavItem icon={<Users size={16} />} label="Equipe" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
    <MobileNavItem icon={<Scissors size={16} />} label="Serviços" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
    <MobileNavItem icon={<CalendarCheck size={16} />} label="Agenda" active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} />
    <MobileNavItem icon={<UserCircle size={16} />} label="Clientes" active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
    <MobileNavItem icon={<CreditCard size={16} />} label="Assinaturas" active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')} />
    <MobileNavItem icon={<Tag size={16} />} label="Cupons" active={activeTab === 'coupons'} onClick={() => setActiveTab('coupons')} />
    <MobileNavItem icon={<Award size={16} />} label="Fidelidade" active={activeTab === 'loyalty'} onClick={() => setActiveTab('loyalty')} />
    <MobileNavItem icon={<BarChart3 size={16} />} label="Relatórios" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
    <MobileNavItem icon={<MessageSquare size={16} />} label="Automação" active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} />
    <MobileNavItem icon={<Sparkles size={16} />} label="IA" active={activeTab === 'insight'} onClick={() => setActiveTab('insight')} />
    <MobileNavItem icon={<DollarSign size={16} />} label="Financeiro" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
    <MobileNavItem icon={<ShieldCheck size={16} />} label="Plano" active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
    <MobileNavItem icon={<User size={16} />} label="Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
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

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, expanded?: boolean }> = ({ icon, label, active, onClick, expanded = true }) => {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center px-4 py-2.5 w-full rounded-r-lg transition-all duration-200 text-sm ${expanded ? 'gap-3' : 'justify-center'} ${active ? 'bg-orange-500/10 text-orange-400 font-bold border-l-4 border-orange-500 shadow-lg shadow-orange-500/5' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
        >
            <span className={`shrink-0 ${active ? 'text-orange-500' : 'text-slate-500'}`}>{icon}</span>
            {expanded && <span>{label}</span>}
        </button>
    );
}

const SubSidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm transition-all duration-200 ${active ? 'text-orange-600 font-bold bg-orange-50/50' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'}`}
        >
            <span className={active ? 'text-orange-500' : 'text-slate-700'}>{icon}</span>
            <span>{label}</span>
        </button>
    );
}

const MobileNavItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => {
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[64px] ${active ? 'bg-slate-800 text-orange-400 shadow-sm' : 'text-slate-500 active:bg-slate-800'}`}
        >
            <span className={active ? 'scale-110 transition-transform' : 'opacity-70'}>{icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-tighter whitespace-nowrap">{label}</span>
        </button>
    );
}
