import React from 'react';
import { ArrowRight } from 'lucide-react';

interface StickyFooterProps {
    total: number;
    onContinue: () => void;
    disabled: boolean;
    settings: any;
    loading?: boolean;
}

export const StickyFooter: React.FC<StickyFooterProps> = ({ total, onContinue, disabled, settings, loading }) => (
    <div className="fixed bottom-0 left-0 w-full border-t p-4 shadow-2xl z-50" style={{ backgroundColor: settings.cardBackgroundColor || '#0f172a', borderColor: settings.borderColor || '#334155' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
                <p className="text-sm" style={{ color: settings.textColor || '#94a3b8' }}>Total Estimado</p>
                <p className="text-2xl font-bold" style={{ color: settings.titleColor || '#ffffff' }}>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <button
                disabled={disabled || loading}
                onClick={onContinue}
                className={`flex items-center gap-2 px-6 py-3 md:px-8 rounded-full font-bold transition-all ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`}
                style={{ 
                    backgroundColor: disabled || loading ? (settings.borderColor || '#334155') : (settings.accentColor || settings.primaryColor),
                    color: settings.buttonTextColor || '#ffffff'
                }}
            >
                {loading ? 'Processando...' : <>Continuar <ArrowRight size={20} /></>}
            </button>
        </div>
    </div>
);
