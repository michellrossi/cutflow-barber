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
    total: number;
}

export const ProfessionalStep: React.FC<ProfessionalStepProps> = ({ professionals, selectedProId, setSelectedProId, setStep, settings, total }) => (
    <div className="max-w-2xl mx-auto py-8 px-4 pb-32">
        <button onClick={() => setStep('services')} className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity" style={{ color: settings.textColor || '#94a3b8' }}><ArrowLeft size={16}/> Voltar</button>
        <h2 className="text-3xl font-bold mb-2" style={{ color: settings.titleColor || '#ffffff' }}>Escolha o profissional</h2>
        <p className="mb-8" style={{ color: settings.textColor || '#94a3b8' }}>Selecione seu barbeiro ou deixe sem preferência</p>

        <div className="grid grid-cols-2 gap-4">
            <div 
                onClick={() => setSelectedProId(null)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center gap-3 ${selectedProId === null ? 'ring-2' : 'hover:brightness-110'}`}
                style={{ 
                    backgroundColor: settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.5)', 
                    borderColor: selectedProId === null ? (settings.accentColor || settings.primaryColor) : (settings.borderColor || '#334155'),
                    '--tw-ring-color': selectedProId === null ? (settings.accentColor || settings.primaryColor) : 'transparent'
                } as any}
            >
                <div className="w-full aspect-[3/4] rounded-xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: settings.inputBackgroundColor || '#334155' }}>
                    <User size={48} style={{ color: settings.textColor || '#94a3b8' }} className="opacity-20" />
                </div>
                <div>
                    <h3 className="font-bold text-base" style={{ color: settings.titleColor || '#ffffff' }}>Sem preferência</h3>
                    <p className="text-[10px] uppercase tracking-wider font-bold opacity-60" style={{ color: settings.textColor || '#94a3b8' }}>Qualquer Barbeiro</p>
                </div>
            </div>

            {professionals.map(pro => {
                const isSelected = selectedProId === pro.id;
                return (
                    <div 
                        key={pro.id}
                        onClick={() => setSelectedProId(pro.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col items-center text-center gap-3 ${isSelected ? 'ring-2' : 'hover:brightness-110'}`}
                        style={{ 
                            backgroundColor: settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.5)', 
                            borderColor: isSelected ? (settings.accentColor || settings.primaryColor) : (settings.borderColor || '#334155'),
                            '--tw-ring-color': isSelected ? (settings.accentColor || settings.primaryColor) : 'transparent'
                        } as any}
                    >
                        <div className="w-full aspect-[3/4] rounded-xl overflow-hidden">
                            <img src={pro.photoUrl} alt={pro.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base" style={{ color: settings.titleColor || '#ffffff' }}>{pro.name}</h3>
                            <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: settings.accentColor || settings.primaryColor }}>{pro.role}</p>
                        </div>
                    </div>
                );
            })}
        </div>

        <StickyFooter 
            total={total} 
            onContinue={() => setStep('datetime')} 
            disabled={false} // Always enabled as user can select "No preference"
            settings={settings} 
        />
    </div>
);
