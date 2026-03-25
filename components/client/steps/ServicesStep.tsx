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
                    className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <div className="p-2 rounded-full bg-slate-800 group-hover:bg-slate-700">
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
                        <h3 className="text-lg font-bold mb-3 border-b border-slate-700 pb-2" style={{ color: settings.titleColor || '#ffffff' }}>
                            {category}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {groupedServices[category].map(service => {
                                const isSelected = selectedServiceIds.includes(service.id);
                                return (
                                    <div 
                                        key={service.id} 
                                        onClick={() => toggleService(service.id)}
                                        className={`bg-slate-800/40 rounded-[2rem] border flex flex-col overflow-hidden group transition-all shadow-xl cursor-pointer relative ${
                                            isSelected ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-700 hover:border-slate-600'
                                        }`}
                                        style={isSelected ? { borderColor: settings.primaryColor, '--tw-ring-color': `${settings.primaryColor}33` } as any : {}}
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
                                                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                                    <Scissors size={40} className="text-slate-700" />
                                                </div>
                                            )}
                                            {/* Badge de Duração */}
                                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-orange-400 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10" style={{ color: settings.primaryColor }}>
                                                <Clock size={12}/>
                                                {service.duration} min
                                            </div>
                                            {/* Checkbox Overlay */}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center" style={{ backgroundColor: `${settings.primaryColor}1a` }}>
                                                    <div className="bg-orange-500 text-white rounded-full p-2 shadow-lg" style={{ backgroundColor: settings.primaryColor }}>
                                                        <Check size={24} strokeWidth={3} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Conteúdo */}
                                        <div className="p-5 flex flex-col flex-1">
                                            <h3 className="font-bold text-white text-base leading-tight mb-1" style={{ color: settings.titleColor || '#ffffff' }}>{service.name}</h3>
                                            <p className="text-[10px] text-slate-500 line-clamp-2 mb-4 min-h-[1.5rem] leading-relaxed" style={{ color: settings.textColor || '#94a3b8' }}>{service.description}</p>

                                            <div className="mt-auto flex items-center justify-between">
                                                <p className="text-xl font-bold text-orange-500" style={{ color: settings.priceColor || settings.primaryColor }}>
                                                    R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-600'
                                                }`} style={isSelected ? { backgroundColor: settings.primaryColor, borderColor: settings.primaryColor } : {}}>
                                                    {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
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