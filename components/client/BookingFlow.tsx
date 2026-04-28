import React, { useState, useEffect } from 'react';
import { useShop } from '../../store';
import { Appointment } from '../../types';
import {
    Scissors, Calendar, User, MapPin, ArrowLeft,
    Check, History, ChevronDown, Loader2, Clock, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientLogin } from './ClientLogin';
import { ClientProfile } from './ClientProfile';
import { formatCurrencyBRL } from '../../store';

type Step = 'welcome' | 'services' | 'professional' | 'datetime' | 'success' | 'login' | 'profile';

export const BookingFlow: React.FC<{ onAdminClick: () => void }> = ({ onAdminClick }) => {
    const [step, setStep] = useState<Step>('welcome');
    const {
        services, professionals, settings,
        addAppointment, currentClient
    } = useShop();

    // Estados do Agendamento
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [selectedProId, setSelectedProId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [activeCategory, setActiveCategory] = useState<string>('Todos');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Cálculos Derivados
    const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
    const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const categories = ['Todos', ...Array.from(new Set(services.map(s => s.category || 'Geral'))).sort()];
    const filteredServices = activeCategory === 'Todos' ? services : services.filter(s => s.category === activeCategory);

    const toggleService = (id: string) => {
        setSelectedServiceIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleFinish = async () => {
        if (!currentClient) { setStep('login'); return; }
        setLoading(true);
        setError(null);

        const appointment: Omit<Appointment, 'id' | 'createdAt' | 'shopId'> = {
            clientName: currentClient.name,
            clientPhone: currentClient.phone,
            serviceIds: selectedServiceIds,
            professionalId: selectedProId!,
            date: selectedDate,
            time: selectedTime,
            totalValue: totalPrice,
            status: 'scheduled'
        };

        try {
            const result = await addAppointment(appointment);
            if (result.success) {
                setStep('success');
            } else {
                setError(result.error || 'Erro ao agendar.');
            }
        } catch (err) {
            setError('Erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'login') return <ClientLogin onBack={() => setStep('welcome')} />;
    if (step === 'profile') return <ClientProfile onBack={() => setStep('welcome')} />;
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full bg-white rounded-[2rem] p-10 text-center shadow-xl border border-slate-100">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check size={40} strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Tudo certo!</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">Seu horário foi reservado. Você receberá os detalhes no seu WhatsApp.</p>
                    <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                        Voltar para o Início
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <h1 className="text-lg font-bold tracking-tight text-slate-900">{settings.name || "Insight Barber"}</h1>
                    <button onClick={() => currentClient ? setStep('profile') : setStep('login')} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors">
                        <User size={20} />
                    </button>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
                {/* Card de Boas-vindas / Endereço */}
                {step === 'welcome' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 space-y-6 relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Agende seu<br />horário</h2>
                                <div className="flex items-start gap-3 text-slate-500 mt-4">
                                    <MapPin size={18} className="mt-1 text-slate-400 shrink-0" />
                                    <p className="text-sm font-medium leading-relaxed">
                                        {settings.address || "Rua José de Alencar, 123 - Centro"}
                                    </p>
                                </div>
                                <div className="pt-6 flex flex-col gap-3">
                                    <button onClick={() => setStep('services')} className="bg-slate-900 text-white py-4 px-8 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-slate-200 hover:scale-[1.02] transition-transform">
                                        <Calendar size={20} /> Começar Agendamento
                                    </button>
                                    <button onClick={() => currentClient ? setStep('profile') : setStep('login')} className="bg-white text-slate-600 border border-slate-200 py-4 px-8 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors">
                                        <History size={20} /> Ver Meus Agendamentos
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step !== 'welcome' && (
                    <div className="space-y-4">
                        {/* Passo 1: Serviços */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <button
                                onClick={() => setStep('services')}
                                className="w-full px-6 py-5 flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 'services' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serviços</p>
                                        <h3 className="font-bold text-slate-900">
                                            {selectedServices.length > 0 ? `${selectedServices.length} selecionado(s)` : "O que vamos fazer?"}
                                        </h3>
                                    </div>
                                </div>
                                {step !== 'services' && <div className="text-slate-900 font-bold text-sm">{formatCurrencyBRL(totalPrice)}</div>}
                            </button>

                            <AnimatePresence>
                                {step === 'services' && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-6 pb-6 overflow-hidden">
                                        {/* Filtro de Categorias */}
                                        <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setActiveCategory(cat)}
                                                    className={`px-5 py-2 rounded-full text-xs font-bold transition-all border ${activeCategory === cat ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Lista de Serviços */}
                                        <div className="space-y-3">
                                            {filteredServices.map(svc => {
                                                const isSelected = selectedServiceIds.includes(svc.id);
                                                return (
                                                    <div
                                                        key={svc.id}
                                                        onClick={() => toggleService(svc.id)}
                                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                                                                <Scissors size={18} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 text-sm">{svc.name}</h4>
                                                                <p className="text-xs text-slate-400">{svc.duration} min</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold text-slate-900 text-sm">{formatCurrencyBRL(svc.price)}</p>
                                                            {isSelected && <Check size={16} className="ml-auto mt-1 text-slate-900" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button
                                            disabled={selectedServiceIds.length === 0}
                                            onClick={() => setStep('professional')}
                                            className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-lg shadow-slate-200 disabled:opacity-50"
                                        >
                                            Próximo Passo
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Passo 2: Profissional */}
                        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden ${selectedServiceIds.length === 0 ? 'opacity-40' : ''}`}>
                            <button
                                onClick={() => selectedServiceIds.length > 0 && setStep('professional')}
                                className="w-full px-6 py-5 flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 'professional' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profissional</p>
                                        <h3 className="font-bold text-slate-900">
                                            {selectedProId ? professionals.find(p => p.id === selectedProId)?.name : "Quem vai te atender?"}
                                        </h3>
                                    </div>
                                </div>
                                {step !== 'professional' && <ChevronDown size={18} className="text-slate-300" />}
                            </button>

                            <AnimatePresence>
                                {step === 'professional' && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-6 pb-6 overflow-hidden">
                                        <div className="grid grid-cols-1 gap-3">
                                            {[{ id: null, name: 'Sem preferência', role: 'Qualquer Barbeiro' }, ...professionals].map(pro => {
                                                const isSelected = selectedProId === pro.id;
                                                return (
                                                    <div
                                                        key={pro.id ?? 'any'}
                                                        onClick={() => setSelectedProId(pro.id)}
                                                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-50 bg-slate-50/50'}`}
                                                    >
                                                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 overflow-hidden">
                                                            {isSelected ? <Check size={20} className="text-slate-900" /> : <User size={20} />}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-sm">{pro.name}</h4>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{pro.role}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button onClick={() => setStep('datetime')} className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold">
                                            Escolher Horário
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Passo 3: Data e Hora */}
                        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden ${!selectedProId && selectedProId !== null && step !== 'professional' ? 'opacity-40' : ''}`}>
                            <button
                                onClick={() => selectedProId !== undefined && setStep('datetime')}
                                className="w-full px-6 py-5 flex items-center justify-between text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 'datetime' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>3</div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data e Hora</p>
                                        <h3 className="font-bold text-slate-900">
                                            {selectedDate ? `${selectedDate} às ${selectedTime || '...'}` : "Quando você vem?"}
                                        </h3>
                                    </div>
                                </div>
                            </button>

                            <AnimatePresence>
                                {step === 'datetime' && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="px-6 pb-6 overflow-hidden space-y-6">
                                        {/* Calendário Horizontal Simplificado */}
                                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                            {[...Array(14)].map((_, i) => {
                                                const d = new Date(); d.setDate(d.getDate() + i);
                                                const dateKey = d.toISOString().split('T')[0];
                                                const isSelected = selectedDate === dateKey;
                                                return (
                                                    <button
                                                        key={dateKey}
                                                        onClick={() => setSelectedDate(dateKey)}
                                                        className={`min-w-[60px] p-3 rounded-2xl border-2 transition-all flex flex-col items-center ${isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-md' : 'border-slate-50 bg-slate-50/50'}`}
                                                    >
                                                        <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                                                        <span className="text-lg font-black">{d.getDate()}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Grade de Horários */}
                                        {selectedDate && (
                                            <div className="grid grid-cols-3 gap-2">
                                                {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'].map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setSelectedTime(t)}
                                                        className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${selectedTime === t ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-50 bg-slate-50/50'}`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <button
                                            disabled={!selectedTime || loading}
                                            onClick={handleFinish}
                                            className="w-full mt-4 bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : "Confirmar Agendamento"}
                                        </button>

                                        {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};