import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate, useSearchParams } from 'react-router-dom';
import { ShopProvider, useShop, InventoryProvider, FinancialProvider, AutomationProvider, CatalogProvider, ClientProvider } from './store';
import { useShop as useShopBase } from './store/ShopContext'; // Import direto para evitar erro de contexto no wrapper
import { ToastProvider } from './components/ui/ToastContext';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { BarberDashboard } from './components/admin/BarberDashboard';
import { BookingFlow } from './components/client/BookingFlow';
import { LandingPage } from './components/landing/LandingPage';
import { Signup } from './components/auth/Signup';
import { Login } from './components/auth/Login';
import { UpdatePassword } from './components/auth/UpdatePassword';
import { ClientTokenValidation } from './components/client/ClientTokenValidation';
import { Loader2, ShieldCheck, Eye, EyeOff, Lock } from 'lucide-react';
import { AdminOwnerDashboard } from './components/admin/AdminOwnerDashboard';

// ============================================================
// GUARD DE ROTA: /saas-admin — Autenticação por JWT Admin
// ============================================================
const SaasAdminGuard: React.FC = () => {
    const { session } = useShop();
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const verifyAdmin = async () => {
            if (!session?.access_token) {
                setError('Você precisa estar logado para acessar esta área.');
                setLoading(false);
                return;
            }
            try {
                const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'http://localhost:3000'
                    : `https://${window.location.hostname}`;
                
                const res = await fetch(`${serverUrl}/api/saas/auth`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
                
                if (res.ok) {
                    setAuthenticated(true);
                } else {
                    const data = await res.json();
                    setError(data.error || 'Acesso negado. Apenas o administrador pode acessar este painel.');
                }
            } catch (err: any) {
                setError('Erro ao validar credenciais.');
            } finally {
                setLoading(false);
            }
        };
        verifyAdmin();
    }, [session]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="flex flex-col items-center animate-pulse">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                    <span className="text-slate-400">Verificando credenciais de administrador...</span>
                </div>
            </div>
        );
    }

    if (authenticated) return <AdminOwnerDashboard />;

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-sm text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 mx-auto">
                    <ShieldCheck className="text-red-500" size={32} />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight mb-2">Acesso Negado</h1>
                <p className="text-slate-400 text-sm mb-6">{error}</p>
                <button 
                    onClick={() => window.location.href = '/login'}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
                >
                    Voltar para Login
                </button>
            </div>
        </div>
    );
};

// Wrapper para carregar dados da barbearia baseado na URL (Visão do Cliente)
const BookingRoute = () => {
    const { slug } = useParams();
    const { loadShopBySlug, shop, loading } = useShop();

    useEffect(() => {
        if (slug) {
            loadShopBySlug(slug);
        }
    }, [slug]);

    if (loading && !shop) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-orange-500">
                <Loader2 className="animate-spin" size={40} />
            </div>
        );
    }

    if (!shop && !loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">
                <p>Barbearia não encontrada.</p>
            </div>
        );
    }

    return <BookingFlow onAdminClick={() => window.location.href = '/login'} />;
};

