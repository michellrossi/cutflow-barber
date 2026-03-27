
import React, { useState, useEffect } from 'react';
import { useShop } from '../../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Scissors, Tag, Palette, CalendarCheck, LogOut, ExternalLink, Smartphone, DollarSign, AlertTriangle, Lock, Settings, UserCircle, Award, Sparkles, Moon, Sun, ChevronDown, ChevronUp, Store, Clock, MessageSquare, Bell, CreditCard, Shield, Globe, LayoutGrid, Info } from 'lucide-react';
import { DashboardPanel } from './panels/DashboardPanel';
import { TeamPanel } from './panels/TeamPanel';
import { ServicesPanel } from './panels/ServicesPanel';
import { CouponsPanel } from './panels/CouponsPanel';
import { AppointmentsPanel } from './panels/AppointmentsPanel';
import { FinancePanel } from './panels/FinancePanel';
import { ClientsPanel } from './panels/ClientsPanel';
import { SettingsPanel, SettingsTab } from './panels/SettingsPanel';
import { LoyaltyPanel } from './panels/LoyaltyPanel';
import { InsightPanel } from './panels/InsightPanel';
import { PaywallScreen } from '../billing/PaywallScreen';
import { PaymentModal } from '../billing/PaymentModal';

type AdminTab = 'dashboard' | 'team' | 'services' | 'coupons' | 'appointments' | 'finance' | 'clients' | 'settings' | 'loyalty' | 'insight';

type TeamSubTab = 'list' | 'schedules' | 'blocks';

