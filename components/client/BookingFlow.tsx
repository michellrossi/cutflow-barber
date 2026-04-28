import React, { useState, useEffect, useRef } from 'react';
import { useShop, formatCurrencyBRL } from '../../store';
import {
    Scissors, Calendar, User, MapPin, ArrowLeft,
    MessageCircle, Clock, Star, History, ChevronRight,
    Instagram, Phone, Share2, ExternalLink, Check, Loader2,
    Shield, Award, Users, Facebook, Twitter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClientLogin } from './ClientLogin';
import { ClientProfile } from './ClientProfile';

// Tipagem dos passos
type FlowStep = 'landing' | 'services' | 'professional' | 'datetime' | 'login' | 'success' | 'profile';

export const BookingFlow: React.FC<{ onAdminClick: () => void }> = ({ onAdminClick }) => {
    const [step, setStep] = useState<FlowStep>('landing');
    const { settings, services, professionals, currentClient, logoutClient, addAppointment } = useShop();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Estados do Agendamento (Mantendo sua lógica original)
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [selectedProId, setSelectedProId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Rola para o topo ao mudar de step
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    const handleBookingStart = () => {
        setStep('services');
    };

    const resetFlow = () => {
        setSelectedServiceIds([]);
        setSelectedProId(null);
        setSelectedDate('');
        setSelectedTime('');
        setStep('landing');
    };

    // Helper para as cores premium
    const brandColor = "#ff6a00";
    const darkBg = "#050505";

    return (
        <div className="min-h-screen text-white font-sans selection:bg-[#ff6a00] selection:text-white" style={{ backgroundColor: darkBg }}>
            <AnimatePresence mode="wait">

                {/* 1. HERO SECTION + LANDING (Step: landing) */}
                {step === 'landing' && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col"
                    >
                        {/* Hero Fullscreen */}
                        <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 z-0">
                                <div className="absolute inset-0 bg-black/70 z-10" />
                                <img
                                    src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop"
                                    className="w-full h-full object-cover grayscale-[0.5]"
                                    alt="Barbershop Atmosphere"
                                />
                            </div>

                            <div className="relative z-20 text-center px-6 max-w-5xl">
                                <motion.span
                                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                    className="text-[#ff6a00] font-black uppercase tracking-[0.3em] text-sm mb-4 block"
                                >
                                    Estilo & Tradição
                                </motion.span>
                                <motion.h1
                                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                                    className="text-5xl md:text-8xl font-black leading-none mb-8 italic uppercase"
                                >
                                    Cortes Precisos para o <br />
                                    <span className="text-[#ff6a00] not-italic">Homem Moderno</span>
                                </motion.h1>
                                <motion.p
                                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                                    className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-light"
                                >
                                    {settings.name} oferece uma experiência de cuidados masculinos de elite, unindo técnicas clássicas ao design urbano contemporâneo.
                                </motion.p>
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                                    className="flex flex-col md:flex-row gap-4 justify-center"
                                >
                                    <button
                                        onClick={handleBookingStart}
                                        className="bg-[#ff6a00] text-black px-10 py-5 rounded-none font-black uppercase tracking-widest hover:bg-white transition-all duration-300 transform hover:scale-105"
                                    >
                                        Agendar Agora
                                    </button>
                                    <button
                                        onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}
                                        className="border border-zinc-700 bg-white/5 backdrop-blur-sm px-10 py-5 rounded-none font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-300"
                                    >
                                        Ver Serviços
                                    </button>
                                </motion.div>
                            </div>

                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-30">
                                <div className="w-px h-20 bg-gradient-to-b from-white to-transparent" />
                            </div>
                        </section>

                        {/* Section Sobre */}
                        <section className="py-24 px-6 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center border-b border-zinc-900">
                            <div className="relative group">
                                <div className="absolute -inset-4 border border-[#ff6a00]/30 translate-x-4 translate-y-4 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500" />
                                <img
                                    src="https://images.unsplash.com/photo-1621605815844-83581715654b?q=80&w=2070&auto=format&fit=crop"
                                    className="relative z-10 w-full aspect-[4/5] object-cover grayscale"
                                    alt="Master Barber"
                                />
                            </div>
                            <div className="space-y-8">
                                <h2 className="text-4xl font-black uppercase italic leading-tight">Onde a <span className="text-[#ff6a00]">Arte</span> encontra a lâmina.</h2>
                                <p className="text-gray-400 text-lg leading-relaxed font-light">
                                    Não somos apenas uma barbearia. Somos um refúgio para o homem que entende que sua imagem é sua assinatura. Localizado no coração da cidade, combinamos o ambiente industrial de luxo com o melhor serviço de barbearia de São Paulo.
                                </p>
                                <div className="grid grid-cols-2 gap-8">
                                    <div>
                                        <p className="text-4xl font-black text-[#ff6a00]">15+</p>
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mt-1">Barbeiros Elite</p>
                                    </div>
                                    <div>
                                        <p className="text-4xl font-black text-[#ff6a00]">10k+</p>
                                        <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mt-1">Clientes Satisfeitos</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section Serviços */}
                        <section id="services-section" className="py-24 px-6 max-w-7xl mx-auto w-full">
                            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                                <div>
                                    <span className="text-[#ff6a00] font-bold uppercase text-xs tracking-widest mb-2 block">Menu de Luxo</span>
                                    <h2 className="text-5xl font-black uppercase italic">Nossos Serviços</h2>
                                </div>
                                <p className="text-zinc-500 text-sm max-w-xs font-medium">Técnicas exclusivas desenvolvidas para realçar sua melhor versão.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {services.map((service) => (
                                    <div
                                        key={service.id}
                                        className="group p-8 border border-zinc-800 bg-zinc-900/20 hover:border-[#ff6a00]/50 transition-all duration-500 relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff6a00]/5 rounded-full blur-3xl group-hover:bg-[#ff6a00]/20 transition-all" />
                                        <div className="relative z-10">
                                            <Scissors className="text-[#ff6a00] mb-6 group-hover:scale-110 transition-transform duration-500" size={32} />
                                            <h3 className="text-xl font-bold uppercase mb-2">{service.name}</h3>
                                            <p className="text-zinc-500 text-sm mb-6 line-clamp-2">{service.description || 'Acabamento premium com toalha quente e massagem facial.'}</p>
                                            <div className="flex items-center justify-between mt-auto">
                                                <span className="text-2xl font-black text-white">{formatCurrencyBRL(service.price)}</span>
                                                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                                                    <Clock size={12} /> {service.duration} min
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* CTA Bloco Laranja */}
                        <section className="bg-[#ff6a00] py-20 px-6 text-center">
                            <div className="max-w-4xl mx-auto">
                                <h2 className="text-black text-4xl md:text-6xl font-black uppercase italic leading-none mb-8">
                                    Pronto para sua <br /> Transformação?
                                </h2>
                                <button
                                    onClick={handleBookingStart}
                                    className="bg-black text-white px-12 py-5 rounded-none font-black uppercase tracking-widest hover:bg-zinc-900 transition-all duration-300"
                                >
                                    Reservar Agora
                                </button>
                            </div>
                        </section>

                        {/* Footer */}
                        <footer className="py-20 px-6 border-t border-zinc-900">
                            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                                <div className="col-span-1 md:col-span-2">
                                    <h2 className="text-3xl font-black italic uppercase mb-6">{settings.name}</h2>
                                    <p className="text-zinc-500 font-light text-lg max-w-sm mb-8">
                                        Redefinindo o padrão de cuidados masculinos com excelência e precisão industrial.
                                    </p>
                                    <div className="flex gap-4">
                                        <div className="p-3 border border-zinc-800 hover:border-[#ff6a00] transition-colors"><Instagram size={20} /></div>
                                        <div className="p-3 border border-zinc-800 hover:border-[#ff6a00] transition-colors"><Facebook size={20} /></div>
                                        <div className="p-3 border border-zinc-800 hover:border-[#ff6a00] transition-colors"><Twitter size={20} /></div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold uppercase tracking-widest text-xs text-[#ff6a00] mb-6">Localização</h4>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        {settings.address || 'Rua Industrial, 450 - Centro, SP'}<br />
                                        (11) 99999-9999
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-bold uppercase tracking-widest text-xs text-[#ff6a00] mb-6">Horários</h4>
                                    <ul className="text-zinc-400 text-sm space-y-2">
                                        <li className="flex justify-between"><span>Seg - Sex:</span> <span>09:00 - 20:00</span></li>
                                        <li className="flex justify-between"><span>Sábado:</span> <span>09:00 - 18:00</span></li>
                                        <li className="flex justify-between"><span>Domingo:</span> <span className="text-[#ff6a00]">Fechado</span></li>
                                    </ul>
                                </div>
                            </div>
                            <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
                                <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">© 2026 {settings.name}. All Rights Reserved.</p>
                                <button onClick={onAdminClick} className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest hover:text-[#ff6a00] transition-colors">Acesso Administrativo</button>
                            </div>
                        </footer>
                    </motion.div>
                )}

                {/* 2. WIZARD DE AGENDAMENTO (Steps: services, professional, datetime, etc) */}
                {step !== 'landing' && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="max-w-5xl mx-auto px-6 py-12 min-h-screen"
                    >
                        {/* Wizard Header */}
                        <div className="flex items-center justify-between mb-12">
                            <button
                                onClick={() => step === 'services' ? setStep('landing') : setStep('services')}
                                className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors uppercase font-black text-xs tracking-widest"
                            >
                                <ArrowLeft size={18} /> Voltar
                            </button>
                            <div className="flex gap-2">
                                {['services', 'professional', 'datetime', 'success'].map((s, idx) => (
                                    <div
                                        key={s}
                                        className={`h-1 w-8 md:w-16 transition-all duration-500 ${step === s ? 'bg-[#ff6a00]' : 'bg-zinc-800'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Step: Seleção de Serviços */}
                        {step === 'services' && (
                            <div className="space-y-8">
                                <div className="text-center md:text-left">
                                    <h2 className="text-4xl md:text-6xl font-black uppercase italic">Escolha o <span className="text-[#ff6a00]">Serviço</span></h2>
                                    <p className="text-zinc-500 mt-4 uppercase tracking-widest font-bold text-xs">Selecione um ou mais procedimentos</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {services.map((service) => {
                                        const isSelected = selectedServiceIds.includes(service.id);
                                        return (
                                            <button
                                                key={service.id}
                                                onClick={() => {
                                                    setSelectedServiceIds(prev =>
                                                        prev.includes(service.id) ? prev.filter(id => id !== service.id) : [...prev, service.id]
                                                    );
                                                }}
                                                className={`flex items-center justify-between p-6 border transition-all duration-300 text-left relative overflow-hidden group ${isSelected ? 'border-[#ff6a00] bg-zinc-900/50' : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-700'
                                                    }`}
                                            >
                                                {isSelected && <div className="absolute top-0 right-0 w-2 h-full bg-[#ff6a00]" />}
                                                <div className="space-y-1">
                                                    <p className={`text-sm font-black uppercase tracking-widest transition-colors ${isSelected ? 'text-[#ff6a00]' : 'text-white'}`}>
                                                        {service.name}
                                                    </p>
                                                    <p className="text-zinc-500 text-xs font-medium">{service.duration} min • Toalha Quente</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black">{formatCurrencyBRL(service.price)}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedServiceIds.length > 0 && (
                                    <motion.button
                                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                        onClick={() => setStep('professional')}
                                        className="w-full bg-[#ff6a00] text-black py-6 font-black uppercase tracking-widest hover:bg-white transition-all"
                                    >
                                        Próximo Passo <ChevronRight className="inline ml-2" />
                                    </motion.button>
                                )}
                            </div>
                        )}

                        {/* Step: Profissional */}
                        {step === 'professional' && (
                            <div className="space-y-10">
                                <h2 className="text-4xl md:text-6xl font-black uppercase italic text-center md:text-left">O <span className="text-[#ff6a00]">Barbeiro</span></h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {professionals.map((pro) => (
                                        <button
                                            key={pro.id}
                                            onClick={() => {
                                                setSelectedProId(pro.id);
                                                setStep('datetime');
                                            }}
                                            className={`group flex flex-col items-center p-8 border transition-all duration-500 ${selectedProId === pro.id ? 'border-[#ff6a00] bg-zinc-900/50' : 'border-zinc-800 bg-zinc-900/20 hover:border-zinc-600'
                                                }`}
                                        >
                                            <div className="relative mb-6">
                                                <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700 group-hover:border-[#ff6a00] transition-colors">
                                                    <img
                                                        src={pro.photo_url || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=1974&auto=format&fit=crop"}
                                                        className="w-full h-full object-cover"
                                                        alt={pro.name}
                                                    />
                                                </div>
                                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#ff6a00] text-black text-[8px] font-black uppercase px-2 py-0.5 whitespace-nowrap">
                                                    Master Barber
                                                </div>
                                            </div>
                                            <h3 className="font-black uppercase tracking-widest text-sm">{pro.name}</h3>
                                            <p className="text-zinc-600 text-[10px] mt-2 uppercase font-bold">Especialista em degrade</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step: Data e Hora */}
                        {step === 'datetime' && (
                            <div className="space-y-10">
                                <h2 className="text-4xl md:text-6xl font-black uppercase italic">Sua <span className="text-[#ff6a00]">Agenda</span></h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    {/* Calendário Simplificado Premium */}
                                    <div className="space-y-6">
                                        <p className="text-zinc-500 uppercase tracking-widest font-black text-xs">Selecione o Dia</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {/* Exemplo de datas (Ideal usar date-fns aqui conforme sua lógica atual) */}
                                            {[...Array(8)].map((_, i) => {
                                                const d = new Date(); d.setDate(d.getDate() + i);
                                                const dateStr = d.toISOString().split('T')[0];
                                                const isSelected = selectedDate === dateStr;
                                                return (
                                                    <button
                                                        key={dateStr}
                                                        onClick={() => setSelectedDate(dateStr)}
                                                        className={`p-4 border text-center transition-all ${isSelected ? 'border-[#ff6a00] bg-[#ff6a00] text-black' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/30'
                                                            }`}
                                                    >
                                                        <span className="block text-[10px] font-black uppercase opacity-70">
                                                            {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                                                        </span>
                                                        <span className="text-xl font-black leading-none">{d.getDate()}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Grid de Horários */}
                                    <div className="space-y-6">
                                        <p className="text-zinc-500 uppercase tracking-widest font-black text-xs">Horários Disponíveis</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((time) => (
                                                <button
                                                    key={time}
                                                    onClick={() => setSelectedTime(time)}
                                                    className={`py-4 border font-black text-sm transition-all ${selectedTime === time ? 'border-[#ff6a00] bg-zinc-900 text-[#ff6a00]' : 'border-zinc-800 bg-zinc-900/10 hover:border-zinc-600'
                                                        }`}
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-10 border-t border-zinc-900">
                                    <button
                                        disabled={!selectedDate || !selectedTime || loading}
                                        onClick={() => {
                                            if (!currentClient) setStep('login');
                                            else setStep('success'); // Aqui entra sua lógica de addAppointment
                                        }}
                                        className="w-full bg-[#ff6a00] text-black py-6 font-black uppercase tracking-widest hover:bg-white disabled:opacity-30 transition-all flex items-center justify-center gap-3"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : "Confirmar Reserva"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step: Login (Estilo Glassmorphism Dark) */}
                        {step === 'login' && (
                            <div className="max-w-md mx-auto pt-20">
                                <div className="p-8 border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl">
                                    <h3 className="text-3xl font-black uppercase italic mb-6 text-center">Identifique-se</h3>
                                    <p className="text-zinc-500 text-sm text-center mb-8">Utilizamos o WhatsApp para confirmar seu agendamento e gerenciar seu histórico.</p>
                                    <ClientLogin onLoginSuccess={() => setStep('datetime')} />
                                </div>
                            </div>
                        )}

                        {/* Step: Sucesso */}
                        {step === 'success' && (
                            <div className="text-center py-20 space-y-8">
                                <div className="w-24 h-24 bg-[#ff6a00] text-black rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(255,106,0,0.3)]">
                                    <Check size={48} strokeWidth={4} />
                                </div>
                                <h2 className="text-5xl font-black uppercase italic leading-none">Reserva Confirmada!</h2>
                                <p className="text-zinc-500 max-w-sm mx-auto font-light">Tudo pronto. Enviamos os detalhes para o seu WhatsApp. Te esperamos na cadeira!</p>
                                <button
                                    onClick={resetFlow}
                                    className="inline-block mt-10 border border-[#ff6a00] text-[#ff6a00] px-12 py-4 font-black uppercase tracking-widest hover:bg-[#ff6a00] hover:text-black transition-all"
                                >
                                    Voltar ao Início
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};