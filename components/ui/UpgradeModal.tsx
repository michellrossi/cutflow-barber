import React from 'react';
import { X, CreditCard } from 'lucide-react';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white p-8 rounded-xl border border-slate-200 w-full max-w-md shadow-2xl relative animate-scale-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">
                    <X size={20} />
                </button>
                <div className="flex flex-col items-center text-center">
                    <div className="p-4 bg-orange-100 text-orange-600 rounded-full mb-6">
                        <CreditCard size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Upgrade de Plano</h3>
                    <p className="text-slate-500 mb-8">Escolha o plano ideal para o seu negócio e tenha acesso a recursos exclusivos.</p>
                    <button 
                        onClick={() => {
                            // Placeholder for payment gateway integration
                            window.open('https://checkout.stripe.com/pay/...', '_blank');
                            onClose();
                        }}
                        className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-all"
                    >
                        Ir para Pagamento
                    </button>
                </div>
            </div>
        </div>
    );
};
