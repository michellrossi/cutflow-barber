import React, { useMemo } from 'react';
import { Service } from '../../../types';
import { ArrowLeft, Check, Clock, Scissors } from 'lucide-react';
import { StickyFooter } from '../StickyFooter';

interface ServicesStepProps {
    services: Service[];
    selectedServiceIds: string[];
    setSelectedServiceIds: React.Dispatch<React.SetStateAction<string[]>>;
    setStep: (s: any) => void;
    settings: any;
    total: number;
}

export const ServicesStep: React.FC<ServicesStepProps> = ({ services, selectedServiceIds, setSelectedServiceIds, setStep, settings, total }) => {
    
    const toggleService = (id: string) => {
        if (selectedServiceIds.includes(id)) {
            setSelectedServiceIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedServiceIds(prev => [...prev, id]);
        }
    };

    const groupedServices = useMemo(() => {
        return services.reduce((acc, service) => {
            const cat = service.category || 'Geral';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(service);
            return acc;
        }, {} as Record<string, typeof services>);
    }, [services]);

    const sortedCategories = Object.keys(groupedServices).sort();

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 pb-32">
            <div className="mb-6">
                <button 
                    onClick={() => setStep('home')} 
                    className="group flex items-center gap-2 transition-colors"
                    style={{ color: settings.textColor || '#94a3b8' }}
                >
                    <div className="p-2 rounded-full transition-colors" style={{ backgroundColor: settings.cardBackgroundColor || '#1e293b' }}>
                        <ArrowLeft size={18}/> 
                    </div>
                    <span className="font-medium">Voltar ao início</span>
                </button>
            </div>
            
            <h2 className="text-3xl font-bold mb-2" style={{ color: settings.titleColor || '#ffffff' }}>Escolha seus serviços</h2>
            <p className="mb-8" style={{ color: settings.textColor || '#94a3b8' }}>Selecione um ou mais serviços desejados</p>

            <div className="space-y-8">
                {sortedCategories.map(category => (
                    <div key={category}>
                        <h3 className="text-lg font-bold mb-3 border-b pb-2" style={{ color: settings.titleColor || '#ffffff', borderColor: settings.borderColor || '#334155' }}>
                            {category}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {groupedServices[category].map(service => {
                                const isSelected = selectedServiceIds.includes(service.id);
                                return (
                                    <div 
                                        key={service.id} 
                                        onClick={() => toggleService(service.id)}
                                        className={`rounded-[2rem] border flex flex-col overflow-hidden group transition-all shadow-xl cursor-pointer relative ${
                                            isSelected ? 'ring-2' : 'hover:brightness-110'
                                        }`}
                                        style={{ 
                                            backgroundColor: settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.4)', 
                                            borderColor: isSelected ? (settings.accentColor || settings.primaryColor) : (settings.borderColor || '#334155'),
                                            '--tw-ring-color': isSelected ? `${settings.accentColor || settings.primaryColor}33` : 'transparent'
                                        } as any}
                                    >
                                        {/* Imagem do Serviço */}
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
                                                    <Scissors size={40} style={{ color: settings.borderColor || '#334155' }} />
                                                </div>
                                            )}
                                            {/* Badge de Duração */}
                                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10" style={{ color: settings.accentColor || settings.primaryColor }}>
                                                <Clock size={12}/>
                                                {service.duration} min
                                            </div>
                                            {/* Checkbox Overlay */}
                                            {isSelected && (
                                                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${settings.accentColor || settings.primaryColor}1a` }}>
                                                    <div className="text-white rounded-full p-2 shadow-lg" style={{ backgroundColor: settings.accentColor || settings.primaryColor }}>
                                                        <Check size={24} strokeWidth={3} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Conteúdo */}
                                        <div className="p-5 flex flex-col flex-1">
                                            <h3 className="font-bold text-base leading-tight mb-1" style={{ color: settings.titleColor || '#ffffff' }}>{service.name}</h3>
                                            <p className="text-[10px] line-clamp-2 mb-4 min-h-[1.5rem] leading-relaxed" style={{ color: settings.textColor || '#94a3b8' }}>{service.description}</p>

                                            <div className="mt-auto flex items-center justify-between">
                                                <p className="text-xl font-bold" style={{ color: settings.accentColor || settings.primaryColor }}>
                                                    R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isSelected ? '' : ''
                                                }`} style={{ 
                                                    backgroundColor: isSelected ? (settings.accentColor || settings.primaryColor) : 'transparent', 
                                                    borderColor: isSelected ? (settings.accentColor || settings.primaryColor) : (settings.borderColor || '#334155') 
                                                }}>
                                                    {isSelected && <Check size={14} style={{ color: settings.buttonTextColor || '#ffffff' }} strokeWidth={3} />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
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