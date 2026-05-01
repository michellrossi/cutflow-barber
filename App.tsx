import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Navigate, useSearchParams } from 'react-router-dom';
import { ShopProvider, useShop } from './store';
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
// GUARD DE ROTA: /saas-admin — Autenticação por senha secreta
// ============================================================
const SAAS_SESSION_KEY = 'saas_admin_auth';
const SAAS_SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

const SaasAdminGuard: React.FC = () => {
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [authenticated, setAuthenticated] = useState(false);

    // Verifica sessão existente ao montar
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(SAAS_SESSION_KEY);
            if (raw) {
                const { expiresAt } = JSON.parse(raw);
                if (Date.now() < expiresAt) {
                    setAuthenticated(true);
                }
            }
        } catch { /* sessão inválida, ignora */ }
    }, []);

    const handleLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const serverUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:3000'
                : `https://${window.location.hostname}`;

            // Valida a senha via API (o segredo nunca fica exposto no bundle)
            const res = await fetch(`${serverUrl}/api/saas/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Senha incorreta');
            }

            // Grava sessão com TTL de 2h
            sessionStorage.setItem(SAAS_SESSION_KEY, JSON.stringify({
                expiresAt: Date.now() + SAAS_SESSION_TTL_MS
            }));
            // Guarda a senha para autorizar chamadas subsequentes à API (ex: fetchGlobalShops)
            sessionStorage.setItem('saas_admin_pw', password);
            setAuthenticated(true);
        } catch (err: any) {
            setError(err.message || 'Falha na autenticação');
        } finally {
            setLoading(false);
        }
    }, [password]);

    if (authenticated) return <AdminOwnerDashboard />;

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-4">
                        <ShieldCheck className="text-orange-500" size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Área Restrita</h1>
                    <p className="text-slate-400 text-sm mt-1">Painel Master Admin — InsightBarber</p>
                </div>

                <form onSubmit={handleLogin} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                            Senha de Administrador
                        </label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                id="saas-admin-password"
                                type={showPw ? 'text' : 'password'}
                                required
                                autoFocus
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Digite a senha secreta"
                                className="w-full pl-9 pr-10 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                            >
                                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                            ⚠️ {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                        {loading ? 'Verificando...' : 'Acessar Painel'}
                    </button>
                </form>
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
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </ShopProvider>
    </ToastProvider>
  );
}

export default App;
