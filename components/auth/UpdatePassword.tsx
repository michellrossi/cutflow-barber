import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Scissors, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export const UpdatePassword = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Verifica se o usuário chegou aqui autenticado (via link mágico)
    useEffect(() => {
    // Escuta mudanças na autenticação (o link do email dispara isso)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
            // Usuário clicou no link e o Supabase reconheceu o evento
            console.log("Evento de recuperação detectado");
        } else if (!session && event !== 'INITIAL_SESSION') {
            // Se após o processamento inicial não houver sessão, manda para login
            navigate('/login');
        }
    });

    return () => subscription.unsubscribe();
}, [navigate]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
            
            // Redireciona após 2 segundos
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Erro ao atualizar senha.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex relative overflow-hidden items-center justify-center">
             <div className="absolute inset-0 bg-grid-pattern pointer-events-none z-0"></div>
             
             <div className="w-full max-w-md p-8 relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded bg-orange-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-orange-500/20">
                        <Scissors size={32} />
                    </div>
                    <h2 className="text-3xl font-bold">Nova Senha</h2>
                    <p className="text-slate-400">Digite sua nova senha abaixo.</p>
                </div>

                <form onSubmit={handleUpdate} className="space-y-5 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
                    {message && (
                        <div className={`p-3 rounded border text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            {message.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
                            {message.text}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-300">Nova Senha</label>
                        <input 
                            required 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-[#0B0F19] border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                        />
                    </div>

                    <button 
                        type="submit" disabled={loading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Nova Senha'}
                    </button>
                </form>
             </div>
        </div>
    );
};