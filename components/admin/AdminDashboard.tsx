import React, { useState, useEffect } from 'react';
import { useShop } from '../../store';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Scissors, Tag, Palette, CalendarCheck, LogOut, ExternalLink, Smartphone, DollarSign, AlertTriangle, Lock, Settings, UserCircle, Award, Sparkles, Moon, Sun, ChevronDown, ChevronUp, Store, Clock, MessageSquare, Bell, CreditCard, Shield, Globe, LayoutGrid, Info, ShieldCheck, Pin, BarChart3, User, Package, Target, Plus } from 'lucide-react';
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
import { InventoryPanel } from './panels/InventoryPanel';
import { GoalsPanel } from './panels/GoalsPanel';
import { PaywallScreen } from '../billing/PaywallScreen';
import { PaymentModal } from '../billing/PaymentModal';

import { PlanPanel } from './panels/PlanPanel';
import { ProfilePanel } from './panels/ProfilePanel';

type AdminTab = 'dashboard' | 'team' | 'services' | 'coupons' | 'appointments' | 'clients' | 'settings' | 'loyalty' | 'insight' | 'reminders' | 'subscriptions' | 'plan' | 'reports' | 'profile' | 'inventory' | 'goals';

type TeamSubTab = 'list' | 'schedules' | 'blocks';

