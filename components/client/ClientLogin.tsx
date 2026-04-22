
import React, { useState } from 'react';
import { useShop } from '../../store';
import { Smartphone, ArrowRight, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';

export const ClientLogin: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { requestClientLogin, settings } = useShop();
    const [loginStep, setLoginStep] = useState<'phone' | 'register'>('phone');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmitPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length < 10) {
            setError('Por favor, insira um número de telefone válido.');
            return;
        }

        setLoading(true);
        setError('');
        const result = await requestClientLogin(phone, undefined, undefined, true); // true = just check or initial
        setLoading(false);

        if (result.needsRegistration) {
            setLoginStep('register');
        } else if (result.success && result.url) {
            setSent(true);
        } else {
            setError(result.error || 'Ocorreu um erro ao solicitar o acesso.');
        }
    };

    const handleSubmitRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !birthDate) {
            setError('Preencha os dados do cadastro.');
            return;
        }

        setLoading(true);
        setError('');
        const result = await requestClientLogin(phone, name, birthDate, false);
        setLoading(false);

        if (result.success && result.url) {
            setSent(true);
        } else {
            setError(result.error || 'Ocorreu um erro ao concluir o cadastro.');
        }
    };

        if (result.success && result.url) {
            setSent(true);
        } else {
            setError(result.error || 'Ocorreu um erro ao solicitar o acesso.');
        }
    };

    if (sent) {
        return (
            <div className="max-w-md mx-auto p-6 border rounded-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300" style={{ backgroundColor: settings.cardBackgroundColor || '#0f172a', borderColor: settings.borderColor || '#1e293b' }}>
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold" style={{ color: settings.titleColor || '#ffffff' }}>Link Enviado!</h2>
                    <p style={{ color: settings.textColor || '#94a3b8' }}>
                        Um link de acesso único foi enviado para o seu WhatsApp. 
                        Por favor, verifique suas mensagens e clique no link para acessar seu perfil.
                    </p>
                </div>

                <div className="p-4 rounded-xl border" style={{ backgroundColor: settings.inputBackgroundColor || 'rgba(30, 41, 59, 0.5)', borderColor: settings.borderColor || '#334155' }}>
                    <p className="text-sm" style={{ color: settings.textColor || '#cbd5e1' }}>
                        O link expira em 15 minutos por motivos de segurança.
                    </p>
                </div>

                <button onClick={onBack} className="w-full py-4 rounded-xl font-bold transition-all hover:brightness-110" style={{ backgroundColor: settings.cardBackgroundColor || '#1e293b', color: settings.buttonTextColor || '#ffffff', borderColor: settings.borderColor || '#334155' }}>
                    Voltar para o agendamento
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-6 border rounded-2xl space-y-8 shadow-2xl" style={{ backgroundColor: settings.cardBackgroundColor || '#0f172a', borderColor: settings.borderColor || '#1e293b' }}>
            <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${settings.accentColor || settings.primaryColor}33`, color: settings.accentColor || settings.primaryColor }}>
                    <Smartphone size={24} />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: settings.titleColor || '#ffffff' }}>Acesse seu Perfil</h2>
                <p style={{ color: settings.textColor || '#94a3b8' }}>
                    {loginStep === 'phone' ? 'Insira seu número de celular para acessar o sistema.' : 'Para o seu primeiro acesso, precisamos de alguns dados.'}
                </p>
            </div>

            {loginStep === 'phone' ? (
                <form onSubmit={handleSubmitPhone} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium" style={{ color: settings.textColor || '#cbd5e1' }}>Celular (com DDD)</label>
                        <div className="relative">
                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: settings.textColor || '#64748b' }} size={20} />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="(00) 00000-0000"
                                className="w-full border rounded-xl py-4 pl-12 pr-4 focus:outline-none transition-all"
                                style={{ 
                                    backgroundColor: settings.inputBackgroundColor || '#020617', 
                                    borderColor: settings.borderColor || '#1e293b', 
                                    color: settings.inputTextColor || '#ffffff' 
                                }}
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full disabled:opacity-50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg group"
                        style={{ 
                            backgroundColor: settings.accentColor || settings.primaryColor, 
                            color: settings.buttonTextColor || '#ffffff',
                            boxShadow: `0 10px 15px -3px ${settings.accentColor || settings.primaryColor}33`
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                Avançar
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleSubmitRegistration} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium" style={{ color: settings.textColor || '#cbd5e1' }}>Nome Completo</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Seu nome"
                            className="w-full border rounded-xl py-3 px-4 focus:outline-none transition-all"
                            style={{ backgroundColor: settings.inputBackgroundColor || '#020617', borderColor: settings.borderColor || '#1e293b', color: settings.inputTextColor || '#ffffff' }}
                            required
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-medium" style={{ color: settings.textColor || '#cbd5e1' }}>Data de Nascimento</label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full border rounded-xl py-3 px-4 focus:outline-none transition-all"
                            style={{ backgroundColor: settings.inputBackgroundColor || '#020617', borderColor: settings.borderColor || '#1e293b', color: settings.inputTextColor || '#ffffff' }}
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full disabled:opacity-50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg group"
                        style={{ 
                            backgroundColor: settings.accentColor || settings.primaryColor, 
                            color: settings.buttonTextColor || '#ffffff',
                            boxShadow: `0 10px 15px -3px ${settings.accentColor || settings.primaryColor}33`
                        }}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                Receber Link de Acesso
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                    <button type="button" onClick={() => setLoginStep('phone')} className="w-full mt-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
                        Voltar
                    </button>
                </form>
            )}

            <div className="pt-4 border-t text-center" style={{ borderColor: settings.borderColor || '#1e293b' }}>
                <button onClick={onBack} className="text-sm transition-colors hover:brightness-110" style={{ color: settings.textColor || '#64748b' }}>
                    Voltar para o agendamento
                </button>
            </div>
        </div>
    );
};
