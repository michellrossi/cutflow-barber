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
    <div className="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-700 p-4 shadow-2xl z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
                <p className="text-slate-400 text-sm">Total Estimado</p>
                <p className="text-2xl font-bold text-white">R$ {total.toFixed(2)}</p>
            </div>
            <button
                disabled={disabled || loading}
                onClick={onContinue}
                className={`flex items-center gap-2 px-6 py-3 md:px-8 rounded-full text-white font-bold transition-all ${disabled || loading ? 'bg-slate-700 cursor-not-allowed opacity-50' : 'hover:brightness-110'}`}
                style={!disabled && !loading ? { backgroundColor: settings.primaryColor } : {}}
            >
                {loading ? 'Processando...' : <>Continuar <ArrowRight size={20} /></>}
            </button>
        </div>
    </div>
);