export const AdminDashboard: React.FC<{ onLogout: () => void, onViewClient: () => void }> = ({ onLogout, onViewClient }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
      const saved = localStorage.getItem('adminActiveTab');
      return (saved as AdminTab) || 'dashboard';
  });
  
  const [teamSubTab, setTeamSubTab] = useState<TeamSubTab>(() => {
      const saved = localStorage.getItem('adminTeamSubTab');
      return (saved as TeamSubTab) || 'list';
  });

  const [settingsSubTab, setSettingsSubTab] = useState<SettingsTab>(() => {
      const saved = localStorage.getItem('adminSettingsSubTab');
      return (saved as SettingsTab) || 'profile';
  });

  const [isTeamOpen, setIsTeamOpen] = useState(() => {
      return activeTab === 'team';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(() => {
      return activeTab === 'settings';
  });
  
  const { settings, trialStatus, daysRemaining, theme, toggleTheme } = useShop();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
      localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
      localStorage.setItem('adminTeamSubTab', teamSubTab);
  }, [teamSubTab]);

  useEffect(() => {
      localStorage.setItem('adminSettingsSubTab', settingsSubTab);
  }, [settingsSubTab]);

  // --- 1. PAYWALL CHECK ---
  if (trialStatus === 'expired') {
      return <PaywallScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPanel />;
      case 'team': return <TeamPanel initialTab={teamSubTab} onTabChange={setTeamSubTab} />;
      case 'services': return <ServicesPanel />;
      case 'coupons': return <CouponsPanel />;
      case 'appointments': return <AppointmentsPanel />;
      case 'finance': return <FinancePanel />;
      case 'clients': return <ClientsPanel />;
      case 'loyalty': return <LoyaltyPanel />;
      case 'settings': return <SettingsPanel initialTab={settingsSubTab} onTabChange={setSettingsSubTab} />;
      case 'insight': return <InsightPanel />;
      default: return <DashboardPanel />;
    }
  };

  const getTabLabel = (tab: AdminTab) => {
      switch(tab) {
          case 'dashboard': return 'Dashboard';
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
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col hidden md:flex admin-sidebar">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center text-white font-bold overflow-hidden">
             <img src="https://i.freeimage.host/qD9Rddv.png" alt="Insight Barber Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-lg tracking-tight truncate">INSIGHT BARBER</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem icon={<LayoutGrid size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          
          <div className="space-y-1">
              <button 
                  onClick={() => {
                      setIsTeamOpen(!isTeamOpen);
                      if (!isTeamOpen) setActiveTab('team');
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 w-full rounded-lg transition-all duration-200 text-sm ${activeTab === 'team' ? 'bg-slate-800 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
                  style={activeTab === 'team' ? { borderLeft: `4px solid ${settings.primaryColor}` } : {}}
              >
                  <Users size={20} style={{ color: activeTab === 'team' ? settings.primaryColor : 'inherit' }} />
                  <span className="flex-1 text-left">Equipe</span>
                  <motion.div
                      animate={{ rotate: isTeamOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                  >
                      <ChevronDown size={16} />
                  </motion.div>
              </button>

              <AnimatePresence>
                  {isTeamOpen && (
                      <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pl-4 space-y-1 overflow-hidden"
                      >
                          <SubSidebarItem 
                              icon={<Users size={16} />} 
                              label="Profissionais" 
                              active={activeTab === 'team' && teamSubTab === 'list'} 
                              onClick={() => { setActiveTab('team'); setTeamSubTab('list'); }} 
                          />
                          <SubSidebarItem 
                              icon={<Clock size={16} />} 
                              label="Horários" 
                              active={activeTab === 'team' && teamSubTab === 'schedules'} 
                              onClick={() => { setActiveTab('team'); setTeamSubTab('schedules'); }} 
                          />
                          <SubSidebarItem 
                              icon={<Lock size={16} />} 
                              label="Bloqueios" 
                              active={activeTab === 'team' && teamSubTab === 'blocks'} 
                              onClick={() => { setActiveTab('team'); setTeamSubTab('blocks'); }} 
                          />
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>

          <SidebarItem icon={<Scissors size={20} />} label="Serviços" active={activeTab === 'services'} onClick={() => setActiveTab('services')} />
          <SidebarItem icon={<Tag size={20} />} label="Cupons" active={activeTab === 'coupons'} onClick={() => setActiveTab('coupons')} />
          <SidebarItem icon={<CalendarCheck size={20} />} label="Agendamentos" active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')} />
          <SidebarItem icon={<UserCircle size={20} />} label="Clientes" active={activeTab === 'clients'} onClick={() => setActiveTab('clients')} />
          <SidebarItem icon={<Award size={20} />} label="Fidelidade" active={activeTab === 'loyalty'} onClick={() => setActiveTab('loyalty')} />
          <SidebarItem icon={<Sparkles size={20} />} label="Insights (IA)" active={activeTab === 'insight'} onClick={() => setActiveTab('insight')} />
          <SidebarItem icon={<DollarSign size={20} />} label="Financeiro" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
          
          <div className="space-y-1">
              <button 
                  onClick={() => {
                      setIsSettingsOpen(!isSettingsOpen);
                      if (!isSettingsOpen) setActiveTab('settings');
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 w-full rounded-lg transition-all duration-200 text-sm ${activeTab === 'settings' ? 'bg-slate-800 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
                  style={activeTab === 'settings' ? { borderLeft: `4px solid ${settings.primaryColor}` } : {}}
              >
                  <Settings size={20} style={{ color: activeTab === 'settings' ? settings.primaryColor : 'inherit' }} />
                  <span className="flex-1 text-left">Configurações</span>
                  <motion.div
                      animate={{ rotate: isSettingsOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                  >
                      <ChevronDown size={16} />
                  </motion.div>
              </button>

              <AnimatePresence>
                  {isSettingsOpen && (
                      <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="pl-4 space-y-4 overflow-hidden"
                      >
                          {/* Group: Loja */}
                          <div className="space-y-1 pt-2">
                              <div className="px-5 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Loja</div>
                              <SubSidebarItem 
                                  icon={<Store size={16} />} 
                                  label="Perfil" 
                                  active={activeTab === 'settings' && settingsSubTab === 'profile'} 
                                  onClick={() => { setActiveTab('settings'); setSettingsSubTab('profile'); }} 
                              />
                              <SubSidebarItem 
                                  icon={<Clock size={16} />} 
                                  label="Horários" 
                                  active={activeTab === 'settings' && settingsSubTab === 'hours'} 
                                  onClick={() => { setActiveTab('settings'); setSettingsSubTab('hours'); }} 
                              />
                              <SubSidebarItem 
                                  icon={<Globe size={16} />} 
                                  label="Página Pública" 
                                  active={activeTab === 'settings' && settingsSubTab === 'booking_page'} 
                                  onClick={() => { setActiveTab('settings'); setSettingsSubTab('booking_page'); }} 
                              />
                          </div>

                          {/* Group: Conta */}
                          <div className="space-y-1">
                              <div className="px-5 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Conta</div>
                              <SubSidebarItem 
                                  icon={<UserCircle size={16} />} 
                                  label="Minha Conta" 
                                  active={activeTab === 'settings' && settingsSubTab === 'account'} 
                                  onClick={() => { setActiveTab('settings'); setSettingsSubTab('account'); }} 
                              />
                              <SubSidebarItem 
                                  icon={<CreditCard size={16} />} 
                                  label="Assinatura" 
                                  active={activeTab === 'settings' && settingsSubTab === 'billing'} 
                                  onClick={() => { setActiveTab('settings'); setSettingsSubTab('billing'); }} 
                              />
                              <SubSidebarItem 
                                  icon={<Shield size={16} />} 
                                  label="Segurança" 
                                  active={activeTab === 'settings' && settingsSubTab === 'security'} 
                                  onClick={() => { setActiveTab('settings'); setSettingsSubTab('security'); }} 
                              />
                          </div>

                          {/* Group: Comunicação */}
                          <div className="space-y-1 pb-2">
                              <div className="px-5 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Comunicação</div>
                              <SubSidebarItem 
                                  icon={<MessageSquare size={16} />} 
                                  label="Automação" 
                                  active={activeTab === 'settings' && settingsSubTab === 'automation'} 
                                  onClick={() => { setActiveTab('settings'); setSettingsSubTab('automation'); }} 
                              />
                              <SubSidebarItem 
                                  icon={<Bell size={16} />} 
                                  label="Notificações" 
                                  active={activeTab === 'settings' && settingsSubTab === 'notifications'} 
                                  onClick={() => { setActiveTab('settings'); setSettingsSubTab('notifications'); }} 
                              />
                              <SubSidebarItem 
                                  icon={<Smartphone size={16} />} 
                                  label="Integrações" 
                                  active={activeTab === 'settings' && settingsSubTab === 'integrations'} 
                                  onClick={() => { setActiveTab('settings'); setSettingsSubTab('integrations'); }} 
                              />
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
          
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
                    <MobileNavItem icon={<LayoutGrid size={16} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
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
            className={`flex items-center gap-3 px-4 py-2.5 w-full rounded-lg transition-all duration-200 text-sm ${active ? 'bg-slate-800 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            style={active ? { borderLeft: `4px solid ${settings.primaryColor}` } : {}}
        >
            <span className={active ? `text-[${settings.primaryColor}]` : ''} style={{ color: active ? settings.primaryColor : 'inherit' }}>{icon}</span>
            <span>{label}</span>
        </button>
    );
}

const SubSidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => {
    const { settings } = useShop();
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm transition-all duration-200 ${active ? 'text-white font-bold bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}`}
        >
            <span style={{ color: active ? settings.primaryColor : 'inherit' }}>{icon}</span>
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
