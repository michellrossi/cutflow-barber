import React, { useState, useEffect } from 'react';
import { useShop } from '../../store';
import { Appointment } from '../../types';
import { HomeStep } from './steps/HomeStep';
import { ServicesStep } from './steps/ServicesStep';
import { ProfessionalStep } from './steps/ProfessionalStep';
import { DateTimeStep } from './steps/DateTimeStep';
import { SummaryStep } from './steps/SummaryStep';
import { SuccessStep } from './steps/SuccessStep';
import { ClientLogin } from './ClientLogin';
import { ClientProfile } from './ClientProfile';
import {
    Scissors, Calendar, User, MapPin, Clock, ArrowLeft,
    ChevronRight, Check, Star, LogOut, History, Smartphone,
    ChevronDown, CreditCard, ChevronUp, Map, Instagram, Facebook,
    Twitter, Phone, Award, Users, ShieldCheck, Loader2, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrencyBRL } from '../../store/helpers';

type Step = 'home' | 'services' | 'professional' | 'datetime' | 'summary' | 'success' | 'login' | 'profile';

export const BookingFlow: React.FC<{ onAdminClick: () => void }> = ({ onAdminClick }) => {
    const [step, setStep] = useState<Step>('home');
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
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', birthDate: '' });
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
    const [discountAmount, setDiscountAmount] = useState(0);

    // Server feedback
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helpers
    const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
    const subtotal = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
    const total = Math.max(0, subtotal - discountAmount);

    // Mapeamento de cores premium para os sub-componentes (steps)
    const premiumTheme = {
        ...settings,
        backgroundColor: '#050505',
        cardBackgroundColor: '#111111',
        borderColor: '#222222',
        titleColor: '#ffffff',
        textColor: '#b3b3b3',
        primaryColor: '#ff6a00',
        accentColor: '#ff6a00',
        buttonTextColor: '#000000'
    };

    // Initial load logic
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        if (view === 'profile' && currentClient) setStep('profile');
    }, [currentClient]);

    // Auto-fill customer info if logged in
    useEffect(() => {
        if (currentClient) {
            setCustomerInfo({
                name: currentClient.name || '',
                phone: currentClient.phone || '',
                birthDate: currentClient.birthDate ? currentClient.birthDate.split('T')[0] : ''
            });
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

    const handleApplyCoupon = () => {
        const coupon = coupons.find(c => c.code === couponCode.toUpperCase() && c.active);
        if (coupon) {
            if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
                alert('Este cupom atingiu o limite máximo de usos.');
                return;
            }
            let discount = coupon.type === 'percentage' ? subtotal * (coupon.value / 100) : coupon.value;
            setDiscountAmount(discount);
            setAppliedCoupon(coupon.code);
        } else {
            alert('Cupom inválido ou expirado');
            setDiscountAmount(0);
            setAppliedCoupon(null);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponCode('');
    };

    const handleFinish = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.birthDate) {
            alert('Por favor, preencha todos os seus dados.');
            return;
        }

        setLoading(true);
        setError(null);

        const timeToMins = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        const targetTime = timeToMins(selectedTime);
        const serviceEndTime = targetTime + totalDuration;

        // Verifica conflito do CLIENTE
        const clientAppts = appointments.filter(a => 
            (a.clientPhone === customerInfo.phone || (currentClient && a.clientId === currentClient.id)) && 
            a.date === selectedDate && 
            a.status !== 'cancelled' && 
            a.status !== 'noshow'
        );

        let clientHasConflict = false;
        for (const apt of clientAppts) {
            const aptStart = timeToMins(apt.time);
            const aptDuration = services.filter(s => apt.serviceIds.includes(s.id)).reduce((acc, s) => acc + s.duration, 0) || 45;
            const aptEnd = aptStart + aptDuration;
            if (targetTime < aptEnd && serviceEndTime > aptStart) {
                clientHasConflict = true; break;
            }
        }

        if (clientHasConflict) {
            setError('Você já possui um agendamento neste horário.');
            setLoading(false);
            return;
        }

        let finalProId = selectedProId;

        // Auto-atribuir profissional se "Sem preferência"
        if (!finalProId) {
            const getDayN = (d: string) => {
                const date = new Date(d + 'T12:00:00');
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                return days[date.getDay()];
            };

            const dayName = getDayN(selectedDate);

            for (const pro of professionals) {
                const schedule = pro.workSchedule ? (pro.workSchedule as any)[dayName] : null;
                if (!schedule || !schedule.active) continue;

                const workStart = timeToMins(schedule.start);
                const workEnd = timeToMins(schedule.end);
                const lunchStart = timeToMins(schedule.lunchStart);
                const lunchEnd = timeToMins(schedule.lunchEnd);

                if (targetTime < workStart || serviceEndTime > workEnd) continue;
                if (targetTime < lunchEnd && serviceEndTime > lunchStart) continue;

                // Check blocks
                const proBlocks = blockedSlots.filter(b => b.professionalId === pro.id && b.date === selectedDate);
                let isBlocked = false;
                for (const block of proBlocks) {
                    if ((targetTime >= timeToMins(block.startTime) && targetTime < timeToMins(block.endTime)) || 
                        (serviceEndTime > timeToMins(block.startTime) && serviceEndTime <= timeToMins(block.endTime)) ||
                        (targetTime <= timeToMins(block.startTime) && serviceEndTime >= timeToMins(block.endTime))) {
                        isBlocked = true; break;
                    }
                }
                if (isBlocked) continue;

                // Check appointments
                const proAppts = appointments.filter(a => a.professionalId === pro.id && a.date === selectedDate && a.status !== 'cancelled' && a.status !== 'noshow');
                let hasConflict = false;
                for (const apt of proAppts) {
                    const aptStart = timeToMins(apt.time);
                    const aptDuration = services.filter(s => apt.serviceIds.includes(s.id)).reduce((acc, s) => acc + s.duration, 0) || 45;
                    const aptEnd = aptStart + aptDuration;
                    if (targetTime < aptEnd && serviceEndTime > aptStart) {
                        hasConflict = true; break;
                    }
                }

                if (!hasConflict) {
                    finalProId = pro.id;
                    break;
                }
            }
        }

        if (!finalProId) {
            setError('Nenhum profissional disponível para este horário. Por favor, escolha outro horário ou profissional.');
            setLoading(false);
            return;
        }

        const appointment: any = {
            clientId: currentClient?.id,
            clientName: customerInfo.name,
            clientPhone: customerInfo.phone,
            clientBirthDate: customerInfo.birthDate,
            serviceIds: selectedServiceIds,
            professionalId: finalProId, 
            date: selectedDate,
            time: selectedTime,
            totalValue: total,
            couponCode: appliedCoupon || undefined,
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
            setError('Ocorreu um erro inesperado.');
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
        setCouponCode('');
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setError(null);
    };

    // --------------------------------------------------------------------------------
    // PREMIUM COMPONENTS
    // --------------------------------------------------------------------------------

    const Navbar = () => (
        <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#050505]/95 backdrop-blur-xl border-b border-white/10 px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Lado Esquerdo: Logo e Nome */}
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black flex items-center justify-center rounded-sm border border-white/10">
                        <Scissors size={20} className="text-[#ff6a00]" />
                    </div>
                    <span className="text-lg font-black text-white uppercase tracking-tighter hidden sm:block">
                        {settings.name || "Insight Barber"}
                    </span>
                </div>

                {/* Centro: Menu Minimalista */}
                <div className="hidden lg:flex items-center gap-8">
                    <a href="#sobre-nós" className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] hover:text-[#ff6a00] transition-colors">Sobre nós</a>
                    <a href="#serviços" className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] hover:text-[#ff6a00] transition-colors">Serviços</a>
                    <a href="#barbeiros" className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] hover:text-[#ff6a00] transition-colors">Barbeiros</a>
                    <a href="#redes-sociais" className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] hover:text-[#ff6a00] transition-colors">Redes Sociais</a>
                    <a href="#localização" className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] hover:text-[#ff6a00] transition-colors">Localização</a>
                </div>

                {/* Lado Direito: Botão Histórico */}
                <div>
                    <button
                        onClick={handleHistoryClick}
                        className="px-6 py-2.5 bg-[#ff6a00] text-black font-black text-[10px] uppercase tracking-widest rounded-sm hover:bg-[#e55f00] transition-all flex items-center gap-2"
                    >
                        <History size={14} /> Acessar Histórico
                    </button>
                </div>
            </div>
        </nav>
    );

    const HeroSection = () => (
        <section className="relative h-[90vh] flex items-center overflow-hidden">
            {/* Fundo com Imagem e Overlay */}
            <div className="absolute inset-0 z-0">
                <img
                    src="https://iili.io/BiYGwMB.md.jpg"
                    alt="Premium Barbershop Interior"
                    className="w-full h-full object-cover brightness-[0.38] contrast-125 saturate-75 scale-105"
                />
                <div className="absolute inset-0 bg-black/82"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/65"></div>
            </div>

            {/* Conteúdo Alinhado à Esquerda */}
            <div className="relative z-10 container mx-auto px-6 md:px-12 lg:px-24">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-4xl"
                >
                    <span className="inline-block px-4 py-1.5 bg-[#ff6a00] text-black text-[10px] font-black uppercase tracking-[0.2em] mb-8 rounded-sm">
                        AGENDAMENTO PREMIUM
                    </span>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] mb-8 tracking-tighter uppercase">
                        SEU ESTILO <br />
                        <span className="text-[#ff6a00] italic">NOSSA MISSÃO</span>
                    </h1>

                    <p className="text-slate-300 text-lg md:text-xl mb-12 font-medium">
                        Aqui, sua imagem é tratada como prioridade absoluta.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <button
                            onClick={handleAgendarClick}
                            className="group w-full sm:w-auto px-10 py-5 bg-[#ff6a00] text-black font-black text-xs uppercase tracking-[0.2em] rounded-sm transition-all hover:bg-[#e55f00] flex items-center justify-center gap-3"
                        >
                            <Calendar size={18} /> AGENDAR AGORA
                        </button>
                        <a
                            href="#serviços"
                            className="w-full sm:w-auto px-10 py-5 bg-transparent border-2 border-white text-white font-black text-xs uppercase tracking-[0.2em] rounded-sm hover:bg-white hover:text-black transition-all text-center"
                        >
                            VER SERVIÇOS
                        </a>
                    </div>
                </motion.div>
            </div>
        </section>
    );

    const AboutSection = () => (
        <section id="sobre-nós" className="relative py-24 bg-[#050505] overflow-hidden">
            <div className="absolute inset-0 z-0 opacity-20">
                <img src="https://iili.io/Bi588ss.md.jpg" alt="Background" className="w-full h-full object-cover grayscale" />
                <div className="absolute inset-0 bg-black/90"></div>
            </div>
            <div className="relative z-10 container mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="w-full lg:w-1/2 relative">
                        <div className="absolute -top-4 -left-4 w-24 h-24 border-t-2 border-l-2 border-[#ff6a00] z-10"></div>
                        <img
                            src="https://iili.io/Bi588ss.md.jpg"
                            alt="Barbershop"
                            className="rounded-sm shadow-2xl grayscale hover:grayscale-0 transition-all duration-700 aspect-video object-cover"
                        />
                        <div className="absolute -bottom-10 -right-10 bg-[#ff6a00] p-8 hidden md:block">
                            <p className="text-black font-black text-4xl leading-none">EXCELÊNCIA</p>
                            <p className="text-black/70 font-bold text-xs uppercase tracking-widest mt-1">Garantida</p>
                        </div>
                    </div>
                    <div className="w-full lg:w-1/2 space-y-8">
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none uppercase text-left">
                            SOBRE <span className="text-[#ff6a00]">NÓS</span>
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed italic text-left">
                            "{settings.about_us || "Elevando o padrão da barbearia urbana. Excelência técnica e ambiente exclusivo para o homem de hoje."}"
                        </p>
                        <div className="grid grid-cols-2 gap-8 pt-6">
                            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-sm">
                                <p className="text-[#ff6a00] text-4xl font-black">{professionals.length}+</p>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Especialistas</p>
                            </div>
                            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-sm">
                                <p className="text-[#ff6a00] text-4xl font-black">100%</p>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Compromisso</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );

    const ServicesSection = () => (
        <section id="serviços" className="py-24 bg-[#050505]">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight uppercase">NOSSOS SERVIÇOS</h2>
                    <div className="w-20 h-1 bg-[#ff6a00] mx-auto"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {services.map((service) => (
                        <motion.div
                            key={service.id}
                            whileHover={{ y: -10 }}
                            className="group relative overflow-hidden bg-black border border-white/5 rounded-sm transition-all duration-500"
                        >
                            <div className="aspect-[16/10] w-full overflow-hidden relative bg-white/5">
                                {service.imageUrl ? (
                                    <img
                                        src={service.imageUrl}
                                        alt={service.name}
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#ff6a00]/40">
                                        <Scissors size={48} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                            </div>

                            <div className="p-8 relative text-left">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-2 bg-[#ff6a00]/10 rounded-sm text-[#ff6a00]">
                                        <Scissors size={18} />
                                    </div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-wide group-hover:text-[#ff6a00] transition-colors">{service.name}</h3>
                                </div>
                                <p className="text-slate-500 text-sm mb-6 line-clamp-2 h-10">{service.description || 'Experiência premium de cuidados masculinos.'}</p>
                                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-t border-white/5 pt-6">
                                    <Clock size={14} className="text-[#ff6a00]" />
                                    <span>{service.duration} Minutos</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );

    const ProfessionalsSection = () => (
        <section id="barbeiros" className="py-24 bg-[#050505] border-t border-white/5">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight uppercase">MESTRES BARBEIROS</h2>
                    <div className="w-20 h-1 bg-[#ff6a00] mx-auto"></div>
                </div>

                <div className="flex flex-wrap justify-center gap-8">
                    {professionals.map((pro) => (
                        <motion.div
                            key={pro.id}
                            whileHover={{ y: -10 }}
                            className="group bg-white/[0.02] border border-white/5 rounded-sm p-6 text-center hover:border-[#ff6a00]/50 transition-all min-w-[240px]"
                        >
                            <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-[#ff6a00] transition-colors p-1">
                                {pro.photoUrl ? (
                                    <img src={pro.photoUrl} alt={pro.name} className="w-full h-full object-cover rounded-full grayscale group-hover:grayscale-0 transition-all" />
                                ) : (
                                    <div className="w-full h-full bg-white/5 rounded-full flex items-center justify-center text-slate-600">
                                        <User size={40} />
                                    </div>
                                )}
                            </div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">{pro.name}</h3>
                            <p className="text-[#ff6a00] text-[10px] font-black uppercase tracking-[0.2em]">{pro.role || 'Barbeiro'}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );

    const FinalCTA = () => (
        <section className="py-24 bg-[#ff6a00]">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-5xl md:text-7xl font-black text-black mb-8 tracking-tighter uppercase">PRONTO PARA SUA <br />TRANSFORMAÇÃO?</h2>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <button
                        onClick={handleAgendarClick}
                        className="px-12 py-5 bg-black text-[#ff6a00] font-black text-sm uppercase tracking-widest rounded-sm hover:bg-slate-900 transition-all shadow-2xl"
                    >
                        Reservar Agora
                    </button>
                    <button
                        onClick={handleHistoryClick}
                        className="px-12 py-5 bg-transparent border-2 border-black text-black font-black text-sm uppercase tracking-widest rounded-sm hover:bg-black hover:text-[#ff6a00] transition-all"
                    >
                        Ver Histórico
                    </button>
                </div>
            </div>
        </section>
    );

    const Footer = () => (
        <footer className="py-20 bg-[#050505] border-t border-white/5">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-2xl font-black text-white mb-6 tracking-tighter uppercase">{settings.name || "Insight Barber"}</h3>
                        <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
                            Elevando o padrão da barbearia urbana. Excelência técnica e ambiente exclusivo para o homem de hoje.
                        </p>
                        <div id="redes-sociais" className="flex gap-4">
                            {settings.instagram && (
                                <a href={settings.instagram.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center text-slate-400 hover:bg-[#ff6a00] hover:text-black transition-all">
                                    <Instagram size={20} />
                                </a>
                            )}
                            {settings.facebook && (
                                <a href={settings.facebook.startsWith('http') ? settings.facebook : `https://facebook.com/${settings.facebook}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center text-slate-400 hover:bg-[#ff6a00] hover:text-black transition-all">
                                    <Facebook size={20} />
                                </a>
                            )}
                            {settings.twitter && (
                                <a href={settings.twitter.startsWith('http') ? settings.twitter : `https://twitter.com/${settings.twitter}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center text-slate-400 hover:bg-[#ff6a00] hover:text-black transition-all">
                                    <Twitter size={20} />
                                </a>
                            )}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-6">Horários</h4>
                        <ul className="space-y-3 text-slate-500 text-sm font-medium">
                            {settings.businessHours ? Object.entries(settings.businessHours).map(([day, info]: [string, any]) => {
                                const daysMap: any = { monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua', thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom' };
                                return (
                                    <li key={day} className="flex justify-between">
                                        <span>{daysMap[day] || day}</span>
                                        <span className={info.active ? "text-slate-300" : "text-[#ff6a00]"}>
                                            {info.active ? `${info.start} - ${info.end}` : 'Fechado'}
                                        </span>
                                    </li>
                                );
                            }) : (
                                <li className="text-slate-600 italic">Horários não informados</li>
                            )}
                        </ul>
                    </div>
                    <div id="localização">
                        <h4 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-6">Localização</h4>
                        <div className="flex gap-3 text-slate-500 text-sm leading-relaxed mb-6">
                            <MapPin className="text-[#ff6a00] shrink-0" size={18} />
                            <span>{settings.address || "R. José de Alencar, 123 - Centro"}</span>
                        </div>
                        <div className="flex gap-3 text-slate-500 text-sm">
                            <Phone className="text-[#ff6a00] shrink-0" size={18} />
                            <span>{settings.phone || "(11) 99999-9999"}</span>
                        </div>
                    </div>
                </div>
                <div className="mt-20 pt-8 border-t border-white/5 text-center">
                    <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.5em]">© 2026 Crafted for Champions by Insight Barber</p>
                </div>
            </div>
        </footer>
    );

    // --------------------------------------------------------------------------------
    // MAIN RENDER
    // --------------------------------------------------------------------------------

    return (
        <div className="bg-[#050505] min-h-screen text-white font-sans selection:bg-[#ff6a00] selection:text-black scroll-smooth">
            {step === 'home' ? (
                <>
                    <Navbar />
                    <HeroSection />
                    <AboutSection />
                    <ServicesSection />
                    <ProfessionalsSection />
                    <FinalCTA />
                    <Footer />
                </>
            ) : (
                <div className="min-h-screen pt-12 pb-24 px-4 md:px-8 max-w-5xl mx-auto">
                    {/* Header Simplificado para o Wizard */}
                    <div className="flex items-center justify-between mb-12">
                        <button
                            onClick={() => setStep('home')}
                            className="flex items-center gap-2 text-slate-400 hover:text-[#ff6a00] transition-colors uppercase text-[10px] font-black tracking-[0.2em]"
                        >
                            <ArrowLeft size={16} /> Voltar ao Início
                        </button>
                        <h1 className="text-xl font-black text-white tracking-tighter uppercase">{settings.name}</h1>
                    </div>

                    <div className="space-y-8">
                        {(() => {
                            switch (step) {
                                case 'login':
                                    return <ClientLogin onBack={() => setStep('home')} />;
                                case 'profile':
                                    return <ClientProfile onBack={() => setStep('home')} onLogout={() => { logoutClient(); setStep('home'); }} />;
                                case 'services':
                                    return (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <ServicesStep
                                                services={services}
                                                selectedServiceIds={selectedServiceIds}
                                                setSelectedServiceIds={setSelectedServiceIds}
                                                setStep={setStep}
                                                settings={premiumTheme}
                                                total={total}
                                            />
                                        </div>
                                    );
                                case 'professional':
                                    return (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <ProfessionalStep
                                                professionals={professionals}
                                                selectedProId={selectedProId}
                                                setSelectedProId={setSelectedProId}
                                                setStep={setStep}
                                                settings={premiumTheme}
                                                total={total}
                                            />
                                        </div>
                                    );
                                case 'datetime':
                                    return (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <DateTimeStep
                                                selectedDate={selectedDate}
                                                setSelectedDate={setSelectedDate}
                                                selectedTime={selectedTime}
                                                setSelectedTime={setSelectedTime}
                                                setStep={setStep}
                                                settings={premiumTheme}
                                                total={total}
                                                selectedProId={selectedProId}
                                                professionals={professionals}
                                                appointments={appointments}
                                                services={services}
                                                totalDuration={totalDuration}
                                            />
                                        </div>
                                    );
                                case 'summary':
                                    return (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <SummaryStep
                                                customerInfo={customerInfo}
                                                setCustomerInfo={setCustomerInfo}
                                                couponCode={couponCode}
                                                setCouponCode={setCouponCode}
                                                appliedCoupon={appliedCoupon}
                                                handleApplyCoupon={handleApplyCoupon}
                                                settings={premiumTheme}
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
                                                handleRemoveCoupon={handleRemoveCoupon}
                                                loading={loading}
                                                error={error}
                                            />
                                        </div>
                                    );
                                case 'success':
                                    return (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <SuccessStep
                                                customerInfo={customerInfo}
                                                selectedDate={selectedDate}
                                                selectedTime={selectedTime}
                                                selectedProId={selectedProId}
                                                professionals={professionals}
                                                onReset={handleReset}
                                                settings={premiumTheme}
                                            />
                                        </div>
                                    );
                                default: return null;
                            }
                        })()}
                    </div>
                </div>
            )}

            {/* Estilos customizados para animações */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slow-zoom {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.1); }
                }
                .animate-slow-zoom {
                    animation: slow-zoom 20s ease-in-out infinite alternate;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                #nprogress .bar {
                    background: #ff6a00 !important;
                }
            `}} />
        </div>
    );
};
