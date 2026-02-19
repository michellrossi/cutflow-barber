import React, { useEffect, useState } from 'react';
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
import { Loader2 } from 'lucide-react';

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

  // Caso de segurança: Logado mas sem papel definido
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
      <h2 className="text-xl font-bold mb-2">Acesso não configurado</h2>
      <p className="text-slate-400 mb-6">Sua conta não está vinculada a nenhuma barbearia como dono ou funcionário.</p>
      <button onClick={logout} className="px-6 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
        Sair da conta
      </button>
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
            
            {/* Catch all (404) -> Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
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