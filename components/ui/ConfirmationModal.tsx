import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", isDestructive = false 
}) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl relative animate-scale-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                    <X size={20} />
                </button>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-slate-700 text-slate-300'}`}>
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                        <p className="text-slate-400 mb-6 leading-relaxed">{message}</p>
                    </div>
                </div>
                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className={`px-4 py-2 rounded-lg text-white font-bold transition-transform active:scale-95 ${isDestructive ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:brightness-110'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};