export const AdminDashboard: React.FC<{ onLogout: () => void, onViewClient: () => void }> = ({ onLogout, onViewClient }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [remindersSubTab, setRemindersSubTab] = useState<string>('clients');
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

  const { settings, trialStatus, daysRemaining, theme, toggleTheme, shop, myShops, switchShop, addAdditionalUnit, userRole, clients, reloadClients, botPausedCount } = useShop();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);

  const isSidebarExpanded = isSidebarPinned || isSidebarHovered;

  useEffect(() => {
      localStorage.setItem('adminSidebarPinned', String(isSidebarPinned));
  }, [isSidebarPinned]);

  // Lazy load de clientes: só carrega quando o usuário abre a aba pela 1ª vez
  useEffect(() => {
      if (activeTab === 'clients' && shop?.id && clients.length === 0) {
          reloadClients(shop.id);
      }
  }, [activeTab, shop?.id]);

  const handleTabChange = (tab: AdminTab, filter?: string) => {
      setActiveTab(tab);
      if (filter && tab === 'clients') {
          setClientFilter(filter);
      }
      if (filter && tab === 'reminders') {
          setRemindersSubTab(filter);
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
      case 'clients': return <ClientsPanel initialFilter={clientFilter as any} />;
      case 'loyalty': return <LoyaltyPanel />;
      case 'reports': return <ReportsPanel />;
      case 'settings': return <SettingsPanel />;
      case 'insight': return <InsightPanel />;
      case 'reminders': return <RemindersPanel initialTab={remindersSubTab} />;
      case 'subscriptions': return <SubscriptionsPanel />;
      case 'plan': return <PlanPanel onUpgrade={() => setIsPaymentModalOpen(true)} />;
      case 'profile': return <ProfilePanel />;
      case 'inventory': return <InventoryPanel />;
      case 'goals': return <GoalsPanel />;
      default: return <DashboardPanel onNavigate={handleTabChange} />;
    }
  };

  const getTabLabel = (tab: AdminTab) => {
      switch(tab) {
          case 'dashboard': return 'Dashboard';
          case 'team': return 'Gerenciar Equipe';
          case 'services': return 'Gerenciar Serviços';
          case 'coupons': return 'Gerenciar Cupons';
          case 'appointments': return 'Agenda';
          case 'clients': return 'Gestão de Clientes';
          case 'loyalty': return 'Programa de Fidelidade';
          case 'reports': return 'Relatórios';
          case 'settings': return 'Configurações';
          case 'insight': return 'Insights com IA';
          case 'reminders': return 'Automação';
          case 'subscriptions': return 'Assinaturas';
          case 'plan': return 'Meu Plano';
          case 'profile': return 'Perfil';
          case 'inventory': return 'Gestão de Estoque';
          case 'goals': return 'Gestão de Metas';
      }
  }

  return (
    <div className="flex h-screen bg-white text-slate-900 overflow-hidden flex-col md:flex-row w-full">
      
      <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} />
      <AddUnitModal isOpen={isAddUnitOpen} onClose={() => setIsAddUnitOpen(false)} />

      {/* Sidebar */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`bg-white border-r border-slate-200 flex flex-col hidden md:flex transition-all duration-300 ease-in-out relative z-40 ${isSidebarExpanded ? 'w-64' : 'w-20'} admin-sidebar`}
      >
        <div className={`p-6 flex items-center border-b border-slate-200 transition-all duration-300 ${isSidebarExpanded ? 'gap-3' : 'justify-center p-4'}`}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
             <img src="https://iili.io/BRpSlzQ.md.png" alt="Insight Barber Logo" className="w-full h-full object-contain" />
          </div>
          
          {isSidebarExpanded && (
            <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Unidade Ativa</p>
                <div className="flex items-center gap-1">
                    <select 
                        value={shop?.id}
                        onChange={(e) => switchShop(e.target.value)}
                        className="flex-1 bg-transparent text-slate-900 text-sm font-bold focus:outline-none cursor-pointer truncate appearance-none"
                    >
                        {myShops.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    {userRole === 'owner' && (
                        <button 
                            onClick={() => setIsAddUnitOpen(true)}
                            className="p-1 text-slate-400 hover:text-orange-600 transition-colors"
                            title="Nova unidade"
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>
            </div>
          )}

          {isSidebarExpanded && (
            <button 
              onClick={() => setIsSidebarPinned(!isSidebarPinned)}
              className={`ml-auto p-1.5 rounded-lg transition-colors ${isSidebarPinned ? 'text-orange-50' : 'text-slate-400 hover:bg-slate-50'}`}
              title={isSidebarPinned ? "Desafixar Menu" : "Fixar Menu"}
            >
              <Pin size={16} className={isSidebarPinned ? 'fill-current rotate-45 text-orange-500' : ''} />
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

  <SidebarItem icon={<UserCircle size={18} />} label="Clientes" active={activeTab === 'clients'} onClick={() => handleTabChange('clients')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<CreditCard size={18} />} label="Assinaturas" active={activeTab === 'subscriptions'} onClick={() => handleTabChange('subscriptions')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<Tag size={18} />} label="Cupons" active={activeTab === 'coupons'} onClick={() => handleTabChange('coupons')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<Award size={18} />} label="Fidelidade" active={activeTab === 'loyalty'} onClick={() => handleTabChange('loyalty')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<BarChart3 size={18} />} label="Relatórios" active={activeTab === 'reports'} onClick={() => handleTabChange('reports')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<Package size={18} />} label="Estoque" active={activeTab === 'inventory'} onClick={() => handleTabChange('inventory')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<Target size={18} />} label="Metas" active={activeTab === 'goals'} onClick={() => handleTabChange('goals')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<MessageSquare size={18} />} label="Automação" active={activeTab === 'reminders'} onClick={() => handleTabChange('reminders')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<Sparkles size={18} />} label="Insights (IA)" active={activeTab === 'insight'} onClick={() => handleTabChange('insight')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<ShieldCheck size={18} />} label="Meu Plano" active={activeTab === 'plan'} onClick={() => handleTabChange('plan')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<User size={18} />} label="Perfil" active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} expanded={isSidebarExpanded} />
  
  <SidebarItem icon={<Settings size={18} />} label="Configurações" active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} expanded={isSidebarExpanded} />

  <SidebarItem icon={<Scissors size={18} />} label="Serviços" active={activeTab === 'services'} onClick={() => handleTabChange('services')} expanded={isSidebarExpanded} />
  
  <div className="pt-2 mt-1">
      <div className="h-px bg-slate-100 mb-2 mx-2"></div>
      <button 
          onClick={onViewClient}
          className={`flex items-center px-4 py-2 w-full rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors group ${isSidebarExpanded ? 'gap-3' : 'justify-center'}`}
      >
          <Smartphone size={18} className="group-hover:text-orange-500 transition-colors shrink-0" />
          {isSidebarExpanded && (
            <>
              <span className="flex-1 text-left text-xs">Agenda Digital</span>
              <ExternalLink size={12} className="opacity-50" />
            </>
          )}
      </button>
  </div>
</nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={onLogout} className={`flex items-center px-4 py-3 w-full text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors ${isSidebarExpanded ? 'gap-3' : 'justify-center'}`}>
            <LogOut size={20} className="shrink-0" />
            {isSidebarExpanded && <span>Sair / Home</span>}
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
                    className="bg-white text-slate-900 px-4 py-1 rounded-md text-xs font-bold hover:bg-slate-100 transition-colors uppercase tracking-wide"
                >
                    Assinar Agora
                </button>
            </div>
        )}

        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-8 justify-between shrink-0">
             <h2 className="text-xl md:text-2xl font-bold text-slate-900">{getTabLabel(activeTab)}</h2>
             <div className="flex items-center gap-2 md:gap-4">
                {/* Desktop Buttons */}
                <div className="hidden md:flex items-center gap-3 mr-2">
                    <button 
                        onClick={onViewClient}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
                        title="Abrir Agenda do Cliente"
                    >
                        <Smartphone size={16}/> Agenda Digital
                    </button>
                    
                    {userRole === 'owner' && (
                        <button 
                            onClick={() => setIsAddUnitOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 text-xs font-bold transition-all border border-orange-100"
                        >
                            <Plus size={16}/> Unidade
                        </button>
                    )}
                </div>

                <button 
                    onClick={onViewClient}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 text-sm font-medium transition-colors md:hidden"
                >
                    <ExternalLink size={16}/> Ver Agenda
                </button>
                
                <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold uppercase shadow-sm">
                        {settings.name?.charAt(0) || 'A'}
                    </div>
                    <span className="text-sm text-slate-800 hidden md:inline font-bold">
                        {settings.name || 'Admin'}
                    </span>
                </div>
             </div>
        </header>
        
        {/* Mobile Nav (Improved) */}
        <div className="md:hidden bg-white border-b border-slate-200 shrink-0 sticky top-0 z-30">
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
    <MobileNavItem icon={<Package size={16} />} label="Estoque" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
    <MobileNavItem icon={<Target size={16} />} label="Metas" active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} />
    <MobileNavItem icon={<MessageSquare size={16} />} label="Automação" active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} />
    <MobileNavItem icon={<Sparkles size={16} />} label="IA" active={activeTab === 'insight'} onClick={() => setActiveTab('insight')} />
    <MobileNavItem icon={<ShieldCheck size={16} />} label="Plano" active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
    <MobileNavItem icon={<User size={16} />} label="Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
    <MobileNavItem icon={<Settings size={16} />} label="Config" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
