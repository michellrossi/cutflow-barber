import React, { useState } from 'react';
import { useShop } from '../../store';
import { useNavigate, Link } from 'react-router-dom';
import { Scissors, ArrowRight, ArrowLeft, Loader2, AlertCircle, Check, Users } from 'lucide-react';

export const Login: React.FC<{ onComplete: () => void, onBack: () => void }> = ({ onComplete, onBack }) => {
    const { login, resetPassword } = useShop(); 
    
    // UI State
    const [isResetting, setIsResetting] = useState(false);
    
    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Feedback States
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            if (isResetting) {
                // FLUXO DE RECUPERAÇÃO
                const { success, error } = await resetPassword(email);
                if (success) {
                    setSuccessMsg('Email de recuperação enviado! Verifique sua caixa de entrada.');
                } else {
                    setErrorMsg(error || 'Erro ao enviar email.');
                }
            } else {
                // FLUXO DE LOGIN NORMAL
                const { error } = await login(email, password);
                if (error) {
                    setErrorMsg('Credenciais inválidas.');
                } else {
                    onComplete();
                }
            }
        } catch (err) {
            setErrorMsg('Erro de conexão. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setIsLoading(true);
            const { supabase } = await import('../../supabaseClient');
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/dashboard'
                }
            });
        } catch (err: any) {
            setErrorMsg(err.message || 'Erro no login com Google');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex relative overflow-hidden items-center justify-center">
             <div className="absolute inset-0 bg-grid-pattern pointer-events-none z-0"></div>
             
             <div className="w-full max-w-md p-8 relative z-10">
                <button onClick={onBack} className="absolute top-0 left-8 text-slate-500 hover:text-white flex items-center gap-2 text-sm transition-colors">
                    <ArrowLeft size={16}/> Voltar
                </button>

                <div className="text-center mb-8 mt-6">
                    <div className="w-16 h-16 rounded bg-orange-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-orange-500/20">
                        <Scissors size={32} />
                    </div>
                    <h2 className="text-3xl font-bold">{isResetting ? 'Recuperar Senha' : 'Painel Admin'}</h2>
                    <p className="text-slate-400">
                        {isResetting ? 'Digite seu email para receber o link.' : 'Entre para gerenciar sua barbearia'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
                    {/* Mensagens de Erro/Sucesso */}
                    {errorMsg && (
                        <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
                            <AlertCircle size={16}/> {errorMsg}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 rounded bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
                            <Check size={16}/> {successMsg}
                        </div>
                    )}

                    {/* Input de Email (Comum a ambos) */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-300">Email</label>
                        <input 
                            required type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="appearance-none block w-full px-3 py-3 border border-slate-600 rounded-lg bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        />
                    </div>

                    {/* Input de Senha (Apenas Login) */}
                    {!isResetting && (
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-slate-300">Senha</label>
                                <button 
                                    type="button" 
                                    onClick={() => { setIsResetting(true); setErrorMsg(''); setSuccessMsg(''); }}
                                    className="text-xs text-orange-500 hover:underline"
                                >
                                    Esqueci minha senha
                                </button>
                            </div>
                            <input 
                                required type="password" value={password} onChange={e => setPassword(e.target.value)}
                                className="appearance-none block w-full px-3 py-3 border border-slate-600 rounded-lg bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                            />
                        </div>
                    )}

                    <button 
                        type="submit" disabled={isLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                            isResetting ? <>Enviar Email <ArrowRight size={20}/></> : <>Entrar <ArrowRight size={20}/></>
                        )}
                    </button>

                    {!isResetting && (
                         <button 
                             type="button" 
                             onClick={handleGoogleLogin}
                             disabled={isLoading}
                             className="w-full mt-3 flex justify-center items-center gap-2 py-3 px-4 border border-slate-600 rounded-lg shadow-sm text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none transition-colors"
                         >
                             <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                             Entrar com Google
                         </button>
                    )}

                    {/* Botão para voltar ao login se estiver no modo Reset */}
                    {isResetting ? (
                        <button 
                            type="button" 
                            onClick={() => { setIsResetting(false); setErrorMsg(''); setSuccessMsg(''); }}
                            className="w-full text-sm text-slate-400 hover:text-white mt-2"
                        >
                            Voltar para o Login
                        </button>
                    ) : (
                        <div className="pt-2">
                             <div className="relative mb-4">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-700" />
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-2 bg-slate-900 text-slate-500 uppercase">Ou</span>
                                </div>
                            </div>
                            <Link to="/signup?type=barber" className="w-full py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm flex items-center justify-center gap-2 transition-colors">
                                <Users size={16} /> Primeiro acesso da equipe?
                            </Link>
                        </div>
                    )}
                </form>
             </div>
        </div>
    );
};
