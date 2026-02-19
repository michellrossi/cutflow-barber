import React from 'react';
import { Scissors, User, Calendar } from 'lucide-react';

interface HomeStepProps {
    settings: any;
    setStep: (s: any) => void;
    onAdminClick: () => void;
}

export const HomeStep: React.FC<HomeStepProps> = ({ settings, setStep, onAdminClick }) => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20 bg-slate-800 overflow-hidden">
            {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
                <Scissors size={40} className="text-white" />
            )}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{settings.name}</h1>
        <p className="text-slate-400 text-lg mb-12 max-w-lg">Sistema profissional de agendamento. Escolha seus serviços e profissionais favoritos em poucos cliques.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-12">
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
                <Scissors className="mx-auto mb-4" style={{ color: settings.primaryColor }} size={32} />
                <h3 className="font-bold mb-2">Serviços Variados</h3>
                <p className="text-sm text-slate-400">Escolha entre diversos serviços profissionais</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
                <User className="mx-auto mb-4" style={{ color: settings.primaryColor }} size={32} />
                <h3 className="font-bold mb-2">Profissionais Qualificados</h3>
                <p className="text-sm text-slate-400">Equipe experiente e especializada</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl">
                <Calendar className="mx-auto mb-4" style={{ color: settings.primaryColor }} size={32} />
                <h3 className="font-bold mb-2">Agendamento Fácil</h3>
                <p className="text-sm text-slate-400">Reserve seu horário em poucos cliques</p>
                </div>
        </div>

        <button onClick={() => setStep('services')} className="px-8 py-4 rounded-full text-white font-bold text-lg shadow-lg hover:brightness-110 transition-all transform hover:-translate-y-1" style={{ backgroundColor: settings.primaryColor }}>
            Agendar Horário
        </button>
        <button onClick={onAdminClick} className="mt-6 text-sm text-slate-500 underline hover:text-slate-300">
            acessar painel administrativo
        </button>
    </div>
);