import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useShop } from '../../../store';

interface DateRangeFilterProps {
    onFilterChange: (filter: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onFilterChange }) => {
    const { settings } = useShop();
    const primaryColor = settings?.primaryColor || '#F59E0B'; // Padrao laranja cutflow7
    const [isOpen, setIsOpen] = useState(false);
    
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    
    // Controle de cliques: 0 = start, 1 = end
    const [clickStep, setClickStep] = useState<0 | 1>(0);
    
    const [currentMonth, setCurrentMonth] = useState(new Date());
    
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatShort = (d: Date | null) => d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const generateCalendar = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];

        // Dias do mês anterior
        const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        const daysInPrevMonth = getDaysInMonth(prevMonth);
        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({
                date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, daysInPrevMonth - i),
                isCurrentMonth: false
            });
        }

        // Dias do mês atual
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i),
                isCurrentMonth: true
            });
        }

        // Preencher o final da grade (42 slots total - 6 semanas)
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    };

    const isSameDay = (d1: Date, d2: Date) => 
        d1.getFullYear() === d2.getFullYear() && 
        d1.getMonth() === d2.getMonth() && 
        d1.getDate() === d2.getDate();

    const isBetween = (date: Date) => {
        if (!startDate || !endDate) return false;
        const d = new Date(date).setHours(0,0,0,0);
        const s = new Date(startDate).setHours(0,0,0,0);
        const e = new Date(endDate).setHours(0,0,0,0);
        return d > s && d < e;
    };

    const handleDayClick = (date: Date) => {
        // Se já tiver startDate e endDate, reseta a seleção
        if (startDate && endDate) {
            setStartDate(date);
            setEndDate(null);
            setClickStep(1);
            return;
        }

        if (clickStep === 0 || (clickStep === 1 && startDate && date < startDate)) {
            setStartDate(date);
            setEndDate(null);
            setClickStep(1);
        } else {
            setEndDate(date);
            setClickStep(0);
            setIsOpen(false);
            
            // Enviar os dados via string pro Panel
            const sv = date.toISOString().split('T')[0];
            const ev = startDate!.toISOString().split('T')[0];
            onFilterChange(`${ev}|${sv}`);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Inputs Header no Padrão cutflow7 */}
            <div className="flex items-center gap-3">
                <div 
                    onClick={() => { setIsOpen(true); setClickStep(0); }}
                    className="flex items-center gap-2 px-3 h-11 bg-white border rounded-xl min-w-[140px] cursor-pointer transition-colors shadow-sm"
                    style={{ 
                        borderColor: isOpen && clickStep === 0 ? primaryColor : '#E2E8F0',
                        boxShadow: isOpen && clickStep === 0 ? `0 0 0 1px ${primaryColor}30` : 'none'
                    }}
                >
                    <Calendar size={18} style={{ color: primaryColor }} />
                    <span className="text-sm font-medium" style={{ color: startDate ? '#334155' : '#94A3B8' }}>
                        {formatShort(startDate) || 'Data inicial'}
                    </span>
                </div>
                
                <span className="text-slate-400 font-medium text-sm">até</span>
                
                <div 
                    onClick={() => { setIsOpen(true); setClickStep(1); }}
                    className="flex items-center gap-2 px-3 h-11 bg-white border rounded-xl min-w-[140px] cursor-pointer transition-colors shadow-sm"
                    style={{ 
                        borderColor: isOpen && clickStep === 1 ? primaryColor : '#E2E8F0',
                        boxShadow: isOpen && clickStep === 1 ? `0 0 0 1px ${primaryColor}30` : 'none'
                    }}
                >
                    <Calendar size={18} style={{ color: primaryColor }} />
                    <span className="text-sm font-medium" style={{ color: endDate ? '#334155' : '#94A3B8' }}>
                        {formatShort(endDate) || 'Data final'}
                    </span>
                </div>
            </div>

            {/* Calendário Popover */}
            {isOpen && (
                <div className="absolute top-full right-0 md:left-0 lg:left-auto lg:right-0 mt-3 w-[320px] bg-white border border-slate-200 rounded-xl shadow-[0px_10px_30px_rgba(0,0,0,0.08)] z-50 p-5 animate-in fade-in zoom-in-95 duration-200">
                    
                    {/* Header do Mês */}
                    <div className="flex items-center justify-between mb-6">
                        <button 
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-bold text-slate-800 capitalize text-sm">
                            {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button 
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Grade de Dias */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-3">
                        {['dom','seg','ter','qua','qui','sex','sab'].map((d, i) => (
                            <span key={i} className="text-xs font-bold text-slate-400">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-1 text-center">
                        {generateCalendar().map((dayObj, i) => {
                            const isSelect = (startDate && isSameDay(dayObj.date, startDate)) || (endDate && isSameDay(dayObj.date, endDate));
                            const isInBet = isBetween(dayObj.date);
                            
                            return (
                                <button
                                    key={i}
                                    disabled={!dayObj.isCurrentMonth}
                                    onClick={() => handleDayClick(dayObj.date)}
                                    className="w-full aspect-square flex items-center justify-center text-sm font-medium transition-colors relative"
                                    style={{
                                        color: !dayObj.isCurrentMonth ? '#CBD5E1' : isSelect ? '#FFFFFF' : '#334155',
                                        backgroundColor: isSelect ? primaryColor : isInBet ? `${primaryColor}25` : 'transparent',
                                        borderRadius: isSelect ? '50%' : isInBet ? '0px' : '50%',
                                        opacity: !dayObj.isCurrentMonth ? 0.5 : 1,
                                        cursor: !dayObj.isCurrentMonth ? 'not-allowed' : 'pointer'
                                    }}
                                    onMouseOver={(e) => {
                                        if (dayObj.isCurrentMonth && !isSelect && !isInBet) {
                                            e.currentTarget.style.backgroundColor = `${primaryColor}15`;
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (dayObj.isCurrentMonth && !isSelect && !isInBet) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    <span className="relative z-10">{dayObj.date.getDate()}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
