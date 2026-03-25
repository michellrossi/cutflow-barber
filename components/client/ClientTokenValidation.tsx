
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useShop } from '../../store';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ClientTokenValidation: React.FC = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { validateClientToken, shop } = useShop();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [error, setError] = useState('');
    const validationStarted = useRef(false);

    useEffect(() => {
        const validate = async () => {
            if (!token || validationStarted.current) return;
            
            validationStarted.current = true;
            const result = await (validateClientToken(token) as any);
            
            if (result.success) {
                setStatus('success');
                const slug = result.slug || shop?.slug;
                setTimeout(() => {
                    if (slug) {
                        navigate(`/agendar/${slug}`);
                    } else {
                        // Fallback se não tiver slug
                        navigate('/');
                    }
                }, 1500);
            } else {
                setStatus('error');
                setError(result.error || 'Token inválido ou expirado.');
            }
        };

        validate();
    }, [token, shop?.slug, navigate, validateClientToken]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <Loader2 className="animate-spin text-orange-500 mx-auto" size={48} />
                        <h2 className="text-xl font-bold text-white">Validando seu acesso...</h2>
                        <p className="text-slate-400">Só um momento, estamos preparando seu perfil.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Acesso Concedido!</h2>
                        <p className="text-slate-400">Bem-vindo de volta! Redirecionando...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Erro no Acesso</h2>
                        <p className="text-red-400">{error}</p>
                        <button
                            onClick={() => navigate(`/agendar/${shop?.slug}`)}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-all"
                        >
                            Voltar para a Agenda
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
