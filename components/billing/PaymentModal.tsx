
import React from 'react';
import { X, Check, QrCode, CreditCard, MessageCircle } from 'lucide-react';
import { useShop } from '../../store';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PLAN_PRICE = "R$ 59,90";
const PIX_KEY = "00.000.000/0001-00"; // Chave Pix Placeholder
const SUPPORT_WHATSAPP = "5511999999999"; // Número Placeholder
// URL direta da imagem solicitada
const DEFAULT_LOGO = "https://iili.io/q2ivL1j.png";

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
    const { settings } = useShop();
    
    if (!isOpen) return null;

    const benefits = [
        "Agendamentos ilimitados",
        "Gestão de equipe e comissões",
        "Cupons de desconto ilimitados",
        "Link personalizado (sua-marca)",
        "Suporte prioritário via WhatsApp"
    ];

    const openWhatsApp = () => {
        const text = encodeURIComponent(`Olá, gostaria de confirmar o pagamento da assinatura da barbearia ${settings.name}.`);
        window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`, '_blank');
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-slate-800 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl relative animate-scale-up overflow-hidden">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Header */}
                <div className="p-8 text-center border-b border-slate-700 bg-slate-900/50">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20 overflow-hidden">
                        {/* Sempre usar o logo padrão solicitado na tela de pagamento, ou o logo da barbearia se preferir. 
                            O usuário pediu especificamente o logo do link abaixo nesta tela. */}
                         <img src={DEFAULT_LOGO} className="w-full h-full object-contain p-1" alt="Logo CutFlow" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Assine o CutFlow Barber</h2>
                    <p className="text-slate-400 mt-1">Gerencie seu negócio como um profissional</p>
                </div>

                <div className="p-8">
                    {/* Plan Details */}
                    <div className="bg-slate-900 border border-orange-500/30 rounded-xl p-6 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                            RECOMENDADO
                        </div>
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">Plano Profissional</h3>
                                <p className="text-slate-400 text-sm">Tudo o que você precisa</p>
                            </div>
                            <div className="text-right">
                                <span className="text-3xl font-bold text-white">{PLAN_PRICE}</span>
                                <span className="text-slate-500 text-sm">/mês</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {benefits.map((benefit, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shrink-0">
                                        <Check size={12} strokeWidth={3} />
                                    </div>
                                    {benefit}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="space-y-3 mb-6">
                        <button className="w-full py-4 bg-slate-700 hover:bg-slate-600 rounded-xl border border-slate-600 flex items-center justify-center gap-3 text-white font-medium transition-all group">
                            <QrCode size={20} className="text-orange-500" />
                            <span>Pagar com PIX</span>
                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded ml-auto">Instântaneo</span>
                        </button>
                        <button disabled className="w-full py-4 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center gap-3 text-slate-500 font-medium cursor-not-allowed">
                            <CreditCard size={20} />
                            <span>Cartão de Crédito</span>
                            <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded ml-auto">Em breve</span>
                        </button>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-300 flex gap-3">
                         <MessageCircle className="shrink-0" size={20} />
                         <div>
                             <p className="font-bold mb-1">Pagamento via PIX</p>
                             <p className="mb-2">Use a chave: <span className="font-mono bg-blue-500/20 px-1 rounded select-all">{PIX_KEY}</span></p>
                             <button onClick={openWhatsApp} className="underline hover:text-white">
                                 Enviar comprovante no WhatsApp
                             </button> para liberação em até 2h.
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};