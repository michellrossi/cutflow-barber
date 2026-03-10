import React from 'react';
import { Professional } from '../../../types';
import { Check, Calendar, User } from 'lucide-react';

interface SuccessStepProps {
    customerInfo: { name: string, phone: string };
    selectedDate: string;
    selectedTime: string;
    selectedProId: string | null;
    professionals: Professional[];
    onReset: () => void;
    settings: any;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({ customerInfo, selectedDate, selectedTime, selectedProId, professionals, onReset, settings }) => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-fade-in-down">
        <div className="w-24 h-24 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-6">
            <Check size={48} strokeWidth={3} />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: settings.titleColor || '#ffffff' }}>Agendamento Confirmado!</h2>
        <p className="max-w-md mb-8" style={{ color: settings.textColor || '#94a3b8' }}>Obrigado, {customerInfo.name}. Seu horário foi reservado com sucesso. Te esperamos lá!</p>
        
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md mb-8 text-left">
            <div className="flex items-center gap-3 mb-4">
                <Calendar style={{ color: settings.textColor || '#94a3b8' }} size={20}/>
                <span style={{ color: settings.titleColor || '#ffffff' }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {selectedTime}</span>
            </div>
            <div className="flex items-center gap-3">
                    <User style={{ color: settings.textColor || '#94a3b8' }} size={20}/>
                    <span style={{ color: settings.titleColor || '#ffffff' }}>{selectedProId ? professionals.find(p => p.id === selectedProId)?.name : 'Profissional disponível'}</span>
            </div>
        </div>

        <button 
            onClick={onReset}
            className="px-8 py-3 rounded-full border border-slate-600 hover:bg-slate-800 transition-all"
            style={{ color: settings.titleColor || '#ffffff' }}
        >
            Voltar ao início
        </button>
    </div>
);
