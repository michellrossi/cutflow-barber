import React, { useState } from 'react';
import { useShop } from '../../store';
import { Appointment } from '../../types';
import { HomeStep } from './steps/HomeStep';
import { ServicesStep } from './steps/ServicesStep';
import { ProfessionalStep } from './steps/ProfessionalStep';
import { DateTimeStep } from './steps/DateTimeStep';
import { SummaryStep } from './steps/SummaryStep';
import { SuccessStep } from './steps/SuccessStep';

type Step = 'home' | 'services' | 'professional' | 'datetime' | 'summary' | 'success';

export const BookingFlow: React.FC<{ onAdminClick: () => void }> = ({ onAdminClick }) => {
    const [step, setStep] = useState<Step>('home');
    const { services, professionals, settings, coupons, addAppointment, appointments } = useShop();

    // Booking State
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [selectedProId, setSelectedProId] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '' });
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
    
    const handleApplyCoupon = () => {
        const coupon = coupons.find(c => c.code === couponCode.toUpperCase() && c.active);
        if (coupon) {
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
        
        if (!customerInfo.name || !customerInfo.phone) {
            alert('Por favor, preencha seus dados.');
            return;
        }
        
        setLoading(true);
        setError(null);

        const appointment: Omit<Appointment, 'id' | 'createdAt' | 'shopId'> = {
            clientName: customerInfo.name,
            clientPhone: customerInfo.phone,
            serviceIds: selectedServiceIds,
            professionalId: selectedProId,
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
        setCustomerInfo({ name: '', phone: '' });
        setCouponCode('');
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setError(null);
    };

    switch(step) {
        case 'home': 
            return <HomeStep settings={settings} setStep={setStep} onAdminClick={onAdminClick} />;
        case 'services': 
            return <ServicesStep 
                services={services} 
                selectedServiceIds={selectedServiceIds} 
                setSelectedServiceIds={setSelectedServiceIds} 
                setStep={setStep} 
                settings={settings} 
                subtotal={subtotal}
            />;
        case 'professional': 
            return <ProfessionalStep 
                professionals={professionals} 
                selectedProId={selectedProId} 
                setSelectedProId={setSelectedProId} 
                setStep={setStep} 
                settings={settings} 
                subtotal={subtotal}
            />;
        case 'datetime': 
            return <DateTimeStep 
                selectedDate={selectedDate} 
                setSelectedDate={setSelectedDate} 
                selectedTime={selectedTime} 
                setSelectedTime={setSelectedTime} 
                setStep={setStep} 
                settings={settings}
                subtotal={subtotal}
                selectedProId={selectedProId}
                professionals={professionals}
                appointments={appointments}
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
            />;
        default: return null;
    }
};