// Wrapper Inteligente para o Dashboard (Redireciona Dono vs Barbeiro)
const DashboardRouter = () => {
  const { session, userRole, shop, logout, loading } = useShop();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  // Se não estiver logado, manda para o Login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Se for Dono -> Painel Admin Completo
  if (userRole === 'owner') {
    return (
        <AdminDashboard 
            onLogout={logout} 
            onViewClient={() => window.open(`/agendar/${shop?.slug}`, '_blank')} 
        />
    );
  }

  // Se for Barbeiro -> Painel Simplificado
  if (userRole === 'barber') {
    return <BarberDashboard onLogout={logout} />;
  }

  // Caso de segurança: Logado mas sem papel definido (Ex: Login Google sem barbearia)
  const [setupShopName, setSetupShopName] = useState('');
  const [setupSlug, setSetupSlug] = useState('');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  const handleSetupShop = async (e: React.FormEvent) => {
      e.preventDefault();
      setSetupLoading(true);
      setSetupError('');

      try {
          const { supabase } = await import('./supabaseClient');
          const cleanShopName = setupShopName.trim();
          const cleanSlug = setupSlug.trim().toLowerCase().replace(/[^\w-]/g, '');

          const { data: shopData, error: shopError } = await supabase.from('shops').insert({
              owner_id: session.user.id,
              name: cleanShopName,
              slug: cleanSlug,
              plan: 'trial',
              trial_started_at: new Date().toISOString(),
              trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          }).select().single();

          if (shopError) throw shopError;

          await supabase.from('settings').insert({
              shop_id: shopData.id,
              name: cleanShopName,
              phone: setupPhone,
              primary_color: '#f97316',
              secondary_color: '#1e293b'
          });

          // Gatilhos e templates padrão
          const { data: insertedTriggers } = await supabase.from('automation_triggers').insert([
              { shop_id: shopData.id, name: 'Confirmação Imediata', value: 0, unit: 'minutes', period: 'immediate', active: true },
              { shop_id: shopData.id, name: 'Lembrete de Agendamento', value: 1, unit: 'hours', period: 'before', active: true },
              { shop_id: shopData.id, name: 'Pós-Venda e Avaliação', value: 2, unit: 'hours', period: 'after', active: true },
              { shop_id: shopData.id, name: 'Reagendamento', value: 1, unit: 'hours', period: 'after', active: true }
          ]).select();

          await supabase.from('message_templates').insert([
            { shop_id: shopData.id, title: 'Confirmação', trigger_id: insertedTriggers?.find((t:any) => t.name === 'Confirmação Imediata')?.id, content: 'Sua reserva está confirmada na [BARBEARIA].', active: true },
            { shop_id: shopData.id, title: 'Lembrete', trigger_id: insertedTriggers?.find((t:any) => t.name === 'Lembrete de Agendamento')?.id, content: 'Lembrete de horário na [BARBEARIA].', active: true }
          ]);

          window.location.reload(); // Recarrega para aplicar a role
      } catch (err: any) {
          setSetupError(err.message || 'Erro ao criar barbearia');
          setSetupLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
      <div className="w-full max-w-md bg-slate-800 p-8 rounded-xl shadow-xl border border-slate-700">
          <h2 className="text-2xl font-bold mb-2">Quase lá!</h2>
          <p className="text-slate-400 mb-6">Sua conta foi criada. Agora, configure sua barbearia para acessarmos o painel.</p>
          
          <form onSubmit={handleSetupShop} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium mb-1">Nome da Barbearia</label>
                  <input type="text" required value={setupShopName} onChange={e => setSetupShopName(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white" />
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1">Link Personalizado (Slug)</label>
                  <div className="flex">
                      <span className="px-3 py-2 bg-slate-700 border border-r-0 border-slate-600 rounded-l-lg text-slate-300 text-sm flex items-center">insightbarber.com.br/</span>
                      <input type="text" required value={setupSlug} onChange={e => setSetupSlug(e.target.value)} className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-r-lg text-white font-mono" />
                  </div>
              </div>
              <div>
                  <label className="block text-sm font-medium mb-1">Celular (WhatsApp)</label>
                  <input type="tel" required value={setupPhone} onChange={e => setSetupPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white" />
              </div>
              
              {setupError && <p className="text-red-400 text-sm mt-2">{setupError}</p>}
              
              <button disabled={setupLoading} type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-bold transition-colors mt-6">
                  {setupLoading ? 'Criando...' : 'Criar Barbearia'}
              </button>
          </form>

          <button onClick={logout} className="mt-6 text-sm text-slate-500 hover:text-white transition-colors w-full text-center">
            Sair e usar outra conta
          </button>
      </div>
    </div>
  );
};

const AppRoutes = () => {
    const navigate = useNavigate();
    
    return (
        <Routes>
            {/* Landing Page (Home) */}
            <Route path="/" element={<LandingPage onStart={() => navigate('/signup')} onLogin={() => navigate('/login')} />} />
            
            {/* Autenticação */}
            <Route path="/signup" element={<Signup onComplete={() => navigate('/dashboard')} onBack={() => navigate('/')} />} />
            <Route path="/login" element={<Login onComplete={() => navigate('/dashboard')} onBack={() => navigate('/')} />} />
            
            {/* [NOVO] Rota de Redefinição de Senha */}
            <Route path="/update-password" element={<UpdatePassword />} />
            
            {/* Área Logada (Dashboard Unificado) */}
            <Route path="/dashboard" element={<DashboardRouter />} />
            
            {/* Redirecionamento de compatibilidade para links antigos */}
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
            
            {/* Visão do Cliente (Agendamento) */}
            <Route path="/agendar/:slug" element={<BookingRoute />} />
            
            {/* [NOVO] Validação de Token de Acesso do Cliente */}
            <Route path="/acesso/:token" element={<ClientTokenValidation />} />
            
            {/* Catch all (404) -> Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
            
            {/* [SEGURO] Painel do Administrador do SaaS — guard de senha */}
            <Route path="/saas-admin" element={<SaasAdminGuard />} />
        </Routes>
    );
}

const CombinedProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { shop } = useShopBase();
  const shopId = React.useMemo(() => shop?.id || '', [shop?.id]);
  
  return (
    <InventoryProvider shopId={shopId}>
      <FinancialProvider shopId={shopId}>
        <AutomationProvider shopId={shopId}>
          <CatalogProvider shopId={shopId}>
            <ClientProvider shopId={shopId}>
              {children}
            </ClientProvider>
          </CatalogProvider>
        </AutomationProvider>
      </FinancialProvider>
    </InventoryProvider>
  );
};

function App() {
  // Forçar HTTPS em produção
  useEffect(() => {
    if (
        window.location.protocol !== 'https:' && 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1'
    ) {
        window.location.href = 'https://' + window.location.hostname + window.location.pathname + window.location.search;
    }
  }, []);

  return (
    <ToastProvider>
        <ShopProvider>
            <CombinedProviders>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </CombinedProviders>
        </ShopProvider>
    </ToastProvider>
  );
}

export default App;