</div>
            </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {renderContent()}
        </div>

        {/* Modal de Pagamento */}
        <PaymentModal 
            isOpen={isPaymentModalOpen} 
            onClose={() => setIsPaymentModalOpen(false)} 
        />
      </main>
    </div>
  );
};

const AddUnitModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addAdditionalUnit, settings } = useShop();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await addAdditionalUnit(name, slug, phone);
        setLoading(false);
        if (res.success) {
            onClose();
            setName('');
            setSlug('');
            setPhone('');
        } else {
            alert(res.error || "Erro ao adicionar unidade.");
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl"
            >
                <h3 className="text-xl font-bold text-slate-900 mb-6 font-display">Adicionar Nova Unidade</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nome da Barbearia</label>
                        <input required value={name} onChange={e => { setName(e.target.value); if(!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')) }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500 font-bold" placeholder="Ex: Barber Shop Filial 2" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">URL (Slug)</label>
                        <input required value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''))} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500 font-bold" placeholder="ex: barber-filial-2" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Telefone/WhatsApp</label>
                        <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500 font-bold" placeholder="(00) 00000-0000" />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:text-slate-900 transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg hover:bg-orange-700 transition-all">
                            {loading ? "Criando..." : "Criar Unidade"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, expanded?: boolean, badge?: number }> = ({ icon, label, active, onClick, expanded = true, badge }) => {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center px-4 py-2.5 w-full rounded-r-lg transition-all duration-200 text-xs relative ${expanded ? 'gap-3' : 'justify-center'} ${active ? 'bg-orange-50/80 text-orange-600 font-semibold border-l-4 border-orange-500 shadow-sm' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}
        >
            <span className={`shrink-0 ${active ? 'text-orange-500' : 'text-slate-700'}`}>{icon}</span>
            {expanded && <span>{label}</span>}
            {badge && badge > 0 && (
                <span className={`flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-[16px] px-1 shadow-sm ${expanded ? 'ml-auto' : 'absolute top-1 right-2 animate-pulse'}`}>
                    {badge}
                </span>
            )}
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
    const { settings } = useShop();
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[64px] ${active ? 'bg-slate-100 text-orange-600 shadow-sm' : 'text-slate-500 active:bg-slate-50'}`}
            style={active ? { color: settings.primaryColor } : {}}
        >
            <span className={active ? 'scale-110 transition-transform' : 'opacity-70'}>{icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-tighter whitespace-nowrap">{label}</span>
        </button>
    );
}
