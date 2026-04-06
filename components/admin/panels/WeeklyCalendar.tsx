import React, { useState, useMemo, useEffect } from 'react';
import { useShop } from '../../../store';
import { ChevronLeft, ChevronRight, Plus, User, Clock, Calendar, Scissors, Check, Utensils, X, Phone } from 'lucide-react';
import { Appointment } from '../../../types';

interface WeeklyCalendarProps {
    onNewAppointment: () => void;
    modeToggle?: React.ReactNode;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ onNewAppointment, modeToggle }) => {
    const { appointments, professionals, services, settings, updateAppointmentStatus, updateAppointmentPaymentMethod, theme } = useShop();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedProId, setSelectedProId] = useState<string | 'all'>('all');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [viewType, setViewType] = useState<'week' | 'day'>(window.innerWidth < 768 ? 'day' : 'week');

    // Atualiza a linha do tempo a cada minuto
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        
        const handleResize = () => {
            if (window.innerWidth < 768 && viewType === 'week') {
                setViewType('day');
            } else if (window.innerWidth >= 768 && viewType === 'day') {
                setViewType('week');
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            clearInterval(timer);
            window.removeEventListener('resize', handleResize);
        };
    }, [viewType]);

    // Calcula o início da semana (Segunda-feira)
    const weekStart = useMemo(() => {
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajusta para Segunda
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }, [currentDate]);

    // Gera os dias a serem exibidos
    const displayDays = useMemo(() => {
        if (viewType === 'day') {
            return [currentDate];
        }
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            return d;
        });
    }, [weekStart, viewType, currentDate]);

    // Formatação do intervalo de datas do header
    const dateRangeLabel = useMemo(() => {
        if (viewType === 'day') {
            return currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        }
        const start = displayDays[0];
        const end = displayDays[6];
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: '2-digit' };
        return `${start.toLocaleDateString('pt-BR', options)} - ${end.toLocaleDateString('pt-BR', options)}`;
    }, [displayDays, viewType, currentDate]);

    // Horários da agenda (08:00 às 20:00)
    const timeSlots = Array.from({ length: 13 }, (_, i) => {
        const hour = 8 + i;
        return `${hour.toString().padStart(2, '0')}:00`;
    });

    const navigate = (direction: 'prev' | 'next') => {
        const d = new Date(currentDate);
        if (viewType === 'day') {
            d.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        } else {
            d.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        }
        setCurrentDate(d);
    };

    // Filtra agendamentos do período e do profissional
    const filteredAppointments = useMemo(() => {
        const startStr = displayDays[0].toISOString().split('T')[0];
        const endStr = displayDays[displayDays.length - 1].toISOString().split('T')[0];

        return appointments.filter(apt => {
            const matchesPro = selectedProId === 'all' || apt.professionalId === selectedProId;
            const inRange = apt.date >= startStr && apt.date <= endStr;
            return matchesPro && inRange;
        });
    }, [appointments, displayDays, selectedProId]);

    const getStatusStyles = (status: string) => {
        return 'text-slate-700 calendar-appointment border-l-4';
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'scheduled': return 'Agendado';
            case 'confirmed': return 'Confirmado';
            case 'completed': return 'Pago';
            case 'noshow': return 'Não veio';
            case 'cancelled': return 'Cancelado';
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

    const getProColor = (proId: string | null) => {
        if (!proId) return '#64748b';
        return professionals.find(p => p.id === proId)?.color || '#64748b';
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Modal de Detalhes do Agendamento */}
            {selectedAppointment && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => e.target === e.currentTarget && setSelectedAppointment(null)}
                >
                    <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl relative animate-scale-up overflow-hidden">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">Detalhes do Agendamento</h3>
                            <button onClick={() => setSelectedAppointment(null)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={24}/></button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xl border border-slate-200">
                                    {selectedAppointment.clientName.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">{selectedAppointment.clientName}</h4>
                                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                                        <Phone size={12} /> {selectedAppointment.clientPhone}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data e Hora</p>
                                    <p className="text-sm text-slate-900 font-medium flex items-center gap-2">
                                        <Calendar size={14} className="text-orange-500" />
                                        {new Date(selectedAppointment.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {selectedAppointment.time.substring(0, 5)}
                                    </p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Profissional</p>
                                    <p className="text-sm text-slate-900 font-medium flex items-center gap-2">
                                        <User size={14} className="text-orange-500" />
                                        {professionals.find(p => p.id === selectedAppointment.professionalId)?.name || 'Qualquer um'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Serviços</p>
                                <div className="space-y-2">
                                    {selectedAppointment.serviceIds.map(sid => {
                                        const service = services.find(s => s.id === sid);
                                        return (
                                            <div key={sid} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                                                <span className="text-sm text-slate-600">{service?.name}</span>
                                                <span className="text-sm font-bold text-slate-900">R$ {service?.price.toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                        <span className="text-sm font-bold text-slate-400">Total</span>
                                        <span className="text-lg font-bold" style={{ color: settings.primaryColor }}>R$ {selectedAppointment.totalValue.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Status</label>
                                    <select 
                                        value={selectedAppointment.status}
                                        onChange={(e) => {
                                            const newStatus = e.target.value as any;
                                            updateAppointmentStatus(selectedAppointment.id, newStatus);
                                            setSelectedAppointment({...selectedAppointment, status: newStatus});
                                        }}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                                    >
                                        <option value="scheduled">Agendado</option>
                                        <option value="confirmed">Confirmado</option>
                                        <option value="completed">Finalizado / Pago</option>
                                        <option value="noshow">Não Compareceu</option>
                                        <option value="cancelled">Cancelado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pagamento</label>
                                    <select 
                                        value={selectedAppointment.paymentMethod || 'pix'}
                                        disabled={selectedAppointment.status !== 'completed'}
                                        onChange={(e) => {
                                            const newMethod = e.target.value as any;
                                            updateAppointmentPaymentMethod(selectedAppointment.id, newMethod);
                                            setSelectedAppointment({...selectedAppointment, paymentMethod: newMethod});
                                        }}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-sm text-slate-900 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                                    >
                                        <option value="pix">PIX</option>
                                        <option value="credit">Cartão</option>
                                        <option value="cash">Dinheiro</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header da Agenda */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                        <button 
                            onClick={() => setViewType('day')}
                            className={`px-2 py-1 rounded transition-all ${viewType === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                            Dia
                        </button>
                        <button 
                            onClick={() => setViewType('week')}
                            className={`px-2 py-1 rounded transition-all ${viewType === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                        >
                            Semana
                        </button>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                        <Calendar size={14} />
                        <span className="text-xs md:text-sm font-medium whitespace-nowrap">{dateRangeLabel}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 flex-1 md:flex-none justify-between">
                        <button 
                            onClick={() => navigate('prev')}
                            className="p-2 hover:bg-white rounded-md text-slate-600 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button 
                            onClick={() => setCurrentDate(new Date())}
                            className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-widest"
                        >
                            Hoje
                        </button>
                        <button 
                            onClick={() => navigate('next')}
                            className="p-2 hover:bg-white rounded-md text-slate-600 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                    {modeToggle}
                </div>
            </div>

            {/* Filtros de Profissionais */}
            <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filtrar por:</span>
                <div className="flex gap-2 overflow-x-auto py-2 hide-scrollbar">
                    <button
                        onClick={() => setSelectedProId('all')}
                        className={`flex items-center gap-2 px-4 py-2 font-medium transition-all border ${
                            selectedProId === 'all' 
                            ? 'shadow-sm rounded-[2rem]' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 rounded-md'
                        }`}
                        style={{ 
                            borderColor: selectedProId === 'all' ? settings.primaryColor : undefined,
                            backgroundColor: selectedProId === 'all' ? `${settings.primaryColor}10` : undefined,
                            color: selectedProId === 'all' ? settings.primaryColor : undefined
                        }}
                    >
                        <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: selectedProId === 'all' ? settings.primaryColor : '#94a3b8' }} />
                        Todos
                    </button>
                    {professionals.map(pro => (
                        <button
                            key={pro.id}
                            onClick={() => setSelectedProId(pro.id)}
                            className={`flex items-center gap-2 px-4 py-2 font-medium transition-all border whitespace-nowrap ${
                                selectedProId === pro.id 
                                ? 'shadow-sm rounded-[2rem]' 
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 rounded-md'
                            }`}
                            style={{ 
                                borderColor: selectedProId === pro.id ? pro.color : undefined,
                                backgroundColor: selectedProId === pro.id ? `${pro.color}10` : undefined,
                                color: selectedProId === pro.id ? pro.color : undefined
                            }}
                        >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pro.color }} />
                            {pro.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid da Agenda */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <div className={`${viewType === 'week' ? 'min-w-[1000px]' : 'min-w-full'} relative`}>
                        {/* Header do Grid (Dias) */}
                        <div className={`grid ${viewType === 'week' ? 'grid-cols-[80px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]'} border-b border-slate-200 bg-slate-50 calendar-grid-header`}>
                            <div className={`p-4 flex items-center justify-center text-[10px] font-bold text-slate-400 border-r border-slate-200 calendar-time-column`}>
                                GMT-3
                            </div>
                            {displayDays.map((day, i) => {
                                const isToday = day.toDateString() === new Date().toDateString();
                                return (
                                    <div key={i} className={`p-4 text-center border-r border-slate-200 last:border-r-0 ${isToday ? 'bg-orange-500/5 calendar-cell-today' : ''}`}>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isToday ? 'text-orange-500' : 'text-slate-400'}`}>
                                            {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                        </p>
                                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${isToday ? 'bg-orange-500 text-white' : 'text-slate-600'}`}>
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
                                    className={`absolute ${viewType === 'week' ? 'left-[80px]' : 'left-[60px]'} right-0 z-20 flex items-center pointer-events-none`}
                                    style={{ top: `${timeLinePosition}px` }}
                                >
                                    <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                    <div className="flex-1 h-[2px] bg-red-500/30" />
                                </div>
                            )}

                            {timeSlots.map((time, slotIdx) => (
                                <div key={slotIdx} className={`grid ${viewType === 'week' ? 'grid-cols-[80px_repeat(7,1fr)]' : 'grid-cols-[60px_1fr]'} h-[100px] border-b border-slate-100 last:border-b-0 relative`}>
                                    {/* Horário na lateral */}
                                    <div className={`flex items-start justify-center pt-1 text-[11px] font-bold text-slate-400 border-r border-slate-200 bg-slate-50/50 calendar-time-column`}>
                                        {time}
                                    </div>

                                    {/* Células dos dias */}
                                    {displayDays.map((day, dayIdx) => {
                                        const dateStr = day.toISOString().split('T')[0];
                                        const hour = parseInt(time.split(':')[0]);
                                        
                                        // Agendamentos neste slot de hora
                                        const slotAppointments = filteredAppointments.filter(apt => 
                                            apt.date === dateStr && parseInt(apt.time.split(':')[0]) === hour
                                        );

                                        return (
                                            <div key={dayIdx} className={`relative border-r border-slate-100 last:border-r-0 overflow-hidden grid grid-rows-2 h-full ${day.toDateString() === new Date().toDateString() ? 'bg-orange-500/5' : ''}`}>
                                                {/* Top half: :00 to :29 */}
                                                <div className="border-b border-slate-50 p-0.5 flex gap-1 overflow-hidden">
                                                    {slotAppointments.filter(a => parseInt(a.time.split(':')[1]) < 30).map(apt => (
                                                        <div 
                                                            key={apt.id}
                                                            onClick={() => setSelectedAppointment(apt)}
                                                            className={`p-1.5 rounded-lg border shadow-sm cursor-pointer hover:brightness-95 transition-all flex-1 min-w-0 border-l-4 h-fit max-h-full ${getStatusStyles(apt.status)}`}
                                                            style={{ 
                                                                borderColor: getProColor(apt.professionalId),
                                                                backgroundColor: `${getProColor(apt.professionalId)}10`
                                                            }}
                                                        >
                                                            <p className="text-[10px] font-bold truncate leading-tight text-slate-900">{apt.clientName}</p>
                                                            <p className="text-[8px] text-slate-500 truncate mb-0.5">
                                                                {apt.serviceIds.map(sid => services.find(s => s.id === sid)?.name).join(', ')}
                                                            </p>
                                                            <div className="flex items-center gap-1">
                                                                <div className={`w-1 h-1 rounded-full ${
                                                                    apt.status === 'completed' ? 'bg-[#1a8a6c]' : 
                                                                    apt.status === 'noshow' ? 'bg-red-400' : 
                                                                    apt.status === 'cancelled' ? 'bg-red-500' :
                                                                    apt.status === 'confirmed' ? 'bg-blue-500' : 'bg-orange-500'
                                                                }`} />
                                                                <span className={`text-[7px] font-bold uppercase tracking-tighter ${apt.status === 'cancelled' ? 'text-red-500' : 'text-slate-500'}`}>{getStatusLabel(apt.status)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Bottom half: :30 to :59 */}
                                                <div className="p-0.5 flex gap-1 overflow-hidden">
                                                    {slotAppointments.filter(a => parseInt(a.time.split(':')[1]) >= 30).map(apt => (
                                                        <div 
                                                            key={apt.id}
                                                            onClick={() => setSelectedAppointment(apt)}
                                                            className={`p-1.5 rounded-lg border shadow-sm cursor-pointer hover:brightness-95 transition-all flex-1 min-w-0 border-l-4 h-fit max-h-full ${getStatusStyles(apt.status)}`}
                                                            style={{ 
                                                                borderColor: getProColor(apt.professionalId),
                                                                backgroundColor: `${getProColor(apt.professionalId)}10`
                                                            }}
                                                        >
                                                            <p className="text-[10px] font-bold truncate leading-tight text-slate-900">{apt.clientName}</p>
                                                            <p className="text-[8px] text-slate-500 truncate mb-0.5">
                                                                {apt.serviceIds.map(sid => services.find(s => s.id === sid)?.name).join(', ')}
                                                            </p>
                                                            <div className="flex items-center gap-1">
                                                                <div className={`w-1 h-1 rounded-full ${
                                                                    apt.status === 'completed' ? 'bg-[#1a8a6c]' : 
                                                                    apt.status === 'noshow' ? 'bg-red-400' : 
                                                                    apt.status === 'cancelled' ? 'bg-red-500' :
                                                                    apt.status === 'confirmed' ? 'bg-blue-500' : 'bg-orange-500'
                                                                }`} />
                                                                <span className={`text-[7px] font-bold uppercase tracking-tighter ${apt.status === 'cancelled' ? 'text-red-500' : 'text-slate-500'}`}>{getStatusLabel(apt.status)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Horário de Almoço Dinâmico */}
                                    {(() => {
                                        if (selectedProId === 'all') return null;
                                        
                                        const pro = professionals.find(p => p.id === selectedProId);
                                        if (!pro?.workSchedule) return null;

                                        const dayName = displayDays[0].toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof pro.workSchedule;
                                        const schedule = pro.workSchedule[dayName];
                                        
                                        if (!schedule || !schedule.active) return null;

                                        const [lStartH] = schedule.lunchStart.split(':').map(Number);
                                        const [lEndH] = schedule.lunchEnd.split(':').map(Number);
                                        const currentH = parseInt(time.split(':')[0]);

                                        if (currentH >= lStartH && currentH < lEndH) {
                                            return (
                                                <div className={`absolute inset-0 z-10 bg-slate-100/60 backdrop-blur-[2px] flex items-center justify-center pointer-events-none border-y border-slate-200 border-dashed`}>
                                                    <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-white border border-slate-200 shadow-md">
                                                        <Utensils size={14} className="text-slate-400" />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Horário de Almoço</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
