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

export const ProfessionalStep: React.FC<ProfessionalStepProps> = ({ professionals, selectedProId, setSelectedProId, setStep, settings, total }) => {
    const accent = settings.accentColor || settings.primaryColor || '#f97316';
    const cardBg = settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.5)';
    const border = settings.borderColor || '#334155';
    const textColor = settings.textColor || '#94a3b8';
    const titleColor = settings.titleColor || '#ffffff';
    const inputBg = settings.inputBackgroundColor || '#334155';

    const allOptions = [
        { id: null, name: 'Sem preferência', role: 'Qualquer Barbeiro', photoUrl: null },
        ...professionals.map(p => ({ id: p.id, name: p.name, role: p.role, photoUrl: p.photoUrl }))
    ];

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 pb-32">
            <button
                onClick={() => setStep('services')}
                className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
                style={{ color: textColor }}
            >
                <ArrowLeft size={16} /> Voltar
            </button>

            <h2 className="text-3xl font-bold mb-1" style={{ color: titleColor }}>Escolha o profissional</h2>
            <p className="mb-8" style={{ color: textColor }}>Selecione seu barbeiro ou deixe sem preferência</p>

            {/* Grid 5 colunas: cards menores e compactos */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {allOptions.map(pro => {
                    const isSelected = selectedProId === pro.id;
                    return (
                        <div
                            key={pro.id ?? 'none'}
                            onClick={() => setSelectedProId(pro.id)}
                            className={`rounded-xl border cursor-pointer transition-all flex flex-col items-center text-center gap-2 p-2 ${isSelected ? 'ring-2' : 'hover:brightness-110'}`}
                            style={{
                                backgroundColor: cardBg,
                                borderColor: isSelected ? accent : border,
                                ['--tw-ring-color' as any]: isSelected ? accent : 'transparent',
                            }}
                        >
                            {/* Foto compacta */}
                            <div
                                className="w-full aspect-square rounded-lg overflow-hidden flex items-center justify-center"
                                style={{ backgroundColor: inputBg }}
                            >
                                {pro.photoUrl ? (
                                    <img src={pro.photoUrl} alt={pro.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={28} style={{ color: textColor }} className="opacity-30" />
                                )}
                            </div>

                            {/* Nome e role */}
                            <div className="w-full">
                                <h3 className="font-bold text-[11px] leading-tight truncate w-full" style={{ color: titleColor }}>
                                    {pro.name}
                                </h3>
                                <p className="text-[9px] uppercase tracking-wide font-bold opacity-60 truncate w-full" style={{ color: pro.id ? accent : textColor }}>
                                    {pro.role}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <StickyFooter
                total={total}
                onContinue={() => setStep('datetime')}
                disabled={false}
                settings={settings}
            />
        </div>
    );
};
