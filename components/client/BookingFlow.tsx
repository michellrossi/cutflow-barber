import React, { useState, useEffect } from 'react';
import { useShop } from '../../store';
import { Appointment, Service, Professional } from '../../types';
import { 
    Scissors, Calendar, User, MapPin, Clock, ArrowLeft, 
    ChevronRight, Check, Star, LogOut, History, Smartphone,
    ChevronDown, CreditCard, ChevronUp, Map
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
        const token = params.get('token');
        const view = params.get('view');
        
        if (view === 'profile' && currentClient) setStep('profile');
        if (token) {
            // Token handling logic is in store.tsx, 
            // here we just ensure step is correct
        }
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

    // Render Steps
    if (step === 'login') return <ClientLogin onBack={() => setStep('welcome')} />;
    if (step === 'profile') return <ClientProfile onBack={() => setStep('welcome')} />;

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
                {/* 1. WELCOME CARD */}
                <AnimatePresence mode="wait">
                    {step === 'welcome' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center md:text-left overflow-hidden relative">
                                <div className="relative z-10">
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Agende seu horário</h1>
                                    <div className="flex flex-col md:flex-row md:items-center gap-4 text-slate-500 mb-8">
                                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 w-fit">
                                            <Map size={16} className="text-slate-400" />
                                            <span className="text-sm font-medium">{settings.address || "R. José de Alencar, 123 - Centro"}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button 
                                            onClick={handleAgendarClick}
                                            className="bg-slate-900 text-white py-5 px-8 rounded-xl font-bold text-lg hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3"
                                        >
                                            <Calendar size={22} />
                                            Agendar Agora
                                        </button>
                                        <button 
                                            onClick={handleHistoryClick}
                                            className="bg-white text-slate-700 border border-slate-200 py-5 px-8 rounded-xl font-bold text-lg hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3"
                                        >
                                            <History size={22} />
                                            Ver Histórico
                                        </button>
                                    </div>
                                </div>
                                <div className="absolute -right-20 -bottom-20 opacity-[0.03] pointer-events-none">
                                    <Scissors size={280} />
                                </div>
                            </div>

                            {/* Horários e Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
                                        <Clock size={14} className="text-slate-400" /> Horários
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Seg - Sex</span>
                                            <span className="font-bold text-slate-900">09:00 - 19:00</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Sábado</span>
                                            <span className="font-bold text-slate-900">09:00 - 17:00</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Domingo</span>
                                            <span className="font-bold text-red-500">Fechado</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-center items-center text-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Dúvidas?</p>
                                    <a 
                                        href={`https://wa.me/55${settings.whatsapp?.replace(/\D/g, '')}`} 
                                        target="_blank"
                                        className="text-slate-900 font-black text-xl hover:text-slate-700 transition-colors"
                                    >
                                        {settings.whatsapp || "(00) 00000-0000"}
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 2. BOOKING STEPS */}
                {step !== 'welcome' && step !== 'login' && step !== 'profile' && (
                    <div className="space-y-4">
                        {/* Passo 1: Serviços */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <button 
                                onClick={() => setStep('services')}
                                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 'services' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Escolha o Serviço</h3>
                                        {selectedServices.length > 0 && (
                                            <p className="text-sm text-slate-500 font-medium">{selectedServices.length} {selectedServices.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}</p>
                                        )}
                                    </div>
                                </div>
                                {step !== 'services' && <ChevronDown size={18} className="text-slate-400" />}
                            </button>

                            {step === 'services' && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-6 pb-6 border-t border-slate-50 pt-6">
                                    {/* Pílulas de Categoria */}
                                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                                        {finalCategories.map(cat => (
                                            <button 
                                                key={cat}
                                                onClick={() => setActiveCategory(cat)}
                                                className={`px-6 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                                    activeCategory === cat 
                                                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10' 
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Lista de Serviços */}
                                    <div className="space-y-3">
                                        {filteredServices.map(service => {
                                            const isSelected = selectedServiceIds.includes(service.id);
                                            return (
                                                <div 
                                                    key={service.id}
                                                    onClick={() => toggleService(service.id)}
                                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 ${
                                                        isSelected ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                            <Scissors size={20} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-sm">{service.name}</h4>
                                                            <p className="text-xs text-slate-500">{service.duration} min</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-slate-900">{formatCurrencyBRL(service.price)}</p>
                                                        {isSelected && <div className="text-slate-900 mt-1"><Check size={16} className="ml-auto" /></div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button 
                                        disabled={selectedServiceIds.length === 0}
                                        onClick={() => setStep('professional')}
                                        className="w-full mt-6 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all"
                                    >
                                        Continuar
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Passo 2: Profissional */}
                        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${selectedServiceIds.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                            <button 
                                onClick={() => setStep('professional')}
                                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 'professional' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Escolha o Barbeiro</h3>
                                        {selectedProId && (
                                            <p className="text-sm text-slate-500 font-medium">
                                                {professionals.find(p => p.id === selectedProId)?.name || 'Sem preferência'}
                                            </p>
                                        )}
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
                                                <div 
                                                    key={pro.id ?? 'none'}
                                                    onClick={() => setSelectedProId(pro.id)}
                                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 ${
                                                        isSelected ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-200 shadow-inner">
                                                            {pro.photoUrl ? (
                                                                <img src={pro.photoUrl} alt={pro.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                    <User size={24} />
                                                                </div>
                                                            )}
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
                                    <button 
                                        onClick={() => setStep('datetime')}
                                        className="w-full mt-6 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all"
                                    >
                                        Continuar
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Passo 3: Data e Hora */}
                        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${!selectedProId && selectedProId !== null ? 'opacity-50 pointer-events-none' : ''}`}>
                            <button 
                                onClick={() => setStep('datetime')}
                                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 'datetime' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>3</div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 uppercase text-xs tracking-widest">Escolha Data e Hora</h3>
                                        {selectedDate && selectedTime && (
                                            <p className="text-sm text-slate-500 font-medium">
                                                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {selectedTime}
                                            </p>
                                        )}
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
                                                <div 
                                                    key={i}
                                                    onClick={() => setSelectedDate(fullDate)}
                                                    className={`p-2 rounded-xl border-2 text-center cursor-pointer transition-all ${
                                                        isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-100 bg-white hover:border-slate-200'
                                                    }`}
                                                >
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                                                        {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                                                    </span>
                                                    <span className="block text-lg font-black">{d.getDate()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedDate && (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                            {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map(time => {
                                                const isSelected = selectedTime === time;
                                                return (
                                                    <div 
                                                        key={time}
                                                        onClick={() => setSelectedTime(time)}
                                                        className={`py-3 rounded-lg border-2 text-center text-sm font-bold cursor-pointer transition-all ${
                                                            isSelected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-white hover:border-slate-200 text-slate-700'
                                                        }`}
                                                    >
                                                        {time}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <button 
                                        disabled={!selectedDate || !selectedTime}
                                        onClick={() => setStep('summary')}
                                        className="w-full mt-4 bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all"
                                    >
                                        Continuar para Resumo
                                    </button>
                                </motion.div>
                            )}
                        </div>

                        {/* Resumo Final (Sempre Visível após seleções) */}
                        {selectedDate && selectedTime && selectedServiceIds.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white/80 backdrop-blur-md border-t border-slate-100 z-40"
                            >
                                <div className="max-w-3xl mx-auto flex items-center justify-between gap-6">
                                    <div className="hidden sm:block">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Resumo do Agendamento</p>
                                        <p className="text-sm text-slate-700 font-medium">
                                            {selectedServices.length} serviços • {totalDuration} min • {selectedTime}
                                        </p>
                                    </div>
                                    <div className="flex-1 sm:flex-none flex items-center justify-between sm:justify-end gap-6">
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total</p>
                                            <p className="text-2xl font-black text-slate-900 leading-none">{formatCurrencyBRL(subtotal)}</p>
                                        </div>
                                        <button 
                                            onClick={() => setStep('summary')}
                                            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                                        >
                                            Confirmar Agendamento
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer de Créditos */}
            <footer className="max-w-3xl mx-auto px-4 py-12 text-center border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
                    Crafted with precision by Insight Barber
                </p>
            </footer>
        </div>
    );
};

        e.preventDefault(); 
        
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.birthDate) {
            alert('Por favor, preencha todos os seus dados, incluindo a data de nascimento.');
            return;
        }
        
        setLoading(true);
        setError(null);

        let finalProId = selectedProId;

        // 1. AUTOMATIC ASSIGNMENT IF "NO PREFERENCE"
        if (!finalProId) {
            console.log('Iniciando atribuição automática para "Sem preferência"...');
            const { timeToMinutes, getDayName } = await import('../../utils/dateHelpers');
            const dayName = getDayName(selectedDate);
            const timeMinutes = timeToMinutes(selectedTime);
            const serviceEndTime = timeMinutes + totalDuration;

            // Filter professionals available at this specific time
            const availablePros = professionals.filter(pro => {
                const schedule = pro.workSchedule ? pro.workSchedule[dayName] : null;

                // Check Working Hours
                if (!schedule || !schedule.active) return false;

                const workStart = timeToMinutes(schedule.start);
                const workEnd = timeToMinutes(schedule.end);
                const lunchStart = timeToMinutes(schedule.lunchStart);
                const lunchEnd = timeToMinutes(schedule.lunchEnd);

                if (timeMinutes < workStart || serviceEndTime > workEnd) return false;
                if (timeMinutes < lunchEnd && serviceEndTime > lunchStart) return false;

                // Check Blocked Slots
                const proBlocks = blockedSlots.filter(b => b.professionalId === pro.id && b.date === selectedDate);
                for (const block of proBlocks) {
                    const blockStart = timeToMinutes(block.startTime);
                    const blockEnd = timeToMinutes(block.endTime);
                    if (
                        (timeMinutes >= blockStart && timeMinutes < blockEnd) || 
                        (serviceEndTime > blockStart && serviceEndTime <= blockEnd) || 
                        (timeMinutes <= blockStart && serviceEndTime >= blockEnd)
                    ) return false;
                }

                // Check Appointment Conflicts
                const proAppts = appointments.filter(a => a.professionalId === pro.id && a.date === selectedDate && a.status !== 'cancelled' && a.status !== 'noshow');
                for (const apt of proAppts) {
                    const aptStart = timeToMinutes(apt.time);
                    // Calculate actual duration of the existing appointment
                    const aptDuration = services
                        .filter(s => apt.serviceIds.includes(s.id))
                        .reduce((acc, s) => acc + s.duration, 0) || 45; // Fallback to 45 if no services found
                    
                    const aptEnd = aptStart + aptDuration;
                    if (timeMinutes < aptEnd && serviceEndTime > aptStart) return false;
                }

                return true;
            });

            console.log(`Profissionais disponíveis encontrados: ${availablePros.length}`);

            if (availablePros.length > 0) {
                // 3. PRIORITY: Pick the one with FEWEST appointments for that day
                availablePros.sort((a, b) => {
                    const countA = appointments.filter(apt => apt.professionalId === a.id && apt.date === selectedDate).length;
                    const countB = appointments.filter(apt => apt.professionalId === b.id && apt.date === selectedDate).length;
                    return countA - countB;
                });
                finalProId = availablePros[0].id;
                console.log(`Profissional atribuído automaticamente: ${availablePros[0].name} (ID: ${finalProId})`);
                setSelectedProId(finalProId); // Update state for SuccessStep
            } else {
                console.warn('Nenhum profissional disponível encontrado na atribuição automática.');
                // This shouldn't happen if DateTimeStep logic is correct, but just in case
                setError('Não encontramos profissionais disponíveis para este horário. Por favor, escolha outro horário.');
                setLoading(false);
                return;
            }
        } else {
            console.log(`Profissional selecionado manualmente: ${professionals.find(p => p.id === finalProId)?.name} (ID: ${finalProId})`);
        }

        const appointment: Omit<Appointment, 'id' | 'createdAt' | 'shopId'> = {
            clientName: customerInfo.name,
            clientPhone: customerInfo.phone,
            clientBirthDate: customerInfo.birthDate,
            serviceIds: selectedServiceIds,
            professionalId: finalProId!,
            date: selectedDate,
            time: selectedTime,
            totalValue: total,
            couponCode: appliedCoupon || undefined,
            status: 'scheduled'
        };
        
        try {
            const result = await addAppointment(appointment);

            if (result.success) {
                // Disparar notificação de confirmação (WhatsApp)
                console.log("Agendamento concluído com sucesso. ID:", result.data?.id);
                if (result.data?.id) {
                    console.log("Disparando notificação de confirmação...");
                    fetch('/api/notify/confirmation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ appointmentId: result.data.id })
                    })
                    .then(async res => {
                        if (!res.ok) {
                            const text = await res.text();
                            throw new Error(`Erro HTTP ${res.status}: ${text.slice(0, 100)}`);
                        }
                        return res.json();
                    })
                    .then(data => console.log("Resposta da notificação:", data))
                    .catch(err => console.error("Erro ao disparar notificação:", err));
                }

                setStep('success');
            } else {
                setError(result.error || 'Erro ao agendar. Tente novamente.');
            }
        } catch (err) {
            console.error(err);
            setError('Ocorreu um erro inesperado. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setStep('home');
        setSelectedServiceIds([]);
        setSelectedProId(null);
        setSelectedDate('');
        setSelectedTime('');
        setCustomerInfo({ name: '', phone: '', birthDate: '' });
        setCouponCode('');
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setError(null);
    };

    return (
        <div className="min-h-screen transition-colors duration-500" style={{ backgroundColor: settings.backgroundColor || '#0f172a' }}>
            {(() => {
                switch(step) {
                    case 'home': 
                        return <HomeStep 
                            settings={settings} 
                            setStep={setStep} 
                            onAdminClick={onAdminClick} 
                            onProfileClick={() => setStep(currentClient ? 'profile' : 'login')}
                        />;
                    case 'login':
                        return <ClientLogin onBack={() => setStep('home')} />;
                    case 'profile':
                        return <ClientProfile onBack={() => setStep('home')} onLogout={() => { logoutClient(); setStep('home'); }} />;
                    case 'services': 
                        return <ServicesStep 
                            services={services} 
                            selectedServiceIds={selectedServiceIds} 
                            setSelectedServiceIds={setSelectedServiceIds} 
                            setStep={setStep} 
                            settings={settings} 
                            total={total}
                        />;
                    case 'professional': 
                        return <ProfessionalStep 
                            professionals={professionals} 
                            selectedProId={selectedProId} 
                            setSelectedProId={setSelectedProId} 
                            setStep={setStep} 
                            settings={settings} 
                            total={total}
                        />;
                    case 'datetime': 
                        return <DateTimeStep 
                            selectedDate={selectedDate} 
                            setSelectedDate={setSelectedDate} 
                            selectedTime={selectedTime} 
                            setSelectedTime={setSelectedTime} 
                            setStep={setStep} 
                            settings={settings}
                            total={total}
                            selectedProId={selectedProId}
                            professionals={professionals}
                            appointments={appointments}
                            services={services}
                            totalDuration={totalDuration}
                        />;
                    case 'summary': 
                        return <SummaryStep 
                            customerInfo={customerInfo}
                            setCustomerInfo={setCustomerInfo}
                            couponCode={couponCode}
                            setCouponCode={setCouponCode}
                            appliedCoupon={appliedCoupon}
                            handleApplyCoupon={handleApplyCoupon}
                            settings={settings}
                            selectedServices={selectedServices}
                            selectedProId={selectedProId}
                            professionals={professionals}
                            selectedDate={selectedDate}
                            selectedTime={selectedTime}
                            subtotal={subtotal}
                            discountAmount={discountAmount}
                            total={total}
                            handleFinish={handleFinish}
                            setStep={setStep}
                            loading={loading}
                            error={error}
                        />;
                    case 'success': 
                        return <SuccessStep 
                            customerInfo={customerInfo}
                            selectedDate={selectedDate}
                            selectedTime={selectedTime}
                            selectedProId={selectedProId}
                            professionals={professionals}
                            onReset={handleReset}
                            settings={settings}
                        />;
                    default: return null;
                }
            })()}
        </div>
    );
};
