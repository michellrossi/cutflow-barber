import React, { useMemo } from 'react';
import { Service } from '../../../types';
import { ArrowLeft, Check, Clock } from 'lucide-react';
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
                        <div className="space-y-4">
                            {groupedServices[category].map(service => {
                                const isSelected = selectedServiceIds.includes(service.id);
                                return (
                                    <div 
                                        key={service.id} 
                                        onClick={() => toggleService(service.id)}
                                        className={`p-5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-slate-800 border-orange-500 ring-1 ring-orange-500' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
                                        style={isSelected ? { borderColor: settings.primaryColor, '--tw-ring-color': settings.primaryColor } as any : {}}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center mt-1 ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-500'}`} style={isSelected ? { backgroundColor: settings.primaryColor, borderColor: settings.primaryColor } : {}}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg" style={{ color: settings.titleColor || '#ffffff' }}>{service.name}</h3>
                                                <p className="text-sm mb-2" style={{ color: settings.textColor || '#94a3b8' }}>{service.description}</p>
                                                <div className="flex gap-4 text-sm font-medium">
                                                    <span className="flex items-center gap-1" style={{ color: settings.textColor || '#94a3b8' }}><Clock size={14}/> {service.duration} min</span>
                                                    <span style={{ color: settings.priceColor || settings.primaryColor }}>R$ {service.price.toFixed(2)}</span>
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