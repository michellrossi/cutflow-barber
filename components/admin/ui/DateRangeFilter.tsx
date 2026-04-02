import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useShop } from '../../../store';

interface DateRangeFilterProps {
    onFilterChange: (filter: string) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ onFilterChange }) => {
    const { settings } = useShop();
    const primaryColor = settings?.primaryColor || '#f97316';
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

    const formatShort = (d: Date | null) => d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Data';

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
            {/* Inputs Header */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => { setIsOpen(true); setClickStep(0); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-[2rem] text-sm font-bold shadow-sm transition-all whitespace-nowrap"
                    style={{ 
                        backgroundColor: (isOpen && clickStep === 0) || startDate ? primaryColor : '#ffffff', 
                        color: (isOpen && clickStep === 0) || startDate ? '#ffffff' : primaryColor,
                        border: `1px solid ${primaryColor}` 
                    }}
                >
                    <Calendar size={16} />
                    {formatShort(startDate)}
                </button>
                <span className="text-slate-400 font-bold text-xs uppercase">até</span>
                <button 
                    onClick={() => { setIsOpen(true); setClickStep(1); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-[2rem] text-sm font-bold shadow-sm transition-all whitespace-nowrap bg-white"
                    style={{ 
                        backgroundColor: (isOpen && clickStep === 1) || endDate ? primaryColor : '#ffffff', 
                        color: (isOpen && clickStep === 1) || endDate ? '#ffffff' : primaryColor,
                        border: `1px solid ${primaryColor}` 
                    }}
                >
                    {formatShort(endDate)}
                </button>
            </div>

            {/* Popover */}
            {isOpen && (
                <div className="absolute top-full right-0 md:left-0 lg:left-auto lg:right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-[0px_10px_40px_rgba(0,0,0,0.1)] z-50 p-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-6">
                        <button 
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                            className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-slate-50 transition-colors"
                            style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-bold text-slate-800 capitalize">
                            {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button 
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                            className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-slate-50 transition-colors"
                            style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['D','S','T','Q','Q','S','S'].map((d, i) => (
                            <span key={i} className="text-[10px] font-black text-slate-400">{d}</span>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-2 text-center">
                        {generateCalendar().map((dayObj, i) => {
                            const isSelect = (startDate && isSameDay(dayObj.date, startDate)) || (endDate && isSameDay(dayObj.date, endDate));
                            const isInBet = isBetween(dayObj.date);
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleDayClick(dayObj.date)}
                                    className={`w-full aspect-square flex items-center justify-center text-sm font-bold rounded-full transition-all relative ${
                                        !dayObj.isCurrentMonth ? 'text-slate-300' : 'text-slate-700'
                                    } hover:bg-orange-50`}
                                    style={{
                                        backgroundColor: isSelect ? primaryColor : isInBet ? `${primaryColor}20` : 'transparent',
                                        color: isSelect ? '#ffffff' : undefined,
                                        borderRadius: isSelect ? '9999px' : isInBet ? '0px' : '9999px' // Estilo contínuo sutil
                                    }}
                                >
                                    {dayObj.date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="mt-6 flex flex-wrap gap-2">
                        {['Hoje', 'Esta Semana', 'Este Mês', 'Mês Passado'].map((preset) => (
                            <button
                                key={preset}
                                onClick={() => {
                                    const now = new Date();
                                    let s = new Date(now), e = new Date(now);
                                    if (preset === 'Hoje') {
                                        // s e e já são agora
                                    } else if (preset === 'Esta Semana') {
                                        s.setDate(now.getDate() - now.getDay());
                                    } else if (preset === 'Este Mês') {
                                        s.setDate(1);
                                    } else if (preset === 'Mês Passado') {
                                        s.setMonth(now.getMonth() - 1);
                                        s.setDate(1);
                                        e.setMonth(now.getMonth());
                                        e.setDate(0);
                                    }
                                    setStartDate(s);
                                    setEndDate(e);
                                    setIsOpen(false);
                                    onFilterChange(`${s.toISOString().split('T')[0]}|${e.toISOString().split('T')[0]}`);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-xs font-bold transition-colors"
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
