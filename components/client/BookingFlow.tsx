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
import { formatCurrencyBRL } from '../../store';

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

    // Initial load logic
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        if (view === 'profile' && currentClient) setStep('profile');
    }, [currentClient]);

    // Auto-fill customer info if logged in
    useEffect(() => {
        if (currentClient && !customerInfo.name && !customerInfo.phone) {
            setCustomerInfo({
                name: currentClient.name,
                phone: currentClient.phone,
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

    const handleFinish = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.birthDate) {
            alert('Por favor, preencha todos os seus dados.');
            return;
        }

        setLoading(true);
        setError(null);

        const appointment: Omit<Appointment, 'id' | 'createdAt' | 'shopId'> = {
            clientName: customerInfo.name,
            clientPhone: customerInfo.phone,
            clientBirthDate: customerInfo.birthDate,
            serviceIds: selectedServiceIds,
            professionalId: selectedProId!,
            date: selectedDate,
            time: selectedTime,
            totalValue: total,
            couponCode: appliedCoupon || undefined,
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
        setError(null);
    };

    // --------------------------------------------------------------------------------
    // PREMIUM COMPONENTS
    // --------------------------------------------------------------------------------

    const Navbar = () => (
        <nav className="fixed top-0 left-0 right-0 z-[100] bg-black/40 backdrop-blur-md border-b border-white/5 px-6 py-4">
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
                    {['Serviços', 'Barbeiros', 'Sobre nós', 'Localização', 'Redes Sociais'].map((item) => (
                        <a 
                            key={item} 
                            href={`#${item.toLowerCase().replace(' ', '-')}`}
                            className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] hover:text-[#ff6a00] transition-colors"
                        >
                            {item}
                        </a>
                    ))}
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
                    src="https://i.freeimage.host/Bi588ss.png" 
                    alt="Premium Barbershop Interior" 
                    className="w-full h-full object-cover grayscale opacity-60 blur-[2px]"
                />
                <div className="absolute inset-0 bg-black/70"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"></div>
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
                        AGENDE OS MELHORES SERVIÇOS <br />
                        COM A MELHOR BARBEARIA <br />
                        <span className="text-[#ff6a00] italic">MODERN REBEL.</span>
                    </h1>

                    <p className="text-slate-300 text-lg md:text-xl mb-12 font-medium">
                        Agende agora mesmo seu serviço e experimente a excelência.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-8">
                        <button 
                            onClick={handleAgendarClick}
                            className="group w-full sm:w-auto px-10 py-5 bg-[#ff6a00] text-black font-black text-xs uppercase tracking-[0.2em] rounded-sm transition-all hover:bg-[#e55f00] flex items-center justify-center gap-3"
                        >
                            <Calendar size={18} /> AGENDAR AGORA
                        </button>
                        <a 
                            href="#servicos"
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
        <section id="sobre-nós" className="py-24 bg-[#050505] border-y border-white/5">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="w-full lg:w-1/2 relative">
                        <div className="absolute -top-4 -left-4 w-24 h-24 border-t-2 border-l-2 border-[#ff6a00] z-10"></div>
                        <img 
                            src="/master_barber_working_1777399038809.png" 
                            alt="Barber Working" 
                            className="rounded-sm shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
                        />
                        <div className="absolute -bottom-10 -right-10 bg-[#ff6a00] p-8 hidden md:block">
                            <p className="text-black font-black text-4xl leading-none">10 ANOS</p>
                            <p className="text-black/70 font-bold text-xs uppercase tracking-widest mt-1">De Maestria</p>
                        </div>
                    </div>
                    <div className="w-full lg:w-1/2 space-y-8">
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none">
                            ONDE A TRADIÇÃO ENCONTRA O <span className="text-[#ff6a00]">URBANO</span>
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Mais do que um corte de cabelo, oferecemos um ritual. Nossa equipe é composta por especialistas em visagismo masculino, prontos para traduzir sua personalidade em estilo.
                        </p>
                        <div className="grid grid-cols-2 gap-8 pt-6">
                            <div>
                                <p className="text-[#ff6a00] text-4xl font-black">15+</p>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Barbeiros Especialistas</p>
                            </div>
                            <div>
                                <p className="text-[#ff6a00] text-4xl font-black">10k+</p>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Clientes Satisfeitos</p>
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
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">NOSSOS SERVIÇOS</h2>
                    <div className="w-20 h-1 bg-[#ff6a00] mx-auto"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service) => (
                        <motion.div 
                            key={service.id}
                            whileHover={{ y: -10 }}
                            className="group p-8 bg-white/[0.02] border border-white/5 rounded-sm hover:border-[#ff6a00]/50 hover:bg-[#ff6a00]/5 transition-all duration-500"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-[#ff6a00]/10 rounded-sm text-[#ff6a00] group-hover:bg-[#ff6a00] group-hover:text-black transition-colors">
                                    <Scissors size={24} />
                                </div>
                                <span className="text-slate-600 font-black text-xl group-hover:text-[#ff6a00] transition-colors">
                                    {formatCurrencyBRL(service.price)}
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide group-hover:text-[#ff6a00] transition-colors">{service.name}</h3>
                            <p className="text-slate-500 text-sm mb-6 line-clamp-2">{service.description || 'Experiência premium de cuidados masculinos com acabamento impecável.'}</p>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <Clock size={14} className="text-[#ff6a00]" />
                                <span>{service.duration} Minutos</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );

    const FinalCTA = () => (
        <section className="py-24 bg-[#ff6a00]">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-5xl md:text-7xl font-black text-black mb-8 tracking-tighter">PRONTO PARA SUA <br />TRANSFORMAÇÃO?</h2>
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
        <footer id="localização" className="py-20 bg-[#050505] border-t border-white/5">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-2xl font-black text-white mb-6 tracking-tighter uppercase">{settings.name || "Insight Barber"}</h3>
                        <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
                            Elevando o padrão da barbearia urbana. Excelência técnica e ambiente exclusivo para o homem de hoje.
                        </p>
                        <div id="redes-sociais" className="flex gap-4">
                            {[Instagram, Facebook, Twitter].map((Icon, i) => (
                                <a key={i} href="#" className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center text-slate-400 hover:bg-[#ff6a00] hover:text-black transition-all">
                                    <Icon size={20} />
                                </a>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-6">Horários</h4>
                        <ul className="space-y-3 text-slate-500 text-sm font-medium">
                            <li className="flex justify-between"><span>Seg - Sex</span> <span className="text-slate-300">09:00 - 20:00</span></li>
                            <li className="flex justify-between"><span>Sábado</span> <span className="text-slate-300">09:00 - 18:00</span></li>
                            <li className="flex justify-between"><span>Domingo</span> <span className="text-slate-300 text-[#ff6a00]">Fechado</span></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-black text-sm uppercase tracking-[0.2em] mb-6">Localização</h4>
                        <div className="flex gap-3 text-slate-500 text-sm leading-relaxed mb-6">
                            <MapPin className="text-[#ff6a00] shrink-0" size={18} />
                            <span>{settings.address || "R. José de Alencar, 123 - Centro"}</span>
                        </div>
                        <div className="flex gap-3 text-slate-500 text-sm">
                            <Phone className="text-[#ff6a00] shrink-0" size={18} />
                            <span>(11) 99999-9999</span>
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
                                                settings={{ ...settings, backgroundColor: '#050505', textColor: '#ffffff', buttonColor: '#ff6a00' }}
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
                                                settings={{ ...settings, backgroundColor: '#050505', textColor: '#ffffff', buttonColor: '#ff6a00' }}
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
                                                settings={{ ...settings, backgroundColor: '#050505', textColor: '#ffffff', buttonColor: '#ff6a00' }}
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
                                                settings={{ ...settings, backgroundColor: '#050505', textColor: '#ffffff', buttonColor: '#ff6a00' }}
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
                                                settings={{ ...settings, backgroundColor: '#050505', textColor: '#ffffff', buttonColor: '#ff6a00' }}
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
            <style dangerouslySetInnerHTML={{ __html: `
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
            `}} />
        </div>
    );
};
