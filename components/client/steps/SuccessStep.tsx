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
}

export const SuccessStep: React.FC<SuccessStepProps> = ({ customerInfo, selectedDate, selectedTime, selectedProId, professionals, onReset }) => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-fade-in-down">
        <div className="w-24 h-24 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-6">
            <Check size={48} strokeWidth={3} />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Agendamento Confirmado!</h2>
        <p className="text-slate-400 max-w-md mb-8">Obrigado, {customerInfo.name}. Seu horário foi reservado com sucesso. Te esperamos lá!</p>
        
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md mb-8 text-left">
            <div className="flex items-center gap-3 mb-4">
                <Calendar className="text-slate-400" size={20}/>
                <span>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {selectedTime}</span>
            </div>
            <div className="flex items-center gap-3">
                    <User className="text-slate-400" size={20}/>
                    <span>{selectedProId ? professionals.find(p => p.id === selectedProId)?.name : 'Profissional disponível'}</span>
            </div>
        </div>

        <button 
            onClick={onReset}
            className="px-8 py-3 rounded-full border border-slate-600 hover:bg-slate-800 text-white transition-all"
        >
            Voltar ao início
        </button>
    </div>
);