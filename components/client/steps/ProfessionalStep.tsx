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

        <div className="space-y-4">
            <div 
                onClick={() => setSelectedProId(null)}
                className={`p-5 rounded-xl border cursor-pointer transition-all flex items-center gap-4 ${selectedProId === null ? 'ring-1' : 'hover:brightness-110'}`}
                style={{ 
                    backgroundColor: settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.5)', 
                    borderColor: selectedProId === null ? (settings.accentColor || settings.primaryColor) : (settings.borderColor || '#334155'),
                    '--tw-ring-color': selectedProId === null ? (settings.accentColor || settings.primaryColor) : 'transparent'
                } as any}
            >
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: settings.inputBackgroundColor || '#334155' }}>
                    <User size={24} style={{ color: settings.textColor || '#94a3b8' }}/>
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
                        className={`p-5 rounded-xl border cursor-pointer transition-all flex items-center gap-4 ${isSelected ? 'ring-1' : 'hover:brightness-110'}`}
                        style={{ 
                            backgroundColor: settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.5)', 
                            borderColor: isSelected ? (settings.accentColor || settings.primaryColor) : (settings.borderColor || '#334155'),
                            '--tw-ring-color': isSelected ? (settings.accentColor || settings.primaryColor) : 'transparent'
                        } as any}
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
            total={total} 
            onContinue={() => setStep('datetime')} 
            disabled={false} // Always enabled as user can select "No preference"
            settings={settings} 
        />
    </div>
);
