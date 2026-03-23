
import React, { useState } from 'react';
import { useShop } from '../../store';
import { Smartphone, ArrowRight, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';

export const ClientLogin: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { requestClientLogin, settings } = useShop();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [loginUrl, setLoginUrl] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length < 10) {
            setError('Por favor, insira um número de telefone válido.');
            return;
        }

        setLoading(true);
        setError('');
        const result = await requestClientLogin(phone);
        setLoading(false);

        if (result.success && result.url) {
            setSent(true);
            setLoginUrl(result.url);
        } else {
            setError(result.error || 'Ocorreu um erro ao solicitar o acesso.');
        }
    };

    const handleWhatsAppRedirect = () => {
        const message = encodeURIComponent(`Olá! Aqui está o seu link de acesso único para a ${settings.name}: ${loginUrl}`);
        const cleanPhone = phone.replace(/\D/g, '');
        // In a real scenario, this would be sent via an automated backend.
        // For this demo, we'll open WhatsApp with the message ready.
        window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
    };

    if (sent) {
        return (
            <div className="max-w-md mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Link Enviado!</h2>
                    <p className="text-slate-400">
                        Um link de acesso único foi gerado para você. 
                        {/* Em produção, isso seria automático via API */}
                        Como estamos em modo de demonstração, clique no botão abaixo para simular o envio via WhatsApp.
                    </p>
                </div>

                <button
                    onClick={handleWhatsAppRedirect}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/20"
                >
                    <MessageSquare size={20} />
                    Enviar via WhatsApp
                </button>

                <div className="p-4 bg-slate-800 rounded-lg text-left">
                    <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">Link de Acesso (Demo):</p>
                    <code className="text-[10px] text-orange-400 break-all bg-black/30 p-2 rounded block">
                        {loginUrl}
                    </code>
                </div>

                <button onClick={onBack} className="text-slate-500 hover:text-white text-sm transition-colors">
                    Voltar
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-8 shadow-2xl">
            <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone size={24} />
                </div>
                <h2 className="text-2xl font-bold text-white">Acesse seu Perfil</h2>
                <p className="text-slate-400">Entre apenas com seu número de telefone para ver seu histórico e pontos.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Seu WhatsApp</label>
                    <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-orange-500 transition-all"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 group"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>
                            Receber Link de Acesso
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="pt-4 border-t border-slate-800 text-center">
                <button onClick={onBack} className="text-slate-500 hover:text-white text-sm transition-colors">
                    Voltar para o agendamento
                </button>
            </div>
        </div>
    );
};
