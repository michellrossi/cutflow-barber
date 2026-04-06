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
import { ArrowLeft } from 'lucide-react';

type Step = 'home' | 'services' | 'professional' | 'datetime' | 'summary' | 'success' | 'login' | 'profile';

export const BookingFlow: React.FC<{ onAdminClick: () => void }> = ({ onAdminClick }) => {
    const [step, setStep] = useState<Step>('home');
    const { services, professionals, settings, coupons, addAppointment, appointments, blockedSlots, currentClient, logoutClient } = useShop();

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

    // Handle initial view from query params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        if (view === 'profile' && currentClient) {
            setStep('profile');
            // Clean up URL without refreshing
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
        }
    }, [currentClient]);

    // Auto-fill customer info if logged in
    useEffect(() => {
        if (currentClient && !customerInfo.name && !customerInfo.phone) {
            setCustomerInfo({ 
                name: currentClient.name, 
                phone: currentClient.phone, 
                birthDate: currentClient.birthDate || '' 
            });
        }
    }, [currentClient]);

    // Helpers
    const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
    const subtotal = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration, 0);
    const total = Math.max(0, subtotal - discountAmount);
    
    const handleApplyCoupon = () => {
        const coupon = coupons.find(c => c.code === couponCode.toUpperCase() && c.active);
        
        if (coupon) {
            if (coupon.maxUses && coupon.usageCount >= coupon.maxUses) {
                alert('Este cupom atingiu o limite máximo de usos.');
                setDiscountAmount(0);
                setAppliedCoupon(null);
                return;
            }

            let discount = 0;
            if (coupon.type === 'percentage') {
                discount = subtotal * (coupon.value / 100);
            } else {
                discount = coupon.value;
            }
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