import React, { useMemo, useState } from 'react';
import { Service, ShopSettings } from '../../../types';
import { ArrowLeft, Check, Clock, Scissors } from 'lucide-react';
import { StickyFooter } from '../StickyFooter';

interface ServicesStepProps {
    services: Service[];
    selectedServiceIds: string[];
    setSelectedServiceIds: React.Dispatch<React.SetStateAction<string[]>>;
    setStep: (s: string) => void;
    settings: ShopSettings;
    total: number;
}

const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const ServicesStep: React.FC<ServicesStepProps> = ({ services, selectedServiceIds, setSelectedServiceIds, setStep, settings, total }) => {
    const accent = settings.accentColor || settings.primaryColor || '#f97316';
    const cardBg = settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.4)';
    const border = settings.borderColor || '#334155';
    const textColor = settings.textColor || '#94a3b8';
    const titleColor = settings.titleColor || '#ffffff';

    const [activeCategory, setActiveCategory] = useState<string>('Todos');

    const toggleService = (id: string) => {
        setSelectedServiceIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const categories = useMemo(() => {
        const cats = Array.from(new Set(services.map(s => s.category || 'Geral'))).sort();
        return ['Todos', ...cats];
    }, [services]);

    const displayedServices = useMemo(() => {
        if (activeCategory === 'Todos') return services;
        return services.filter(s => (s.category || 'Geral') === activeCategory);
    }, [services, activeCategory]);

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 pb-32">
            {/* Voltar */}
            <div className="mb-6">
                <button
                    onClick={() => setStep('home')}
                    className="group flex items-center gap-2 transition-colors"
                    style={{ color: textColor }}
                >
                    <div className="p-2 rounded-full transition-colors" style={{ backgroundColor: cardBg }}>
                        <ArrowLeft size={18} />
                    </div>
                    <span className="font-medium">Voltar ao início</span>
                </button>
            </div>

            <h2 className="text-3xl font-bold mb-1" style={{ color: titleColor }}>Escolha seus serviços</h2>
            <p className="mb-6" style={{ color: textColor }}>Selecione um ou mais serviços desejados</p>

            {/* Filtros de Categoria */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
                {categories.map(cat => {
                    const isActive = activeCategory === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`shrink-0 px-4 py-2 rounded-md text-sm font-bold border transition-all bg-white ${
                                isActive 
                                ? 'border-2 border-orange-500 text-orange-500 shadow-sm' 
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            {cat}
                        </button>
                    );
                })}
            </div>

            {/* Grid de Serviços: 4 colunas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {displayedServices.map(service => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                        <div
                            key={service.id}
                            onClick={() => toggleService(service.id)}
                            className={`rounded-[2rem] border flex flex-col overflow-hidden group transition-all shadow-xl cursor-pointer relative ${isSelected ? 'ring-2' : 'hover:brightness-110'}`}
                            style={{
                                backgroundColor: cardBg,
                                borderColor: isSelected ? accent : border,
                                '--tw-ring-color': isSelected ? `${accent}33` : 'transparent',
                            } as React.CSSProperties}
                        >
                            {/* Imagem */}
                            <div className="h-40 w-full relative overflow-hidden">
                                {service.imageUrl ? (
                                    <img
                                        src={service.imageUrl}
                                        alt={service.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: settings.inputBackgroundColor || '#0f172a' }}>
                                        <Scissors size={40} style={{ color: border }} />
                                    </div>
                                )}
                                {/* Badge Duração */}
                                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10" style={{ color: accent }}>
                                    <Clock size={12} />
                                    {service.duration} min
                                </div>
                            </div>

                            {/* Conteúdo */}
                            <div className="p-5 flex flex-col flex-1">
                                <h3 className="font-bold text-base leading-tight mb-1" style={{ color: titleColor }}>{service.name}</h3>
                                <p className="text-[10px] line-clamp-2 mb-4 min-h-[1.5rem] leading-relaxed" style={{ color: textColor }}>{service.description}</p>

                                <div className="mt-auto flex items-center justify-between">
                                    <p className="text-xl font-bold" style={{ color: accent }}>
                                        {formatCurrency(service.price)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <StickyFooter
                total={total}
                onContinue={() => setStep('professional')}
                disabled={selectedServiceIds.length === 0}
                settings={settings}
            />
        </div>
    );
};
