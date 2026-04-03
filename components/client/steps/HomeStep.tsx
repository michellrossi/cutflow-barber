import React from 'react';
import { Scissors, User, Calendar, MapPin, Instagram, Clock } from 'lucide-react';

interface HomeStepProps {
    settings: any;
    setStep: (s: any) => void;
    onAdminClick: () => void;
    onProfileClick: () => void;
}

const DAY_LABELS: Record<string, string> = {
    sunday: 'Dom', monday: 'Seg', tuesday: 'Ter',
    wednesday: 'Qua', thursday: 'Qui', friday: 'Sex', saturday: 'Sáb'
};
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const HomeStep: React.FC<HomeStepProps> = ({ settings, setStep, onAdminClick, onProfileClick }) => {
    const accent = settings.accentColor || settings.primaryColor || '#f97316';
    const cardBg = settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.5)';
    const border = settings.borderColor || '#334155';
    const textColor = settings.textColor || '#94a3b8';
    const titleColor = settings.titleColor || '#ffffff';
    const btnTextColor = settings.buttonTextColor || '#ffffff';

    const activeDays = DAY_ORDER
        .map(d => ({ key: d, label: DAY_LABELS[d], val: settings.businessHours?.[d] }))
        .filter(d => d.val?.active);

    return (
        <div className="flex flex-col items-center min-h-screen py-10 px-4" style={{ background: `linear-gradient(180deg, ${settings.backgroundColor || '#0f172a'} 0%, ${settings.backgroundColor || '#0f172a'}ee 100%)` }}>

            {/* Logo grande com destaque */}
            <div className="relative mb-6">
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl border-2" style={{ backgroundColor: cardBg, borderColor: accent }}>
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <Scissors size={56} style={{ color: accent }} />
                    )}
                </div>
                {/* Brilho embaixo do logo */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full blur-lg opacity-60" style={{ backgroundColor: accent }} />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-2 text-center" style={{ color: titleColor }}>{settings.name}</h1>
            <p className="text-base mb-8 text-center max-w-sm" style={{ color: textColor }}>
                Sistema profissional de agendamento. Reserve seu horário em poucos cliques.
            </p>

            {/* Botão Principal */}
            <button
                onClick={() => setStep('services')}
                className="w-full max-w-sm px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:brightness-110 transition-all transform hover:-translate-y-1 mb-4"
                style={{ backgroundColor: settings.primaryColor, color: btnTextColor, boxShadow: `0 8px 30px ${accent}40` }}
            >
                Agendar Horário
            </button>

            {/* Botão Minha Conta */}
            <button
                onClick={onProfileClick}
                className="w-full max-w-sm flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border font-bold hover:brightness-110 transition-all shadow-lg mb-10"
                style={{ backgroundColor: cardBg, borderColor: border, color: btnTextColor }}
            >
                <User size={20} style={{ color: accent }} />
                Minha Conta / Fidelidade
            </button>

            {/* Card de Informações da Barbearia */}
            <div className="w-full max-w-sm rounded-2xl border overflow-hidden shadow-lg mb-8" style={{ backgroundColor: cardBg, borderColor: border }}>
                {/* Header do card */}
                <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: border }}>
                    <Scissors size={18} style={{ color: accent }} />
                    <span className="font-bold text-sm" style={{ color: titleColor }}>Informações</span>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {/* Endereço */}
                    {settings.address && (
                        <div className="flex items-start gap-3">
                            <MapPin size={16} style={{ color: accent }} className="mt-0.5 shrink-0" />
                            <span className="text-sm" style={{ color: textColor }}>{settings.address}</span>
                        </div>
                    )}

                    {/* Instagram */}
                    {settings.instagram && (
                        <a
                            href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                            <Instagram size={16} style={{ color: accent }} className="shrink-0" />
                            <span className="text-sm font-medium" style={{ color: accent }}>
                                {settings.instagram.startsWith('@') ? settings.instagram : `@${settings.instagram}`}
                            </span>
                        </a>
                    )}

                    {/* Horário de Funcionamento */}
                    {activeDays.length > 0 && (
                        <div className="flex items-start gap-3">
                            <Clock size={16} style={{ color: accent }} className="mt-0.5 shrink-0" />
                            <div className="space-y-1 w-full">
                                {activeDays.map(d => (
                                    <div key={d.key} className="flex justify-between text-xs" style={{ color: textColor }}>
                                        <span className="font-medium">{d.label}</span>
                                        <span>{d.val!.start} – {d.val!.end}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fallback se não há info */}
                    {!settings.address && !settings.instagram && activeDays.length === 0 && (
                        <p className="text-xs text-center" style={{ color: textColor }}>Configure as informações da barbearia no painel administrativo.</p>
                    )}
                </div>
            </div>

            {/* Cards de features menores */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-10">
                {[
                    { Icon: Scissors, title: 'Serviços', desc: 'Variados' },
                    { Icon: User, title: 'Profissionais', desc: 'Qualificados' },
                    { Icon: Calendar, title: 'Agendamento', desc: 'Fácil & Rápido' },
                ].map(({ Icon, title, desc }) => (
                    <div key={title} className="p-3 rounded-xl border text-center" style={{ backgroundColor: cardBg, borderColor: border }}>
                        <Icon className="mx-auto mb-2" style={{ color: accent }} size={22} />
                        <p className="font-bold text-[11px]" style={{ color: titleColor }}>{title}</p>
                        <p className="text-[9px]" style={{ color: textColor }}>{desc}</p>
                    </div>
                ))}
            </div>

        </div>
    );
};
