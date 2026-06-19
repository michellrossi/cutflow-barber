import React, { useState, useEffect, useMemo } from 'react';
import { useShop } from '../../../store';
import { Professional, Appointment, Service, ShopSettings } from '../../../types';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { StickyFooter } from '../StickyFooter';
import { timeToMinutes, minutesToTime, getDayName } from '../../../utils/dateHelpers';

interface DateTimeStepProps {
    selectedDate: string;
    setSelectedDate: (d: string) => void;
    selectedTime: string;
    setSelectedTime: (t: string) => void;
    setStep: (s: string) => void;
    settings: ShopSettings;
    total: number;
    selectedProId: string | null;
    professionals: Professional[];
    appointments: Appointment[];
    services: Service[];
    totalDuration: number;
}

export const DateTimeStep: React.FC<DateTimeStepProps> = ({ 
    selectedDate, setSelectedDate, selectedTime, setSelectedTime, setStep, settings, total, 
    selectedProId, professionals, appointments, services, totalDuration 
}) => {
    
    const { blockedSlots } = useShop();

    // State para tempo real
    const [currentTimeRef, setCurrentTimeRef] = useState(new Date());

    // Atualiza o relógio a cada 30 segundos
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTimeRef(new Date());
        }, 30000); 

        return () => clearInterval(timer);
    }, []);

    // Calendar Generation
    const dates = useMemo(() => {
        const arr = [];
        const today = new Date(); 
        
        for(let i=0; i<14; i++) { // Next 14 days
            const d = new Date(today);
            d.setDate(today.getDate() + i);

            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const fullDate = `${year}-${month}-${day}`;

            arr.push({
                full: fullDate,
                day: d.getDate(),
                weekday: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
                month: d.toLocaleDateString('pt-BR', { month: 'short' }),
                obj: d
            });
        }
        return arr;
    }, []);

    // LOGIC: Generate Time Slots based on Schedule, Conflicts & BLOCKS
    const timeSlots = useMemo(() => {
        if (!selectedDate) return [];

        const dayName = getDayName(selectedDate);
        let availableSlots: string[] = [];

        // Identify which professionals to check
        const prosToCheck = selectedProId 
            ? professionals.filter(p => p.id === selectedProId) 
            : professionals; 

        if (prosToCheck.length === 0) return [];

        const startOfDay = 0;
        const endOfDay = 1440; // 24h * 60m
        const interval = 30; // 30 min slots

        const now = currentTimeRef; 
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [selYear, selMonth, selDay] = selectedDate.split('-').map(Number);
        const isToday = 
            selYear === now.getFullYear() && 
            selMonth === (now.getMonth() + 1) && 
            selDay === now.getDate();

        for (let time = startOfDay; time < endOfDay; time += interval) {
            // 0. CHECK PAST TIME
            if (isToday && time <= currentMinutes) {
                continue;
            }

            const timeString = minutesToTime(time);
            let isSlotAvailable = false;

            for (const pro of prosToCheck) {
                const schedule = pro.workSchedule ? pro.workSchedule[dayName] : null;

                // 1. Check Working Hours
                if (!schedule || !schedule.active) continue;

                const workStart = timeToMinutes(schedule.start);
                const workEnd = timeToMinutes(schedule.end);
                const lunchStart = timeToMinutes(schedule.lunchStart);
                const lunchEnd = timeToMinutes(schedule.lunchEnd);

                const serviceEndTime = time + totalDuration;

                if (time < workStart || serviceEndTime > workEnd) continue;
                if (time < lunchEnd && serviceEndTime > lunchStart) continue;

                // --- CHECK BLOCKED SLOTS ---
                const proBlocks = blockedSlots.filter(b => b.professionalId === pro.id && b.date === selectedDate);
                let isBlocked = false;
                for (const block of proBlocks) {
                    const blockStart = timeToMinutes(block.startTime);
                    const blockEnd = timeToMinutes(block.endTime);
                    
                    if (
                        (time >= blockStart && time < blockEnd) || 
                        (serviceEndTime > blockStart && serviceEndTime <= blockEnd) || 
                        (time <= blockStart && serviceEndTime >= blockEnd)
                    ) {
                        isBlocked = true;
                        break;
                    }
                }
                if (isBlocked) continue; // Pula este profissional se bloqueado
                // ----------------------------------

                // 2. Check Appointment Conflicts
                const proAppts = appointments.filter(a => a.professionalId === pro.id && a.date === selectedDate && a.status !== 'cancelled' && a.status !== 'noshow');
                let hasConflict = false;

                for (const apt of proAppts) {
                    const aptStart = timeToMinutes(apt.time);
                    // Calculate actual duration of the existing appointment
                    const aptDuration = services
                        .filter(s => apt.serviceIds.includes(s.id))
                        .reduce((acc, s) => acc + s.duration, 0) || 45; // Fallback to 45 if no services found
                    
                    const aptEnd = aptStart + aptDuration;

                    if (time < aptEnd && serviceEndTime > aptStart) {
                        hasConflict = true;
                        break;
                    }
                }

                if (!hasConflict) {
                    isSlotAvailable = true;
                    break;
                }
            }

            if (isSlotAvailable) {
                availableSlots.push(timeString);
            }
        }

        return availableSlots;

    }, [selectedDate, selectedProId, professionals, appointments, blockedSlots, totalDuration, currentTimeRef]);

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 pb-32">
                <button onClick={() => setStep('professional')} className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity" style={{ color: settings.textColor || '#94a3b8' }}><ArrowLeft size={16}/> Voltar</button>
                <h2 className="text-3xl font-bold mb-2" style={{ color: settings.titleColor || '#ffffff' }}>Escolha data e horário</h2>
                <p className="mb-8" style={{ color: settings.textColor || '#94a3b8' }}>Selecione o melhor dia e hora para você</p>

                <div className="mb-6">
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: settings.titleColor || '#ffffff' }}><Calendar size={18}/> Data</h3>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                    {dates.map(date => {
                        const isSelected = selectedDate === date.full;
                        
                        return (
                            <div 
                                key={date.full}
                                onClick={() => setSelectedDate(date.full)}
                                className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${isSelected ? 'text-white' : 'hover:brightness-110'}`}
                                style={{ 
                                    backgroundColor: isSelected ? (settings.accentColor || settings.primaryColor) : (settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.3)'), 
                                    borderColor: isSelected ? (settings.accentColor || settings.primaryColor) : (settings.borderColor || '#334155'),
                                    color: isSelected ? (settings.buttonTextColor || '#ffffff') : (settings.textColor || '#94a3b8'),
                                    borderWidth: isSelected ? '2px' : '1px'
                                }}
                            >
                                <div className="text-xs uppercase font-bold opacity-60">{date.weekday}</div>
                                <div className="text-2xl font-bold my-1">{date.day}</div>
                                <div className="text-xs opacity-60">{date.month}</div>
                            </div>
                        );
                    })}
                </div>
                </div>

                {selectedDate && (
                    <div className="mb-8 animate-fade-in-down">
                    <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: settings.titleColor || '#ffffff' }}><Clock size={18}/> Horários Disponíveis</h3>
                    {timeSlots.length > 0 ? (
                        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                            {timeSlots.map(time => {
                                const isSelected = selectedTime === time;
                                return (
                                    <div 
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${isSelected ? 'font-bold' : 'hover:brightness-110'}`}
                                        style={{ 
                                            backgroundColor: isSelected ? (settings.accentColor || settings.primaryColor) : (settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.3)'), 
                                            borderColor: isSelected ? (settings.accentColor || settings.primaryColor) : (settings.borderColor || '#334155'),
                                            color: isSelected ? (settings.buttonTextColor || '#ffffff') : (settings.textColor || '#94a3b8'),
                                            borderWidth: isSelected ? '2px' : '1px'
                                        }}
                                    >
                                            {time}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="p-6 rounded-xl border text-center" style={{ backgroundColor: settings.cardBackgroundColor || 'rgba(30, 41, 59, 0.5)', borderColor: settings.borderColor || '#334155', color: settings.textColor || '#94a3b8' }}>
                            Não há horários disponíveis para esta data.
                        </div>
                    )}
                    </div>
                )}
                
                {selectedDate && selectedTime && (
                    <div className="p-4 rounded-xl border mb-8" style={{ backgroundColor: settings.cardBackgroundColor || '#1e293b', borderColor: settings.borderColor || '#334155' }}>
                    <span className="text-sm" style={{ color: settings.textColor || '#94a3b8' }}>Agendamento selecionado</span>
                    <div className="font-bold text-lg" style={{ color: settings.titleColor || '#ffffff' }}>
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {selectedTime}
                    </div>
                    </div>
                )}

            <StickyFooter 
                total={total} 
                onContinue={() => setStep('summary')} 
                disabled={!selectedDate || !selectedTime} 
                settings={settings} 
            />
        </div>
    );
};
