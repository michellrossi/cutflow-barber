import React, { useState, useMemo, useEffect } from 'react';
import { useShop } from '../../../store';
import { ChevronLeft, ChevronRight, Plus, User, Clock, Calendar, Scissors, Check, Utensils } from 'lucide-react';
import { Appointment } from '../../../types';

interface WeeklyCalendarProps {
    onNewAppointment: () => void;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ onNewAppointment }) => {
    const { appointments, professionals, services, settings, updateAppointmentStatus } = useShop();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedProId, setSelectedProId] = useState<string | 'all'>('all');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Atualiza a linha do tempo a cada minuto
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Calcula o início da semana (Segunda-feira)
    const weekStart = useMemo(() => {
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajusta para Segunda
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }, [currentDate]);

    // Gera os 7 dias da semana
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return d;
        });
    }, [weekStart]);

    // Formatação do intervalo de datas do header
    const dateRangeLabel = useMemo(() => {
        const start = weekDays[0];
        const end = weekDays[6];
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
        return `${start.toLocaleDateString('pt-BR', options)} - ${end.toLocaleDateString('pt-BR', options)}`;
    }, [weekDays]);

    // Horários da agenda (08:00 às 20:00)
    const timeSlots = Array.from({ length: 13 }, (_, i) => {
        const hour = 8 + i;
        return `${hour.toString().padStart(2, '0')}:00`;
    });

    const navigateWeek = (direction: 'prev' | 'next') => {
        const d = new Date(currentDate);
        d.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        setCurrentDate(d);
    };

    // Filtra agendamentos da semana e do profissional
    const filteredAppointments = useMemo(() => {
        const startStr = weekDays[0].toISOString().split('T')[0];
        const endStr = weekDays[6].toISOString().split('T')[0];

        return appointments.filter(apt => {
            const matchesPro = selectedProId === 'all' || apt.professionalId === selectedProId;
            const inRange = apt.date >= startStr && apt.date <= endStr;
            return matchesPro && inRange;
        });
    }, [appointments, weekDays, selectedProId]);

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
            case 'confirmed': return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
            case 'completed': return 'bg-green-500/20 border-green-500/50 text-green-400';
            case 'noshow': return 'bg-red-500/20 border-red-500/50 text-red-400';
            default: return 'bg-slate-700/50 border-slate-600 text-slate-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'scheduled': return 'Agendado';
            case 'confirmed': return 'Confirmado';
            case 'completed': return 'Pago';
            case 'noshow': return 'Não veio';
            default: return status;
        }
    };

    // Calcula a posição da linha de tempo atual
    const timeLinePosition = useMemo(() => {
        const hour = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        if (hour < 8 || hour >= 21) return null;
        
        const startHour = 8;
        const pixelsPerHour = 100; // Altura de cada slot de hora
        const totalMinutes = (hour - startHour) * 60 + minutes;
        return (totalMinutes / 60) * pixelsPerHour;
    }, [currentTime]);

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header da Agenda */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Agenda Semanal</h2>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Calendar size={16} />
                        <span className="text-sm font-medium">{dateRangeLabel}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button 
                            onClick={() => navigateWeek('prev')}
                            className="p-2 hover:bg-slate-700 rounded-md text-slate-300 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={() => navigateWeek('next')}
                            className="p-2 hover:bg-slate-700 rounded-md text-slate-300 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    
                    <button 
                        onClick={onNewAppointment}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-bold shadow-lg hover:opacity-90 transition-all"
                        style={{ backgroundColor: settings.primaryColor }}
                    >
                        <Plus size={20} /> Novo Agendamento
                    </button>
                </div>
            </div>

            {/* Filtros de Profissionais */}
            <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filtrar por:</span>
                <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                    <button
                        onClick={() => setSelectedProId('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                            selectedProId === 'all' 
                            ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${selectedProId === 'all' ? 'bg-orange-400' : 'bg-slate-600'}`} />
                        Todos
                    </button>
                    {professionals.map(pro => (
                        <button
                            key={pro.id}
                            onClick={() => setSelectedProId(pro.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border whitespace-nowrap ${
                                selectedProId === pro.id 
                                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                            <User size={14} />
                            {pro.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid da Agenda */}
            <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <div className="min-w-[1000px] relative">
                        {/* Header do Grid (Dias) */}
                        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-700 bg-slate-900/50">
                            <div className="p-4 flex items-center justify-center text-[10px] font-bold text-slate-500 border-r border-slate-700">
                                GMT-3
                            </div>
                            {weekDays.map((day, i) => {
                                const isToday = day.toDateString() === new Date().toDateString();
                                return (
                                    <div key={i} className={`p-4 text-center border-r border-slate-700 last:border-r-0 ${isToday ? 'bg-orange-500/5' : ''}`}>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isToday ? 'text-orange-500' : 'text-slate-500'}`}>
                                            {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                        </p>
                                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${isToday ? 'bg-orange-500 text-white' : 'text-slate-300'}`}>
                                            {day.getDate()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Corpo do Grid */}
                        <div className="relative">
                            {/* Linha de Horário Atual */}
                            {timeLinePosition !== null && (
                                <div 
                                    className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                                    style={{ top: `${timeLinePosition + 48}px` }} // +48 para compensar o header do grid se necessário, mas aqui é relativo ao corpo
                                >
                                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                    <div className="flex-1 h-[2px] bg-red-500/50" />
                                </div>
                            )}

                            {timeSlots.map((time, slotIdx) => (
                                <div key={slotIdx} className="grid grid-cols-[80px_repeat(7,1fr)] h-[100px] border-b border-slate-700/50 last:border-b-0 relative">
                                    {/* Horário na lateral */}
                                    <div className="flex items-start justify-center pt-4 text-[11px] font-bold text-slate-500 border-r border-slate-700 bg-slate-900/20">
                                        {time}
                                    </div>

                                    {/* Células dos dias */}
                                    {weekDays.map((day, dayIdx) => {
                                        const dateStr = day.toISOString().split('T')[0];
                                        const hour = parseInt(time.split(':')[0]);
                                        
                                        // Agendamentos neste slot
                                        const slotAppointments = filteredAppointments.filter(apt => 
                                            apt.date === dateStr && parseInt(apt.time.split(':')[0]) === hour
                                        );

                                        return (
                                            <div key={dayIdx} className="relative border-r border-slate-700/30 last:border-r-0 p-1">
                                                {slotAppointments.map(apt => (
                                                    <div 
                                                        key={apt.id}
                                                        className={`p-2 rounded-xl border mb-1 shadow-lg cursor-pointer hover:brightness-110 transition-all ${getStatusStyles(apt.status)}`}
                                                    >
                                                        <p className="text-[11px] font-bold truncate leading-tight">{apt.clientName}</p>
                                                        <p className="text-[9px] opacity-70 truncate mb-1">
                                                            {apt.serviceIds.map(sid => services.find(s => s.id === sid)?.name).join(', ')}
                                                        </p>
                                                        <div className="flex items-center gap-1">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                                apt.status === 'completed' ? 'bg-green-400' : 
                                                                apt.status === 'noshow' ? 'bg-red-400' : 
                                                                apt.status === 'confirmed' ? 'bg-blue-400' : 'bg-orange-400'
                                                            }`} />
                                                            <span className="text-[8px] font-bold uppercase tracking-tighter">{getStatusLabel(apt.status)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}

                                    {/* Horário de Almoço (12:00) */}
                                    {time === '12:00' && (
                                        <div className="absolute inset-0 z-10 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none border-y border-slate-700/50 border-dashed">
                                            <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-slate-800 border border-slate-700 shadow-xl">
                                                <Utensils size={14} className="text-slate-500" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Horário de Almoço</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
