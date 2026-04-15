
import React, { useState } from 'react';
import { Lock, LogOut, CheckCircle } from 'lucide-react';
import { useShop } from '../../store';
import { PaymentModal } from './PaymentModal';

export const PaywallScreen: React.FC = () => {
    const { logout, settings } = useShop();
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <PaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            
            {/* Background Texture */}
            <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>
            
            <div className="relative z-10 max-w-2xl w-full text-center">
                <div className="w-24 h-24 bg-[#1e293b] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl border-4 border-[#334155] relative">
                    <Lock size={40} className="text-red-500" />
                    <div className="absolute -bottom-2 -right-2 bg-red-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full border-4 border-[#0B0F19]">
                        EXPIRADO
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Seu período de teste encerrou</h1>
                <p className="text-slate-600 text-lg mb-10 max-w-lg mx-auto">
                    Não perca o acesso à gestão da sua barbearia. Assine agora para continuar agendando e faturando.
                </p>

                <div className="bg-[#1e293b]/50 backdrop-blur-sm border border-[#334155] rounded-2xl p-8 mb-10 text-left">
                    <h3 className="text-slate-900 font-bold mb-4">Escolha um plano com recursos como:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 text-slate-700">
                            <CheckCircle size={18} className="text-green-500" /> Agendamentos Ilimitados
                        </div>
                        <div className="flex items-center gap-3 text-slate-700">
                            <CheckCircle size={18} className="text-green-500" /> Gestão de Equipe Completa
                        </div>
                        <div className="flex items-center gap-3 text-slate-700">
                            <CheckCircle size={18} className="text-green-500" /> Relatórios Financeiros
                        </div>
                        <div className="flex items-center gap-3 text-slate-700">
                            <CheckCircle size={18} className="text-green-500" /> Link Personalizado
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-slate-900 font-bold rounded-xl text-lg shadow-lg shadow-orange-500/20 transition-all hover:scale-105 w-full md:w-auto"
                    >
                        Quero assinar o InsightBarber
                    </button>
                    <button 
                        onClick={() => window.open('https://wa.me/5513988091839', '_blank')}
                        className="px-8 py-4 bg-[#1e293b] hover:bg-[#334155] text-[#cbd5e1] font-medium rounded-xl transition-all w-full md:w-auto"
                    >
                        Falar com Suporte
                    </button>
                </div>

                <button 
                    onClick={logout}
                    className="mt-12 text-slate-500 hover:text-slate-900 flex items-center justify-center gap-2 text-sm mx-auto transition-colors"
                >
                    <LogOut size={16} /> Sair da conta
                </button>
            </div>
        </div>
    );
};
