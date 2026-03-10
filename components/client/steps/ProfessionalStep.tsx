import React from 'react';
import { Professional } from '../../../types';
import { ArrowLeft, User } from 'lucide-react';
import { StickyFooter } from '../StickyFooter';

interface ProfessionalStepProps {
    professionals: Professional[];
    selectedProId: string | null;
    setSelectedProId: (id: string | null) => void;
    setStep: (s: any) => void;
    settings: any;
    subtotal: number;
}

export const ProfessionalStep: React.FC<ProfessionalStepProps> = ({ professionals, selectedProId, setSelectedProId, setStep, settings, subtotal }) => (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-32">
        <button onClick={() => setStep('services')} className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity" style={{ color: settings.textColor || '#94a3b8' }}><ArrowLeft size={16}/> Voltar</button>
        <h2 className="text-3xl font-bold mb-2" style={{ color: settings.titleColor || '#ffffff' }}>Escolha o profissional</h2>
        <p className="mb-8" style={{ color: settings.textColor || '#94a3b8' }}>Selecione seu barbeiro ou deixe sem preferência</p>

        <div className="space-y-4">
            <div 
                onClick={() => setSelectedProId(null)}
                className={`p-5 rounded-xl border cursor-pointer transition-all flex items-center gap-4 ${selectedProId === null ? 'bg-slate-800 border-orange-500 ring-1 ring-orange-500' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
                style={selectedProId === null ? { borderColor: settings.primaryColor, '--tw-ring-color': settings.primaryColor } as any : {}}
            >
                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                    <User size={24}/>
                </div>
                <div>
                    <h3 className="font-bold text-lg" style={{ color: settings.titleColor || '#ffffff' }}>Sem preferência</h3>
                    <p className="text-sm" style={{ color: settings.textColor || '#94a3b8' }}>Primeiro profissional disponível</p>
                </div>
            </div>

            {professionals.map(pro => {
                const isSelected = selectedProId === pro.id;
                return (
                    <div 
                        key={pro.id}
                        onClick={() => setSelectedProId(pro.id)}
                        className={`p-5 rounded-xl border cursor-pointer transition-all flex items-center gap-4 ${isSelected ? 'bg-slate-800 border-orange-500 ring-1 ring-orange-500' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
                        style={isSelected ? { borderColor: settings.primaryColor, '--tw-ring-color': settings.primaryColor } as any : {}}
                    >
                        <img src={pro.photoUrl} alt={pro.name} className="w-16 h-16 rounded-full object-cover" />
                        <div>
                            <h3 className="font-bold text-lg" style={{ color: settings.titleColor || '#ffffff' }}>{pro.name}</h3>
                            <p className="text-sm" style={{ color: settings.textColor || '#94a3b8' }}>{pro.role}</p>
                        </div>
                    </div>
                );
            })}
        </div>

        <StickyFooter 
            total={subtotal} 
            onContinue={() => setStep('datetime')} 
            disabled={false} // Always enabled as user can select "No preference"
            settings={settings} 
        />
    </div>
);