import React, { useState, useEffect } from 'react';
import { useShop } from '../../store';
import { Link, useSearchParams } from 'react-router-dom';
import { Scissors, Store, User, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export const Signup: React.FC<{ onComplete: () => void, onBack: () => void }> = ({ onComplete, onBack }) => {
  const { signup } = useShop();
  const [searchParams] = useSearchParams();
  
  const [intent, setIntent] = useState<'create_shop' | 'join_team'>('create_shop');
  
  // Detecta se veio do link "?type=barber"
  useEffect(() => {
      const type = searchParams.get('type');
      if (type === 'barber') {
          setIntent('join_team');
      } else if (type === 'owner') {
          setIntent('create_shop');
      }
  }, [searchParams]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signup(email, password, shopName, slug, intent);
      
      if (result.error) {
        setError(result.error.message);
      } else {
        onComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
        <button onClick={onBack} className="absolute top-6 left-6 text-slate-500 hover:text-white flex items-center gap-2 text-sm transition-colors">
            <ArrowLeft size={16}/> Voltar
        </button>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white">
                <Scissors size={24} />
            </div>
        </div>
        <h2 className="text-3xl font-extrabold text-white">
            {intent === 'create_shop' ? 'Criar Barbearia' : 'Acesso da Equipe'}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
            {intent === 'create_shop' ? 'Comece a gerenciar seu negócio.' : 'Defina sua senha para acessar a agenda.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-700">
          
          {/* Seletor de Tipo de Conta */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-900 rounded-lg">
              <button
                  type="button"
                  onClick={() => { setIntent('create_shop'); setError(null); }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${intent === 'create_shop' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                  <Store size={16} /> Sou Dono
              </button>
              <button
                  type="button"
                  onClick={() => { setIntent('join_team'); setError(null); }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${intent === 'join_team' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                  <User size={16} /> Sou Barbeiro
              </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Aviso para Barbeiro */}
            {intent === 'join_team' && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg text-sm text-blue-300">
                    <p>Para confirmar seu acesso, use o <strong>mesmo email</strong> que o dono da barbearia cadastrou para você.</p>
                </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <div className="mt-1">
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="appearance-none block w-full px-3 py-3 border border-slate-600 rounded-lg bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" placeholder="seu@email.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                  {intent === 'join_team' ? 'Crie sua Senha' : 'Senha'}
              </label>
              <div className="mt-1">
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="appearance-none block w-full px-3 py-3 border border-slate-600 rounded-lg bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" placeholder="Mínimo 6 caracteres" />
              </div>
            </div>

            {/* Campos da Barbearia (Slug para todos, Nome para dono) */}
            <div className="space-y-6 animate-fade-in">
                {intent === 'create_shop' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Nome da Barbearia</label>
                        <div className="mt-1">
                            <input type="text" required value={shopName} onChange={e => setShopName(e.target.value)} className="appearance-none block w-full px-3 py-3 border border-slate-600 rounded-lg bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" placeholder="Ex: Barbearia do Zé" />
                        </div>
                    </div>
                )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300">
                            {intent === 'join_team' ? 'Link da barbearia que você trabalha (Slug)' : 'Link Personalizado (Slug)'}
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-600 bg-slate-800 text-slate-400 sm:text-sm">
                            insightbarber.com.br/
                            </span>
                            <input type="text" required value={slug} onChange={e => setSlug(e.target.value.toLowerCase())} className="flex-1 min-w-0 block w-full px-3 py-3 rounded-none rounded-r-md border border-slate-600 bg-slate-900 text-white focus:ring-orange-500 focus:border-orange-500 sm:text-sm" placeholder="barbearia-do-ze" />
                        </div>
                    </div>
                </div>
            )}

            {error && (
              <div className="rounded-md bg-red-500/10 p-4 border border-red-500/20 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <h3 className="text-sm font-medium text-red-400">{error}</h3>
              </div>
            )}

            <div>
              <button disabled={loading} type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors">
                {loading ? <Loader2 className="animate-spin" /> : (intent === 'create_shop' ? 'Criar Conta' : 'Definir Senha e Entrar')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800 text-slate-400">
                  Já tem conta e senha?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link to="/login" className="font-medium text-orange-500 hover:text-orange-400">
                Fazer login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
