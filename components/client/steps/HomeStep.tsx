import React from 'react';
import { Scissors, User, Calendar, MapPin, Instagram, Clock, Facebook, MessageCircle, CreditCard, Banknote, Landmark, Smartphone, Info } from 'lucide-react';

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

    const paymentIcons = {
        credit: <CreditCard size={20} />,
        debit: <Landmark size={20} />,
        cash: <Banknote size={20} />,
        pix: <Smartphone size={20} />
    };

    const paymentLabels = {
        credit: 'Crédito',
        debit: 'Débito',
        cash: 'Dinheiro',
        pix: 'Pix'
    };

    const paymentColors = {
        credit: '#3b82f6',
        debit: '#8b5cf6',
        cash: '#eab308',
        pix: '#22c55e'
    };

    return (
        <div className="flex flex-col items-center min-h-screen py-8 px-4 w-full" style={{ background: `linear-gradient(180deg, ${settings.backgroundColor || '#0f172a'} 0%, ${settings.backgroundColor || '#0f172a'}ee 100%)` }}>

            {/* Logo de Destaque no Topo */}
            <div className="relative mb-6">
                <div className="w-28 h-28 rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl border-2" style={{ backgroundColor: cardBg, borderColor: accent }}>
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <Scissors size={48} style={{ color: accent }} />
                    )}
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full blur-lg opacity-40" style={{ backgroundColor: accent }} />
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-1 text-center" style={{ color: titleColor }}>{settings.name}</h1>
            

            <div className="w-full max-w-sm space-y-6 mb-12">
                {/* Quem Somos / Descrição */}
                {settings.description && (
                    <div className="p-6 rounded-2xl border shadow-lg text-center" style={{ backgroundColor: cardBg, borderColor: border }}>
                        <div className="flex items-center justify-center gap-2 mb-3">
                            <Info size={16} style={{ color: accent }} />
                            <span className="font-bold text-xs uppercase tracking-widest" style={{ color: titleColor }}>Quem Somos</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: textColor }}>{settings.description}</p>
                    </div>
                )}

                {/* Card de Informações Extras */}
                <div className="rounded-2xl border overflow-hidden shadow-lg" style={{ backgroundColor: cardBg, borderColor: border }}>
                    <div className="p-5 space-y-5">
                        {/* Endereço */}
                        {settings.address && (
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Localização</p>
                                    <p className="text-sm" style={{ color: titleColor }}>{settings.address}</p>
                                </div>
                            </div>
                        )}

                        {/* Horários */}
                        {activeDays.length > 0 && (
                            <div className="flex items-start gap-4 border-t pt-5" style={{ borderColor: border }}>
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Clock size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Horários de Funcionamento</p>
                                    <div className="grid grid-cols-1 gap-1">
                                        {activeDays.map(d => (
                                            <div key={d.key} className="flex justify-between text-xs" style={{ color: textColor }}>
                                                <span className="font-medium">{d.label}</span>
                                                <span className="font-bold" style={{ color: titleColor }}>{d.val!.start} – {d.val!.end}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Redes Sociais */}
                        {(settings.instagram || settings.facebook || settings.whatsapp) && (
                            <div className="border-t pt-5" style={{ borderColor: border }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4 text-center">Nossas Redes</p>
                                <div className="flex justify-center gap-6">
                                    {settings.instagram && (
                                        <a href={`https://instagram.com/${settings.instagram.replace('@', '')}`} target="_blank" className="flex flex-col items-center gap-1 group">
                                            <div className="w-10 h-10 rounded-full border flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: '#e1306c20', borderColor: '#e1306c40', color: '#e1306c' }}>
                                                <Instagram size={20} />
                                            </div>
                                            <span className="text-[9px] font-bold" style={{ color: textColor }}>Instagram</span>
                                        </a>
                                    )}
                                    {settings.facebook && (
                                        <a href={`https://facebook.com/${settings.facebook}`} target="_blank" className="flex flex-col items-center gap-1 group">
                                            <div className="w-10 h-10 rounded-full border flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: '#1877f220', borderColor: '#1877f240', color: '#1877f2' }}>
                                                <Facebook size={20} />
                                            </div>
                                            <span className="text-[9px] font-bold" style={{ color: textColor }}>Facebook</span>
                                        </a>
                                    )}
                                    {settings.whatsapp && (
                                        <a href={`https://wa.me/55${settings.whatsapp.replace(/\D/g, '')}`} target="_blank" className="flex flex-col items-center gap-1 group">
                                            <div className="w-10 h-10 rounded-full border flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: '#25d36620', borderColor: '#25d36640', color: '#25d366' }}>
                                                <MessageCircle size={20} />
                                            </div>
                                            <span className="text-[9px] font-bold" style={{ color: textColor }}>WhatsApp</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Formas de Pagamento */}
                        <div className="border-t pt-5" style={{ borderColor: border }}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-4">Formas de Pagamento</p>
                            <div className="grid grid-cols-4 gap-2">
                                {(settings.paymentMethods || ['credit', 'debit', 'cash', 'pix']).map((method: string) => (
                                    <div key={method} className="flex flex-col items-center gap-2">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all" style={{ backgroundColor: `${paymentColors[method as keyof typeof paymentColors]}15`, color: paymentColors[method as keyof typeof paymentColors] }}>
                                            {paymentIcons[method as keyof typeof paymentIcons]}
                                        </div>
                                        <span className="text-[10px] font-bold" style={{ color: textColor }}>{paymentLabels[method as keyof typeof paymentLabels]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ações na Base do Layout */}
            <div className="w-full max-w-sm space-y-4 px-2">
                <button
                    onClick={() => setStep('services')}
                    className="w-full py-5 rounded-2xl font-bold text-lg shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-3 active:scale-95"
                    style={{ backgroundColor: settings.primaryColor, color: btnTextColor, boxShadow: `0 10px 40px ${accent}40` }}
                >
                    <Calendar size={22} />
                    Agendar Horário
                </button>

                <button
                    onClick={onProfileClick}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border font-bold hover:brightness-110 transition-all shadow-lg active:scale-95"
                    style={{ backgroundColor: cardBg, borderColor: border, color: btnTextColor }}
                >
                    <User size={20} style={{ color: accent }} />
                    Área do Cliente
                </button>
            </div>

            {/* Créditos */}
            <p className="mt-12 text-[10px] font-bold uppercase tracking-[0.2em] opacity-30" style={{ color: textColor }}>
                Powered by Insight Barber
            </p>

        </div>
    );
};
