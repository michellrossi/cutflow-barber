import React, { useState, useEffect } from 'react';
import { useShop } from '../../store';
import { Appointment, Service, Professional } from '../../types';
import { 
    Scissors, Calendar, User, MapPin, Clock, ArrowLeft, 
    ChevronRight, Check, Star, LogOut, History, Smartphone,
    ChevronDown, CreditCard, ChevronUp, Map, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientLogin } from './ClientLogin';
import { ClientProfile } from './ClientProfile';
import { formatCurrencyBRL } from '../../store';

type Step = 'welcome' | 'services' | 'professional' | 'datetime' | 'summary' | 'success' | 'login' | 'profile';

export const BookingFlow: React.FC<{ onAdminClick: () => void }> = ({ onAdminClick }) => {
    const [step, setStep] = useState<Step>('welcome');
    const { 
        services, professionals, settings, coupons, 
        addAppointment, appointments, blockedSlots, 
        currentClient, logoutClient 
    } = useShop();

    // Booking State
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [selectedProId, setSelectedProId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [activeCategory, setActiveCategory] = useState<string>('Todos');

    // Server feedback
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helpers
    const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
    const subtotal = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);

    const categories = Array.from(new Set(services.map(s => s.category || 'Geral'))).sort();
    const finalCategories = ['Todos', ...categories];

    const filteredServices = activeCategory === 'Todos' 
        ? services 
        : services.filter(s => s.category === activeCategory);

    // Authentication Logic
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        
        if (view === 'profile' && currentClient) setStep('profile');
    }, [currentClient]);

    const handleAgendarClick = () => {
        if (!currentClient) {
            setStep('login');
        } else {
            setStep('services');
        }
    };

    const handleHistoryClick = () => {
        if (!currentClient) {
            setStep('login');
        } else {
            setStep('profile');
        }
    };

    const toggleService = (id: string) => {
        setSelectedServiceIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleFinish = async () => {
        if (!currentClient) {
            setStep('login');
            return;
        }

        setLoading(true);
        setError(null);

        const appointment: Omit<Appointment, 'id' | 'createdAt' | 'shopId'> = {
            clientName: currentClient.name,
            clientPhone: currentClient.phone,
            clientBirthDate: currentClient.birthDate,
            serviceIds: selectedServiceIds,
            professionalId: selectedProId!,
            date: selectedDate,
            time: selectedTime,
            totalValue: subtotal,
            status: 'scheduled'
        };

        try {
            const result = await addAppointment(appointment);
            if (result.success) {
                if (result.data?.id) {
                    fetch('/api/notify/confirmation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ appointmentId: result.data.id })
                    }).catch(err => console.error("Erro ao disparar notificação:", err));
                }
                setStep('success');
            } else {
                setError(result.error || 'Erro ao agendar. Tente novamente.');
            }
        } catch (err) {
            setError('Erro inesperado ao realizar o agendamento.');
        } finally {
            setLoading(false);
        }
    };

    // Render Steps
    if (step === 'login') return <ClientLogin onBack={() => setStep('welcome')} />;
    if (step === 'profile') return <ClientProfile onBack={() => setStep('welcome')} />;
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xl shadow-slate-200/50">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-2">Agendamento Confirmado!</h2>
                    <p className="text-slate-500 mb-8">Seu horário foi reservado com sucesso. Você receberá uma confirmação em seu WhatsApp.</p>
                    <button onClick={() => setStep('welcome')} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all">
                        Voltar para o Início
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-200">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-4 py-4 md:px-8">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold tracking-tight text-slate-900">{settings.name || "Insight Barber"}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {currentClient ? (
                            <button onClick={handleHistoryClick} className="flex items-center gap-2 p-1 pr-3 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white">
                                    <User size={16} />
                                </div>
                                <span className="text-sm font-bold text-slate-700 hidden sm:block">Meu Perfil</span>
                            </button>
                        ) : (
                            <button onClick={() => setStep('login')} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
                                <User size={24} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-6">
                <AnimatePresence mode="wait">
                    {step === 'welcome' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center md:text-left overflow-hidden relative">
                                <div className="relative z-10">
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Agende seu horário</h1>
                                    <div className="flex flex-col md:flex-row md:items-center gap-4 text-slate-500 mb-8">
                                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 w-fit">
                                            <MapPin size={16} className="text-slate-400" />
                                            <span className="text-sm font-medium">{settings.address || "R. José de Alencar, 123 - Centro"}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button onClick={handleAgendarClick} className="bg-slate-900 text-white py-5 px-8 rounded-xl font-bold text-lg hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3">
                                            <Calendar size={22} /> Agendar Agora
                                        </button>
                                        <button onClick={handleHistoryClick} className="bg-white text-slate-700 border border-slate-200 py-5 px-8 rounded-xl font-bold text-lg hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3">
                                            <History size={22} /> Ver Histórico
                                        </button>
                                    </div>
                                </div>
                                <div className="absolute -right-20 -bottom-20 opacity-[0.03] pointer-events-none">
                                    <Scissors size={280} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {step !== 'welcome' && (
                    <div className="space-y-4">
                        {/* Passo 1: Serviços */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <button onClick={() => setStep('services')} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 'services' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Escolha o Serviço</h3>
                                        {selectedServices.length > 0 && (
                                            <p className="text-sm text-slate-500 font-medium">{selectedServices.length} selecionado(s)</p>
                                        )}
                                    </div>
                                </div>
                                {step !== 'services' && <ChevronDown size={18} className="text-slate-400" />}
                            </button>
                            {step === 'services' && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-6 pb-6 border-t border-slate-50 pt-6">
                                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                                        {finalCategories.map(cat => (
                                            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="space-y-3">
                                        {filteredServices.map(service => {
                                            const isSelected = selectedServiceIds.includes(service.id);
                                            return (
                                                <div key={service.id} onClick={() => toggleService(service.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 ${isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                            <Scissors size={20} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-sm">{service.name}</h4>
                                                            <p className="text-xs text-slate-500">{service.duration} min</p>
                                                        </div>
                                                    </div>
                                                    <p className="font-black text-slate-900">{formatCurrencyBRL(service.price)}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button disabled={selectedServiceIds.length === 0} onClick={() => setStep('professional')} className="w-full mt-6 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all">
                                        Continuar
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Passo 2: Profissional */}
                        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${selectedServiceIds.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                            <button onClick={() => setStep('professional')} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 'professional' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Escolha o Barbeiro</h3>
                                        {selectedProId && <p className="text-sm text-slate-500 font-medium">{professionals.find(p => p.id === selectedProId)?.name || 'Sem preferência'}</p>}
                                    </div>
                                </div>
                                {step !== 'professional' && <ChevronDown size={18} className="text-slate-400" />}
                            </button>
                            {step === 'professional' && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-6 pb-6 border-t border-slate-50 pt-6">
                                    <div className="space-y-3">
                                        {[{ id: null, name: 'Sem preferência', role: 'Qualquer Barbeiro', photoUrl: null }, ...professionals].map(pro => {
                                            const isSelected = selectedProId === pro.id;
                                            return (
                                                <div key={pro.id ?? 'none'} onClick={() => setSelectedProId(pro.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 ${isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-200 shadow-inner">
                                                            {pro.photoUrl ? <img src={pro.photoUrl} alt={pro.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><User size={24} /></div>}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-sm">{pro.name}</h4>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pro.role}</p>
                                                        </div>
                                                    </div>
                                                    {isSelected && <Check size={20} className="text-slate-900" />}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button onClick={() => setStep('datetime')} className="w-full mt-6 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all">
                                        Continuar
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Passo 3: Data e Hora */}
                        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${!selectedProId && selectedProId !== null ? 'opacity-50 pointer-events-none' : ''}`}>
                            <button onClick={() => setStep('datetime')} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 'datetime' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>3</div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Escolha Data e Hora</h3>
                                        {selectedDate && selectedTime && <p className="text-sm text-slate-500 font-medium">{selectedDate} às {selectedTime}</p>}
                                    </div>
                                </div>
                                {step !== 'datetime' && <ChevronDown size={18} className="text-slate-400" />}
                            </button>
                            {step === 'datetime' && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-6 pb-6 border-t border-slate-50 pt-6 space-y-6">
                                    <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                                        {[...Array(14)].map((_, i) => {
                                            const d = new Date(); d.setDate(d.getDate() + i);
                                            const fullDate = d.toISOString().split('T')[0];
                                            const isSelected = selectedDate === fullDate;
                                            return (
                                                <div key={i} onClick={() => setSelectedDate(fullDate)} className={`p-2 rounded-xl border-2 text-center cursor-pointer transition-all ${isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>{d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                                                    <span className="block text-lg font-black">{d.getDate()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {selectedDate && (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                            {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map(time => {
                                                const isSelected = selectedTime === time;
                                                return <div key={time} onClick={() => setSelectedTime(time)} className={`py-3 rounded-lg border-2 text-center text-sm font-bold cursor-pointer transition-all ${isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-white hover:border-slate-200 text-slate-700'}`}>{time}</div>;
                                            })}
                                        </div>
                                    )}
                                    <button disabled={!selectedDate || !selectedTime} onClick={handleFinish} className="w-full mt-4 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                                        {loading ? <Loader2 className="animate-spin" /> : "Confirmar Agendamento"}
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
