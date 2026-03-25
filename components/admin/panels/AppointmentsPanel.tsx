import React, { useState, useMemo } from 'react';
import { useShop } from '../../../store';
import { Search, Filter, Plus, X, Calendar, Clock, User, Scissors, Check, Loader2, List, Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';
import { WeeklyCalendar } from './WeeklyCalendar';

export const AppointmentsPanel: React.FC = () => {
    const { appointments, professionals, services, updateAppointmentStatus, updateAppointmentPaymentMethod, createManualAppointment, settings } = useShop();
    const { showToast } = useToast();

    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    // Filtros de Status e Busca
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Filtros de Data (Design Financeiro)
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]); // Default: Hoje
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7); // Default: +7 dias
        return d.toISOString().split('T')[0];
    });
    const [activePreset, setActivePreset] = useState<string>('week');

    // Modal de Novo Agendamento
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        clientName: '',
        clientPhone: '',
        serviceIds: [] as string[],
        professionalId: '',
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        status: 'confirmed',
        paymentMethod: 'pix'
    });

    // --- Lógica de Filtros de Data ---
    const setPreset = (type: 'today' | 'tomorrow' | 'week' | 'month' | 'all') => {
        const today = new Date();
        const start = new Date(today);
        const end = new Date(today);
        
        setActivePreset(type);

        if (type === 'today') {
            // Start e End são hoje
        } else if (type === 'tomorrow') {
            start.setDate(today.getDate() + 1);
            end.setDate(today.getDate() + 1);
        } else if (type === 'week') {
            // Próximos 7 dias
            end.setDate(today.getDate() + 7);
        } else if (type === 'month') {
            start.setDate(1); // Primeiro dia deste mês
            end.setMonth(end.getMonth() + 1);
            end.setDate(0); // Último dia deste mês
        } else if (type === 'all') {
            // Um intervalo bem grande para pegar tudo (limitado pela query do Supabase que pega 30 dias passados + futuros)
            start.setFullYear(2023);
            end.setFullYear(2030);
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        setActivePreset('custom');
        if (type === 'start') setStartDate(value);
        else setEndDate(value);
    };

    const filteredAppointments = useMemo(() => {
        return appointments.filter(apt => {
            const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
            const matchesSearch = apt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  apt.clientPhone.includes(searchTerm);
            const matchesDate = apt.date >= startDate && apt.date <= endDate;

            return matchesStatus && matchesSearch && matchesDate;
        });
    }, [appointments, statusFilter, searchTerm, startDate, endDate]);

    const getProName = (id: string | null) => {
        if (!id) return 'Sem preferência';
        return professionals.find(p => p.id === id)?.name || 'Desconhecido';
    };

    const getServicesNames = (ids: string[]) => {
        return ids.map(id => services.find(s => s.id === id)?.name).join(', ');
    };

    const calculateTotal = () => {
        return formData.serviceIds.reduce((acc, id) => {
            const s = services.find(srv => srv.id === id);
            return acc + (s ? s.price : 0);
        }, 0);
    };

    const toggleService = (id: string) => {
        setFormData(prev => {
            const exists = prev.serviceIds.includes(id);
            if (exists) return { ...prev, serviceIds: prev.serviceIds.filter(sid => sid !== id) };
            return { ...prev, serviceIds: [...prev.serviceIds, id] };
        });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.serviceIds.length === 0) {
            showToast('Selecione pelo menos um serviço.', 'error');
            return;
        }

        setIsSaving(true);
        const { success, error } = await createManualAppointment({
            clientName: formData.clientName,
            clientPhone: formData.clientPhone || '(00) 00000-0000',
            serviceIds: formData.serviceIds,
            professionalId: formData.professionalId || null,
            date: formData.date,
            time: formData.time,
            totalValue: calculateTotal(),
            status: formData.status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'noshow',
            paymentMethod: formData.status === 'completed' ? formData.paymentMethod as any : undefined
        });
        setIsSaving(false);

        if (success) {
            showToast('Agendamento registrado com sucesso!');
            setIsModalOpen(false);
            setFormData({
                clientName: '',
                clientPhone: '',
                serviceIds: [],
                professionalId: '',
                date: new Date().toISOString().split('T')[0],
                time: '12:00',
                status: 'confirmed',
                paymentMethod: 'pix'
            });
        } else {
            showToast(error || 'Erro ao criar agendamento.', 'error');
        }
    };

    const STATUS_COLORS: Record<string, string> = {
        scheduled: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        confirmed: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
        completed: 'text-green-400 bg-green-400/10 border-green-400/20',
        cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
        noshow: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
    };

    const STATUS_LABELS: Record<string, string> = {
        scheduled: 'Agendado',
        confirmed: 'Confirmado',
        completed: 'Finalizado',
        cancelled: 'Cancelado',
        noshow: 'Não veio'
    };

    return (
        <div className="relative pb-20">
            {/* Modal de Novo Agendamento Manual */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
                >
                    <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl shadow-2xl relative animate-scale-up max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800 z-10">
                            <h3 className="text-xl font-bold text-white">Novo Agendamento Manual</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleCreate} className="p-6 space-y-6">
                            {/* Cliente */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Nome do Cliente</label>
                                    <input required value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" placeholder="Ex: João Silva" />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Telefone (Opcional)</label>
                                    <input value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" placeholder="(11) 99999-9999" />
                                </div>
                            </div>

                            {/* Data, Hora e Profissional */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Data</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 text-slate-500" size={16}/>
                                        <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:outline-none focus:border-orange-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Hora</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-3 text-slate-500" size={16}/>
                                        <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:outline-none focus:border-orange-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Barbeiro</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 text-slate-500" size={16}/>
                                        <select value={formData.professionalId} onChange={e => setFormData({...formData, professionalId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:outline-none focus:border-orange-500 appearance-none">
                                            <option value="">Qualquer um</option>
                                            {professionals.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Serviços */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Serviços Realizados</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {services.map(s => {
                                        const selected = formData.serviceIds.includes(s.id);
                                        return (
                                            <div 
                                                key={s.id} 
                                                onClick={() => toggleService(s.id)}
                                                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${selected ? 'bg-orange-500/20 border-orange-500/50' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected ? 'bg-orange-500 border-orange-500' : 'border-slate-500'}`}>
                                                        {selected && <Check size={10} className="text-white"/>}
                                                    </div>
                                                    <span className="text-sm font-medium">{s.name}</span>
                                                </div>
                                                <span className="text-sm text-slate-400">R$ {s.price}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Status e Total */}
                            <div className="flex flex-col sm:flex-row gap-4 items-end pt-4 border-t border-slate-700">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm text-slate-400 mb-1">Status Inicial</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500">
                                        <option value="scheduled">Agendado (Futuro)</option>
                                        <option value="confirmed">Confirmado (Cliente Confirmou)</option>
                                        <option value="completed">Finalizado (Já pagou/saiu)</option>
                                        <option value="noshow">Não Compareceu</option>
                                    </select>
                                </div>
                                {formData.status === 'completed' && (
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm text-slate-400 mb-1">Forma de Pagamento</label>
                                        <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500">
                                            <option value="pix">PIX</option>
                                            <option value="credit">Cartão de Crédito</option>
                                            <option value="cash">Dinheiro</option>
                                        </select>
                                    </div>
                                )}
                                <div className="text-right">
                                    <p className="text-sm text-slate-400">Total Estimado</p>
                                    <p className="text-2xl font-bold" style={{ color: settings.primaryColor }}>R$ {calculateTotal().toFixed(2)}</p>
                                </div>
                            </div>

                            <button type="submit" disabled={isSaving} className="w-full py-4 rounded-lg text-white font-bold text-lg hover:brightness-110 flex items-center justify-center gap-2" style={{ backgroundColor: settings.primaryColor }}>
                                {isSaving ? <Loader2 className="animate-spin"/> : 'Registrar Agendamento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white hidden md:block">Agendamentos</h2>
                <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex gap-1 w-full md:w-auto">
                    <button 
                        onClick={() => setViewMode('calendar')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <CalendarIcon size={16} /> Agenda
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                        <List size={16} /> Lista
                    </button>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <WeeklyCalendar onNewAppointment={() => setIsModalOpen(true)} />
            ) : (
                <>
                    {/* Cabeçalho Simplificado */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <p className="text-slate-400">Gerencie sua agenda e registre atendimentos manuais.</p>
                        </div>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-bold shadow-lg hover:opacity-90 transition-all" 
                            style={{ backgroundColor: settings.primaryColor }}
                        >
                            <Plus size={20} /> Novo Agendamento
                        </button>
                    </div>

                    {/* BARRA DE FILTROS DE DATA (Design Financeiro) */}
                    <div className="bg-slate-800 p-1 md:p-1.5 rounded-xl border border-slate-700 flex flex-col lg:flex-row justify-between items-center gap-2 shadow-xl mb-4">
                        {/* Abas de Atalho */}
                        <div className="flex bg-slate-900/50 p-1 rounded-lg w-full lg:w-auto overflow-x-auto py-1 hide-scrollbar no-scrollbar">
                            {[
                                { id: 'today', label: 'Hoje' },
                                { id: 'tomorrow', label: 'Amanhã' },
                                { id: 'week', label: 'Semana' },
                                { id: 'month', label: 'Mês' },
                                { id: 'all', label: 'Tudo' }
                            ].map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => setPreset(preset.id as any)}
                                    className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md text-[10px] md:text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                                        activePreset === preset.id 
                                        ? 'bg-slate-700 text-white shadow-sm' 
                                        : 'text-slate-500 hover:text-white hover:bg-slate-800'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        {/* Seletor de Datas Unificado */}
                        <div className="flex items-center gap-2 w-full lg:w-auto bg-slate-900 px-3 py-1.5 md:py-2 rounded-lg border border-slate-700 focus-within:border-orange-500/50 transition-colors">
                            <Calendar size={14} className="text-slate-500 shrink-0" />
                            <div className="flex items-center gap-2 flex-1">
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => handleDateChange('start', e.target.value)}
                                    className="bg-transparent border-none text-slate-300 text-[11px] md:text-sm focus:outline-none w-full cursor-pointer font-sans"
                                />
                                <span className="text-slate-600 font-medium text-[10px]">até</span>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => handleDateChange('end', e.target.value)}
                                    className="bg-transparent border-none text-slate-300 text-[11px] md:text-sm focus:outline-none w-full cursor-pointer font-sans"
                                />
                            </div>
                        </div>
                    </div>

                    {/* BARRA DE FILTROS DE STATUS E BUSCA */}
                    <div className="bg-slate-800 p-3 md:p-4 rounded-xl border border-slate-700 mb-6 flex flex-col gap-3 md:gap-4">
                        <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-center">
                            {/* Busca */}
                            <div className="bg-slate-900 border border-slate-700 rounded-lg flex items-center px-3 py-1.5 md:py-2 text-slate-400 w-full md:w-96">
                                <Search size={16} className="mr-2 shrink-0"/>
                                <input 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar cliente..." 
                                    className="bg-transparent border-none outline-none w-full text-[12px] md:text-sm placeholder-slate-600" 
                                />
                            </div>

                            {/* Filtros de Status */}
                            <div className="flex gap-1.5 overflow-x-auto py-1 hide-scrollbar no-scrollbar w-full md:w-auto">
                                {[
                                    { id: 'all', label: 'Todos' },
                                    { id: 'scheduled', label: 'Agendados' },
                                    { id: 'confirmed', label: 'Confirmados' },
                                    { id: 'completed', label: 'Finalizados' },
                                    { id: 'cancelled', label: 'Cancelados' },
                                    { id: 'noshow', label: 'Faltas' }
                                ].map(status => (
                                    <button
                                        key={status.id}
                                        onClick={() => setStatusFilter(status.id)}
                                        className={`px-3 py-1.5 rounded-full text-[9px] md:text-[10px] font-bold whitespace-nowrap transition-colors border uppercase tracking-wider ${
                                            statusFilter === status.id 
                                            ? `bg-slate-700 text-white border-slate-500` 
                                            : 'bg-transparent text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                                        }`}
                                    >
                                        {status.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Agendamentos (Desktop) / Cards (Mobile) */}
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-950/50 text-slate-400 text-sm border-b border-slate-700">
                                        <th className="p-4 font-medium whitespace-nowrap">Status</th>
                                        <th className="p-4 font-medium whitespace-nowrap">Data/Hora</th>
                                        <th className="p-4 font-medium">Cliente</th>
                                        <th className="p-4 font-medium">Serviços / Profissional</th>
                                        <th className="p-4 font-medium text-right">Valor</th>
                                        <th className="p-4 font-medium text-right">Pagamento</th>
                                        <th className="p-4 font-medium text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {filteredAppointments.map(apt => {
                                        // Lógica para bloquear status futuros
                                        const apptDateTime = new Date(`${apt.date}T${apt.time}`);
                                        const now = new Date();
                                        const isFuture = apptDateTime > now;

                                        return (
                                        <tr key={apt.id} className="hover:bg-slate-700/30 transition-colors group border-b border-slate-700/50 last:border-0">
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled}`}>
                                                    {STATUS_LABELS[apt.status] || apt.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-300 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-500"/>
                                                    <span>{new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Clock size={14} className="text-slate-500"/>
                                                    <span className="text-sm font-bold">{apt.time.substring(0, 5)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-white text-base">{apt.clientName}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{apt.clientPhone}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1 text-sm text-slate-300 mb-1">
                                                    <Scissors size={14} className="text-orange-500"/> 
                                                    <span className="truncate max-w-[150px] sm:max-w-[200px]" title={getServicesNames(apt.serviceIds)}>{getServicesNames(apt.serviceIds)}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <User size={12}/> 
                                                    <span>{getProName(apt.professionalId)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-bold text-lg" style={{ color: settings.primaryColor }}>
                                                R$ {apt.totalValue.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-right">
                                                {apt.status === 'completed' ? (
                                                    <select 
                                                        value={apt.paymentMethod || 'pix'}
                                                        onChange={(e) => updateAppointmentPaymentMethod(apt.id, e.target.value)}
                                                        className="bg-slate-900 border border-slate-600 text-slate-300 text-xs rounded p-2 focus:outline-none focus:border-orange-500 cursor-pointer hover:bg-slate-800"
                                                    >
                                                        <option value="pix">PIX</option>
                                                        <option value="credit">Cartão</option>
                                                        <option value="cash">Dinheiro</option>
                                                    </select>
                                                ) : (
                                                    <span className="text-slate-500 text-xs">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <select 
                                                    value={apt.status}
                                                    onChange={(e) => {
                                                        updateAppointmentStatus(apt.id, e.target.value);
                                                        if (e.target.value === 'completed' && !apt.paymentMethod) {
                                                            updateAppointmentPaymentMethod(apt.id, 'pix'); // Default to PIX when completing
                                                        }
                                                    }}
                                                    className="bg-slate-900 border border-slate-600 text-slate-300 text-xs rounded p-2 focus:outline-none focus:border-orange-500 cursor-pointer hover:bg-slate-800"
                                                >
                                                    <option value="scheduled">Agendado</option>
                                                    <option value="confirmed">Confirmado</option>
                                                    <option value="completed" disabled={isFuture && apt.status !== 'completed'}>
                                                        Finalizado {isFuture && apt.status !== 'completed' ? '(Aguarde horário)' : ''}
                                                    </option>
                                                    <option value="noshow" disabled={isFuture && apt.status !== 'noshow'}>
                                                        Não veio {isFuture && apt.status !== 'noshow' ? '(Aguarde horário)' : ''}
                                                    </option>
                                                    <option value="cancelled">Cancelar</option>
                                                </select>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>

                        {/* Lista de Cards (Mobile) */}
                        <div className="md:hidden divide-y divide-slate-700">
                            {filteredAppointments.map(apt => {
                                const apptDateTime = new Date(`${apt.date}T${apt.time}`);
                                const now = new Date();
                                const isFuture = apptDateTime > now;

                                return (
                                    <div key={apt.id} className="p-4 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-white text-lg">{apt.clientName}</div>
                                                <div className="text-xs text-slate-500">{apt.clientPhone}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled}`}>
                                                {STATUS_LABELS[apt.status] || apt.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Calendar size={14} className="text-slate-500"/>
                                                <span>{new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <Clock size={14} className="text-slate-500"/>
                                                <span className="font-bold">{apt.time.substring(0, 5)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1 text-sm text-slate-300">
                                                <Scissors size={14} className="text-orange-500 shrink-0"/> 
                                                <span className="truncate">{getServicesNames(apt.serviceIds)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <User size={12} className="shrink-0"/> 
                                                <span>{getProName(apt.professionalId)}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                                            <div className="font-bold text-lg" style={{ color: settings.primaryColor }}>
                                                R$ {apt.totalValue.toFixed(2)}
                                            </div>
                                            <div className="flex gap-2">
                                                {apt.status === 'completed' && (
                                                    <select 
                                                        value={apt.paymentMethod || 'pix'}
                                                        onChange={(e) => updateAppointmentPaymentMethod(apt.id, e.target.value)}
                                                        className="bg-slate-900 border border-slate-600 text-slate-300 text-[10px] rounded p-1.5 focus:outline-none focus:border-orange-500"
                                                    >
                                                        <option value="pix">PIX</option>
                                                        <option value="credit">Cartão</option>
                                                        <option value="cash">Dinheiro</option>
                                                    </select>
                                                )}
                                                <select 
                                                    value={apt.status}
                                                    onChange={(e) => {
                                                        updateAppointmentStatus(apt.id, e.target.value);
                                                        if (e.target.value === 'completed' && !apt.paymentMethod) {
                                                            updateAppointmentPaymentMethod(apt.id, 'pix');
                                                        }
                                                    }}
                                                    className="bg-slate-900 border border-slate-600 text-slate-300 text-[10px] rounded p-1.5 focus:outline-none focus:border-orange-500"
                                                >
                                                    <option value="scheduled">Agendado</option>
                                                    <option value="confirmed">Confirmado</option>
                                                    <option value="completed" disabled={isFuture && apt.status !== 'completed'}>Finalizado</option>
                                                    <option value="noshow" disabled={isFuture && apt.status !== 'noshow'}>Falta</option>
                                                    <option value="cancelled">Cancelar</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {filteredAppointments.length === 0 && (
                            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                                <Filter size={32} className="mb-2 opacity-20"/>
                                <p>Nenhum agendamento encontrado.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};