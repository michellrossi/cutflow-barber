import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useShop } from '../../../store';
import { Search, Filter, Plus, X, Calendar, Clock, User, Scissors, Check, Loader2, List, Calendar as CalendarIcon, Phone, MessageCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';
import { WeeklyCalendar } from './WeeklyCalendar';
import { formatMessage, getWhatsAppLink } from '../../../utils/messageFormatter';
import { motion, AnimatePresence } from 'framer-motion';

export const AppointmentsPanel: React.FC = () => {
    const {
        appointments,
        professionals,
        services,
        updateAppointmentStatus,
        updateAppointmentPaymentMethod,
        updateAppointmentTotalValue,
        createManualAppointment,
        settings,
        messageTemplates,
        clients,
        reloadClients,
        clientSubscriptions,
        subscriptionPlans,
        cashSessions,
        addCashMovement,
        processLoyalty,
        blockedSlots
    } = useShop();
    const { showToast } = useToast();

    useEffect(() => {
        if (settings?.id && clients.length === 0) {
            reloadClients(settings.id);
        }
    }, [settings?.id, clients.length, reloadClients]);

    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');

    // Filtros de Status e Busca
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Filtros de Data (Design Financeiro)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setFullYear(2023); // Default: Tudo (como o preset 'all')
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setFullYear(2030);
        return d.toISOString().split('T')[0];
    });
    const [activePreset, setActivePreset] = useState<string>('all');

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
        paymentMethod: 'pix',
        usedSubscriptionId: ''
    });

    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const suggestionRef = useRef<HTMLDivElement>(null);

    const filteredClientsForSuggestions = useMemo(() => {
        if (!formData.clientName) return clients.slice(0, 10);
        return clients.filter(c => 
            c.name.toLowerCase().includes(formData.clientName.toLowerCase()) ||
            (c.lastName && c.lastName.toLowerCase().includes(formData.clientName.toLowerCase())) ||
            c.phone.includes(formData.clientName)
        ).slice(0, 10);
    }, [formData.clientName, clients]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
                setShowClientSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Modal de Conclusão (Venda de Produtos)
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [completionTarget, setCompletionTarget] = useState<any>(null);
    const [selectedProductsForCompletion, setSelectedProductsForCompletion] = useState<{ productId: string, quantity: number, unitPrice: number }[]>([]);
    const { products, addAppointmentProducts } = useShop();
    const [isFinishing, setIsFinishing] = useState(false);

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

    const availableSubscriptions = useMemo(() => {
        if (!formData.clientPhone && !formData.clientName) return [];

        // Tentar achar o cliente pelo telefone primeiro
        const client = clients.find(c =>
            (formData.clientPhone && c.phone === formData.clientPhone) ||
            (formData.clientName && c.name.toLowerCase() === formData.clientName.toLowerCase())
        );

        if (!client) return [];

        return clientSubscriptions.filter(s => s.clientId === client.id && s.status === 'active');
    }, [formData.clientPhone, formData.clientName, clients, clientSubscriptions]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.serviceIds.length === 0) {
            showToast('Selecione pelo menos um serviço.', 'error');
            return;
        }

        setIsSaving(true);

        const timeToMins = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        const totalDuration = formData.serviceIds.reduce((acc, id) => {
            const s = services.find(srv => srv.id === id);
            return acc + (s ? s.duration : 0);
        }, 0);

        const targetTime = timeToMins(formData.time);
        const serviceEndTime = targetTime + totalDuration;
        let finalProId = formData.professionalId;

        // Auto-atribuir profissional se "Qualquer um" (vazio)
        if (!finalProId) {
            const getDayN = (d: string) => {
                const date = new Date(d + 'T12:00:00');
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                return days[date.getDay()];
            };

            const dayName = getDayN(formData.date);

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
                const proBlocks = blockedSlots.filter(b => b.professionalId === pro.id && b.date === formData.date);
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
                const proAppts = appointments.filter(a => a.professionalId === pro.id && a.date === formData.date && a.status !== 'cancelled' && a.status !== 'noshow');
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
            showToast('Nenhum profissional disponível para este horário.', 'error');
            setIsSaving(false);
            return;
        }

        const { success, error } = await createManualAppointment({
            clientName: formData.clientName,
            clientPhone: formData.clientPhone || '(00) 00000-0000',
            serviceIds: formData.serviceIds,
            professionalId: finalProId,
            date: formData.date,
            time: formData.time,
            totalValue: calculateTotal(),
            usedSubscriptionId: formData.usedSubscriptionId || undefined,
            status: formData.status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'noshow',
            paymentMethod: formData.status === 'completed' ? formData.paymentMethod as any : undefined
        });
        setIsSaving(false);

        if (success) {
            showToast('Agendamento registrado com sucesso!');
            setIsModalOpen(false);
            // Auto registro no fluxo de caixa se concluído em dinheiro no momento da criação
            if (formData.status === 'completed' && formData.paymentMethod === 'cash') {
                const openSession = cashSessions.find(s => s.status === 'open');
                if (openSession) {
                    addCashMovement({ 
                        type: 'input', 
                        category: 'Venda / Serviço', 
                        amount: calculateTotal(), 
                        description: `Agendamento: ${formData.clientName}` 
                    });
                }
            }

            setFormData({
                clientName: '',
                clientPhone: '',
                serviceIds: [],
                professionalId: '',
                date: new Date().toISOString().split('T')[0],
                time: '12:00',
                status: 'confirmed',
                paymentMethod: 'pix',
                usedSubscriptionId: ''
            });
        } else {
            showToast(error || 'Erro ao criar agendamento.', 'error');
        }
    };

    const getClientActiveSubscription = (clientPhone: string, clientName: string) => {
        const client = clients.find(c =>
            (clientPhone && c.phone === clientPhone) ||
            (clientName && c.name.toLowerCase() === clientName.toLowerCase())
        );
        if (!client) return null;
        return clientSubscriptions.find(s => s.clientId === client.id && s.status === 'active');
    };

    const STATUS_COLORS: Record<string, string> = {
        scheduled: 'text-blue-700 bg-blue-50 border-blue-200',
        confirmed: 'text-orange-700 bg-orange-50 border-orange-200',
        completed: 'text-[#1a8a6c] bg-[#f0fdfa] border-[#ccfbf1]',
        cancelled: 'text-red-700 bg-red-50 border-red-200',
        noshow: 'text-slate-700 bg-slate-50 border-slate-200',
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Gestão de Horários</h2>
                    <p className="text-[#6b7d99] text-sm font-medium">Gerencie sua agenda e registre atendimentos.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-orange-600 text-white font-bold px-6 py-3 rounded-[2rem] flex items-center justify-center gap-2 transition-all shadow-[0px_4px_10px_rgba(234,88,12,0.2)] hover:bg-orange-700 whitespace-nowrap"
                    >
                        <Plus size={20} className="stroke-[3px]" />
                        <span className="hidden sm:inline">Novo</span>
                    </button>
                </div>
            </div>

            {/* Modal de Novo Agendamento Manual */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
                >
                    <div className="bg-white rounded-lg border border-slate-200 w-full max-w-2xl shadow-2xl relative animate-scale-up max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-xl font-bold text-slate-900">Novo Agendamento Manual</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-6">
                            {/* Cliente */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative" ref={suggestionRef}>
                                    <label className="block text-sm text-slate-500 mb-1">Nome do Cliente</label>
                                    <div className="relative">
                                        <input 
                                            required 
                                            value={formData.clientName} 
                                            onChange={e => {
                                                setFormData({ ...formData, clientName: e.target.value });
                                                setShowClientSuggestions(true);
                                            }} 
                                            onFocus={() => setShowClientSuggestions(true)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500" 
                                            placeholder="Ex: João Silva" 
                                            autoComplete="off"
                                        />
                                        {showClientSuggestions && (
                                            <div className="absolute z-[100] w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-2xl overflow-hidden animate-fade-in border-t-4 border-t-orange-500">
                                                <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {filteredClientsForSuggestions.length > 0 ? 'Clientes Cadastrados' : 'Nenhum cliente encontrado'}
                                                </div>
                                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                                    {filteredClientsForSuggestions.map(client => (
                                                        <div 
                                                            key={client.id}
                                                            onClick={() => {
                                                                setFormData({ 
                                                                    ...formData, 
                                                                    clientName: `${client.name} ${client.lastName || ''}`.trim(),
                                                                    clientPhone: client.phone 
                                                                });
                                                                setShowClientSuggestions(false);
                                                            }}
                                                            className="p-3 hover:bg-orange-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors group"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <div className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{client.name} {client.lastName}</div>
                                                                    <div className="text-xs text-slate-500">{client.phone}</div>
                                                                </div>
                                                                <div className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-500 transition-colors">Selecionar</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {/* Remoção do botão de Novo Cliente Manual na lista de sugestões */}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-500 mb-1">Telefone (Opcional)</label>
                                    <input value={formData.clientPhone} onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500" placeholder="(11) 99999-9999" />
                                </div>
                            </div>

                            {/* Data, Hora e Profissional */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-500 mb-1">Data</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                                        <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 pl-10 text-slate-900 focus:outline-none focus:border-orange-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-500 mb-1">Hora</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-3 text-slate-400" size={16} />
                                        <input type="time" required value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 pl-10 text-slate-900 focus:outline-none focus:border-orange-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-500 mb-1">Barbeiro</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 text-slate-400" size={16} />
                                        <select value={formData.professionalId} onChange={e => setFormData({ ...formData, professionalId: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 pl-10 text-slate-900 focus:outline-none focus:border-orange-500 appearance-none">
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
                                <label className="block text-sm text-slate-500 mb-2">Serviços Realizados</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {services.map(s => {
                                        const selected = formData.serviceIds.includes(s.id);
                                        return (
                                            <div
                                                key={s.id}
                                                onClick={() => toggleService(s.id)}
                                                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${selected ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${selected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                                                        {selected && <Check size={10} className="text-white" />}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-900">{s.name}</span>
                                                </div>
                                                <span className="text-sm text-slate-500">R$ {s.price}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Status e Total */}
                            <div className="flex flex-col sm:flex-row gap-4 items-end pt-4 border-t border-slate-200">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm text-slate-500 mb-1">Status Inicial</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500">
                                        <option value="scheduled">Agendado (Futuro)</option>
                                        <option value="confirmed">Confirmado (Cliente Confirmou)</option>
                                        <option value="completed">Finalizado (Já pagou/saiu)</option>
                                        <option value="noshow">Não Compareceu</option>
                                    </select>
                                </div>
                                {formData.status === 'completed' && (
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm text-slate-500 mb-1">Forma de Pagamento</label>
                                        <select value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500">
                                            <option value="pix">PIX</option>
                                            <option value="credit">Cartão de Crédito</option>
                                            <option value="cash">Dinheiro</option>
                                            {availableSubscriptions.length > 0 && (
                                                <option value="subscription">Assinatura</option>
                                            )}
                                        </select>
                                    </div>
                                )}
                                {formData.paymentMethod === 'subscription' && availableSubscriptions.length > 0 && (
                                    <div className="flex-1 w-full">
                                        <label className="block text-sm text-slate-500 mb-1">Qual Assinatura?</label>
                                        <select
                                            value={formData.usedSubscriptionId}
                                            onChange={e => setFormData({ ...formData, usedSubscriptionId: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500"
                                            required
                                        >
                                            <option value="">Selecione a assinatura</option>
                                            {availableSubscriptions.map(sub => {
                                                const plan = subscriptionPlans.find(p => p.id === sub.planId);
                                                return (
                                                    <option key={sub.id} value={sub.id}>
                                                        {plan?.name} ({sub.servicesUsedThisMonth}/{plan?.servicesPerMonth} usados)
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                )}
                                <div className="text-right">
                                    <p className="text-sm text-slate-500">Total Estimado</p>
                                    <p className="text-2xl font-bold" style={{ color: settings.primaryColor }}>R$ {calculateTotal().toFixed(2)}</p>
                                </div>
                            </div>

                            <button type="submit" disabled={isSaving} className="w-full py-4 rounded-lg text-white font-bold text-lg hover:brightness-110 flex items-center justify-center gap-2" style={{ backgroundColor: settings.primaryColor }}>
                                {isSaving ? <Loader2 className="animate-spin" /> : 'Registrar Agendamento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modo Lista Filtros */}
            {(() => {
                const ModeToggle = (
                    <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center flex-nowrap gap-1 shadow-sm w-max overflow-x-auto no-scrollbar shrink-0">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'list' ? 'bg-orange-500 text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 bg-transparent'}`}
                        >
                            <List size={16} /> Lista
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'calendar' ? 'bg-orange-500 text-white shadow-sm font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 bg-transparent'}`}
                        >
                            <CalendarIcon size={16} /> Agenda
                        </button>
                    </div>
                );

                return (
                    <>
                        {viewMode === 'list' && (
                            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 mb-4">
                                <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center flex-nowrap gap-1 shadow-sm w-max overflow-x-auto no-scrollbar max-w-full">
                        {/* Abas de Atalho */}
                        <div className="flex bg-slate-50 p-1 rounded-md shrink-0 border border-slate-200 gap-1">
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
                                    className={`px-3 md:px-4 py-1.5 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activePreset === preset.id
                                            ? 'bg-orange-500 text-white shadow-sm border border-orange-600'
                                            : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        {/* Seletor de Datas Unificado */}
                        <div className="flex items-center gap-2 shrink-0 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-orange-500/50 transition-colors">
                            <Calendar size={14} className="text-slate-400 shrink-0" />
                            <div className="flex items-center gap-2 flex-1">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => handleDateChange('start', e.target.value)}
                                    className="bg-transparent border-none text-slate-700 text-[11px] md:text-sm focus:outline-none w-full cursor-pointer font-sans font-bold"
                                />
                                <span className="text-slate-400 font-bold text-[10px] uppercase">até</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => handleDateChange('end', e.target.value)}
                                    className="bg-transparent border-none text-slate-700 text-[11px] md:text-sm focus:outline-none w-full cursor-pointer font-sans font-bold"
                                />
                                </div>
                            </div>
                        </div>
                        {ModeToggle}
                    </div>
                )}

                {viewMode === 'calendar' ? (
                            <WeeklyCalendar 
                                onNewAppointment={() => setIsModalOpen(true)} 
                                onCompleteAppointment={(apt) => {
                                    setCompletionTarget(apt);
                                    setSelectedProductsForCompletion([]);
                                    setIsCompletionModalOpen(true);
                                }}
                                modeToggle={ModeToggle} 
                            />
                        ) : (
                            <>

                    {/* BARRA DE FILTROS DE STATUS E BUSCA */}
                    <div className="bg-white p-3 md:p-4 rounded-lg border border-slate-200 mb-6 flex flex-col gap-3 md:gap-4 shadow-sm">
                        <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-center">
                            {/* Busca */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg flex items-center px-4 py-2 text-slate-500 w-full md:w-96 focus-within:border-orange-500/50 transition-colors">
                                <Search size={16} className="mr-2 shrink-0 text-slate-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar cliente..."
                                    className="bg-transparent border-none outline-none w-full text-[12px] md:text-sm placeholder-slate-400 font-medium"
                                />
                            </div>

                            {/* Filtros de Status */}
                            <div className="flex gap-2 overflow-x-auto py-1 px-1 hide-scrollbar no-scrollbar w-full md:w-auto">
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
                                        className={`px-4 py-2 rounded-md text-[9px] md:text-[10px] font-bold whitespace-nowrap transition-all border uppercase tracking-wider ${statusFilter === status.id
                                                ? `bg-orange-50 text-orange-600 border-orange-200 shadow-sm`
                                                : 'bg-white text-[#6b7d99] border-slate-200 hover:border-slate-300 hover:text-slate-700'
                                            }`}
                                    >
                                        {status.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Agendamentos (Desktop) / Cards (Mobile) */}
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                                        <th className="p-4 font-bold whitespace-nowrap">Status</th>
                                        <th className="p-4 font-bold whitespace-nowrap">Data/Hora</th>
                                        <th className="p-4 font-bold">Cliente</th>
                                        <th className="p-4 font-bold">Serviços / Profissional</th>
                                        <th className="p-4 font-bold text-right">Valor</th>
                                        <th className="p-4 font-bold text-right">Pagamento</th>
                                        <th className="p-4 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredAppointments.map(apt => {
                                        // Lógica para bloquear status futuros
                                        const apptDateTime = new Date(`${apt.date}T${apt.time}`);
                                        const now = new Date();
                                        const isFuture = apptDateTime > now;
                                        const proColor = professionals.find(p => p.id === apt.professionalId)?.color || '#64748b';

                                        return (
                                            <tr key={apt.id} className="hover:bg-slate-50 transition-colors group border-b border-slate-100 last:border-0 border-l-4" style={{ borderLeftColor: proColor }}>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-sm text-[10px] font-bold border uppercase tracking-wider ${STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled}`}>
                                                        {STATUS_LABELS[apt.status] || apt.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-[#6b7d99] whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={14} className="text-slate-400" />
                                                        <span className="font-medium">{new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Clock size={14} className="text-slate-400" />
                                                        <span className="text-sm font-bold text-slate-900">{apt.time.substring(0, 5)}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-900 text-base">{apt.clientName}</div>
                                                    <div className="text-xs text-[#6b7d99] mt-0.5 font-medium">{apt.clientPhone}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-1 text-sm text-slate-700 mb-1 font-medium">
                                                        <Scissors size={14} className="text-orange-500" />
                                                        <span className="truncate max-w-[150px] sm:max-w-[200px]" title={getServicesNames(apt.serviceIds)}>{getServicesNames(apt.serviceIds)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-[#6b7d99] font-medium">
                                                        <User size={12} />
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
                                                            onChange={(e) => {
                                                                const method = e.target.value;
                                                                let subId = undefined;
                                                                if (method === 'subscription') {
                                                                    const sub = getClientActiveSubscription(apt.clientPhone, apt.clientName);
                                                                    subId = sub?.id;
                                                                }
                                                                updateAppointmentPaymentMethod(apt.id, method, subId);
                                                            }}
                                                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 focus:outline-none focus:border-orange-500 cursor-pointer hover:bg-slate-100 transition-colors"
                                                        >
                                                            <option value="pix">PIX</option>
                                                            <option value="credit">Cartão de Crédito</option>
                                                            <option value="debit">Cartão de Débito</option>
                                                            <option value="cash">Dinheiro</option>
                                                            {getClientActiveSubscription(apt.clientPhone, apt.clientName) && (
                                                                <option value="subscription">Assinatura</option>
                                                            )}
                                                        </select>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const template = messageTemplates.find(t => t.trigger === 'lembrete_agendamento' && t.active) || {
                                                                    content: `Olá [CLIENTE], lembrete do seu agendamento na [BARBEARIA] dia [DATA] às [HORA]. Confirmado?`
                                                                };

                                                                const pro = professionals.find(p => p.id === apt.professionalId);
                                                                const srvs = services.filter(s => apt.serviceIds.includes(s.id));

                                                                const message = formatMessage(template.content, {
                                                                    client: { name: apt.clientName, phone: apt.clientPhone },
                                                                    appointment: apt,
                                                                    professional: pro,
                                                                    services: srvs,
                                                                    shopName: settings.name
                                                                });

                                                                window.open(getWhatsAppLink(apt.clientPhone, message), '_blank');
                                                            }}
                                                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                                                            title="Enviar lembrete WhatsApp"
                                                        >
                                                            <MessageCircle size={14} />
                                                        </button>
                                                        <select
                                                            value={apt.status}
                                                            onChange={(e) => {
                                                                const newStatus = e.target.value;
                                                                if (newStatus === 'completed') {
                                                                    setCompletionTarget(apt);
                                                                    setSelectedProductsForCompletion([]);
                                                                    setIsCompletionModalOpen(true);
                                                                } else {
                                                                    const client = clients.find(c => c.id === apt.clientId || c.phone === apt.clientPhone);
                                                                    updateAppointmentStatus(apt.id, newStatus, client);
                                                                }
                                                            }}
                                                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 focus:outline-none focus:border-orange-500 cursor-pointer hover:bg-slate-100 transition-colors"
                                                        >
                                                            <option value="scheduled">Agendado</option>
                                                            <option value="confirmed">Confirmado</option>
                                                            <option value="completed" disabled={isFuture && apt.status !== 'completed'}>
                                                                Finalizado {isFuture && apt.status !== 'completed' ? '(Aguarde)' : ''}
                                                            </option>
                                                            <option value="noshow" disabled={isFuture && apt.status !== 'noshow'}>
                                                                Não veio {isFuture && apt.status !== 'noshow' ? '(Aguarde)' : ''}
                                                            </option>
                                                            <option value="cancelled">Cancelar</option>
                                                        </select>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Lista de Cards (Mobile) */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {filteredAppointments.map(apt => {
                                const apptDateTime = new Date(`${apt.date}T${apt.time}`);
                                const now = new Date();
                                const isFuture = apptDateTime > now;

                                return (
                                    <div key={apt.id} className="p-4 space-y-4 border-l-4" style={{ borderLeftColor: professionals.find(p => p.id === apt.professionalId)?.color || '#64748b' }}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-slate-900 text-lg">{apt.clientName}</div>
                                                <div className="text-xs text-[#6b7d99] font-medium">{apt.clientPhone}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-sm text-[10px] font-bold border uppercase tracking-wider ${STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled}`}>
                                                {STATUS_LABELS[apt.status] || apt.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="flex items-center gap-2 text-[#6b7d99] font-medium">
                                                <Calendar size={14} className="text-slate-400" />
                                                <span>{new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[#6b7d99]">
                                                <Clock size={14} className="text-slate-400" />
                                                <span className="font-bold text-slate-900">{apt.time.substring(0, 5)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1 text-sm text-slate-700 font-medium">
                                                <Scissors size={14} className="text-orange-500 shrink-0" />
                                                <span className="truncate">{getServicesNames(apt.serviceIds)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-[#6b7d99] font-medium">
                                                <User size={12} className="shrink-0" />
                                                <span>{getProName(apt.professionalId)}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        const template = messageTemplates.find(t => t.trigger === 'lembrete_agendamento' && t.active) || {
                                                            content: `Olá [CLIENTE], lembrete do seu agendamento na [BARBEARIA] dia [DATA] às [HORA]. Confirmado?`
                                                        };

                                                        const pro = professionals.find(p => p.id === apt.professionalId);
                                                        const srvs = services.filter(s => apt.serviceIds.includes(s.id));

                                                        const message = formatMessage(template.content, {
                                                            client: { name: apt.clientName, phone: apt.clientPhone },
                                                            appointment: apt,
                                                            professional: pro,
                                                            services: srvs,
                                                            shopName: settings.name
                                                        });

                                                        window.open(getWhatsAppLink(apt.clientPhone, message), '_blank');
                                                    }}
                                                    className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                                                    title="Enviar lembrete WhatsApp"
                                                >
                                                    <MessageCircle size={14} />
                                                </button>
                                                <div className="font-bold text-lg" style={{ color: settings.primaryColor }}>
                                                    R$ {apt.totalValue.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {apt.status === 'completed' && (
                                                    <select
                                                        value={apt.paymentMethod || 'pix'}
                                                        onChange={(e) => {
                                                            const method = e.target.value;
                                                            let subId = undefined;
                                                            if (method === 'subscription') {
                                                                const sub = getClientActiveSubscription(apt.clientPhone, apt.clientName);
                                                                subId = sub?.id;
                                                            }
                                                            updateAppointmentPaymentMethod(apt.id, method, subId);
                                                        }}
                                                        className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] rounded-lg p-1.5 focus:outline-none focus:border-orange-500"
                                                    >
                                                        <option value="pix">PIX</option>
                                                        <option value="credit">Cartão de Crédito</option>
                                                        <option value="debit">Cartão de Débito</option>
                                                        <option value="cash">Dinheiro</option>
                                                        {getClientActiveSubscription(apt.clientPhone, apt.clientName) && (
                                                            <option value="subscription">Assinatura</option>
                                                        )}
                                                    </select>
                                                )}
                                                <select
                                                    value={apt.status}
                                                    onChange={(e) => {
                                                        const newStatus = e.target.value;
                                                        if (newStatus === 'completed') {
                                                            setCompletionTarget(apt);
                                                            setSelectedProductsForCompletion([]);
                                                            setIsCompletionModalOpen(true);
                                                        } else {
                                                            const client = clients.find(c => c.id === apt.clientId || c.phone === apt.clientPhone);
                                                            updateAppointmentStatus(apt.id, newStatus, client);
                                                        }
                                                    }}
                                                    className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] rounded-lg p-1.5 focus:outline-none focus:border-orange-500"
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
                            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                                <Filter size={32} className="mb-2 opacity-20" />
                                <p>Nenhum agendamento encontrado.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
                    </>
                );
            })()}

            {/* Modal de Conclusão de Atendimento (Venda de Produtos) */}
            <AnimatePresence>
                {isCompletionModalOpen && completionTarget && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCompletionModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 bg-emerald-50">
                                <h3 className="text-xl font-bold text-emerald-900">Finalizar Atendimento</h3>
                                <p className="text-emerald-700 text-sm">Venda produtos adicionais e escolha a forma de pagamento.</p>
                            </div>

                            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                {/* Lista de Produtos Disponíveis */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-3 block text-center">Produtos Adicionais (Opcional)</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {products.length === 0 && (
                                            <p className="text-center text-slate-400 text-sm italic">Nenhum produto cadastrado no estoque.</p>
                                        )}
                                        {products.map(p => {
                                            const selected = selectedProductsForCompletion.find(sp => sp.productId === p.id);
                                            return (
                                                <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selected ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{p.category} • R$ {p.salePrice}</p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {selected ? (
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => {
                                                                        if (selected.quantity > 1) {
                                                                            setSelectedProductsForCompletion(prev => prev.map(sp => sp.productId === p.id ? { ...sp, quantity: sp.quantity - 1 } : sp));
                                                                        } else {
                                                                            setSelectedProductsForCompletion(prev => prev.filter(sp => sp.productId !== p.id));
                                                                        }
                                                                    }}
                                                                    className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="font-bold text-slate-900 w-4 text-center">{selected.quantity}</span>
                                                                <button 
                                                                    onClick={() => setSelectedProductsForCompletion(prev => prev.map(sp => sp.productId === p.id ? { ...sp, quantity: sp.quantity + 1 } : sp))}
                                                                    className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => setSelectedProductsForCompletion(prev => [...prev, { productId: p.id, quantity: 1, unitPrice: p.salePrice }])}
                                                                className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"
                                                            >
                                                                Adicionar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100" />
                                {completionTarget.status === 'completed' && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-pulse">
                                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                        <p className="text-xs font-bold text-amber-700 leading-relaxed">
                                            Este atendimento já foi finalizado anteriormente. O estoque não será alterado novamente para evitar duplicidade.
                                        </p>
                                    </div>
                                )}

                                {/* Resumo de Valores */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-slate-500">
                                        <span>Serviços</span>
                                        <span className="font-bold text-slate-900">R$ {completionTarget.totalValue.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-500">
                                        <span>Produtos</span>
                                        <span className="font-bold text-emerald-600">
                                            + R$ {selectedProductsForCompletion.reduce((acc, sp) => acc + (sp.quantity * sp.unitPrice), 0).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xl font-black text-slate-900 pt-2 border-t border-slate-100">
                                        <span>Total Final</span>
                                        <span style={{ color: settings.primaryColor }}>
                                            R$ { (completionTarget.totalValue + selectedProductsForCompletion.reduce((acc, sp) => acc + (sp.quantity * sp.unitPrice), 0)).toFixed(2) }
                                        </span>
                                    </div>
                                </div>

                                {/* Forma de Pagamento */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Forma de Pagamento</label>
                                    <select 
                                        id="completion-payment-method"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 outline-none font-bold text-slate-900"
                                        defaultValue="pix"
                                    >
                                        <option value="pix">PIX</option>
                                        <option value="credit">Cartão de Crédito</option>
                                        <option value="debit">Cartão de Débito</option>
                                        <option value="cash">Dinheiro</option>
                                        {getClientActiveSubscription(completionTarget.clientPhone, completionTarget.clientName) && (
                                            <option value="subscription">Assinatura</option>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 flex gap-4">
                                <button 
                                    onClick={() => setIsCompletionModalOpen(false)}
                                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={async () => {
                                        if (isFinishing) return;
                                        setIsFinishing(true);
                                        try {
                                            const method = (document.getElementById('completion-payment-method') as HTMLSelectElement).value;
                                            let subId = undefined;
                                            if (method === 'subscription') {
                                                const sub = getClientActiveSubscription(completionTarget.clientPhone, completionTarget.clientName);
                                                subId = sub?.id;
                                            }

                                            // 1. Adicionar produtos se houver (deve vir ANTES do status 'completed' para o Trigger funcionar)
                                            // Proteção: não adiciona se já foi finalizado (estoque já baixou)
                                            const productsTotal = selectedProductsForCompletion.reduce((acc, sp) => acc + (sp.quantity * sp.unitPrice), 0);
                                            const alreadyCompleted = completionTarget.status === 'completed';

                                            if (selectedProductsForCompletion.length > 0 && !alreadyCompleted) {
                                                await addAppointmentProducts(completionTarget.id, selectedProductsForCompletion);
                                            }

                                            // 1.5. Atualizar o totalValue do agendamento para incluir os produtos
                                            // Isso é crucial para que Faturamento, Comissões e Relatórios reflitam o valor real
                                            const finalTotal = completionTarget.totalValue + productsTotal;
                                            if (productsTotal > 0) {
                                                await updateAppointmentTotalValue(completionTarget.id, finalTotal);
                                            }

                                            // 2. Atualizar agendamento
                                            const client = clients.find(c => c.id === completionTarget.clientId || c.phone === completionTarget.clientPhone);
                                            await updateAppointmentStatus(completionTarget.id, 'completed', client);
                                            await processLoyalty(completionTarget, settings);
                                            await updateAppointmentPaymentMethod(completionTarget.id, method, subId);

                                            // 3. Registrar no Caixa se aberto (para qualquer método de pagamento)
                                            const openSession = cashSessions.find(s => s.status === 'open');
                                            if (openSession) {
                                                await addCashMovement({
                                                    type: 'input',
                                                    category: 'Venda / Serviço',
                                                    amount: finalTotal,
                                                    description: `Cliente: ${completionTarget.clientName} | Método: ${method}`
                                                });
                                            }

                                            showToast('Atendimento finalizado com sucesso!');
                                            setIsCompletionModalOpen(false);
                                        } catch (err) {
                                            showToast('Erro ao finalizar atendimento.', 'error');
                                        } finally {
                                            setIsFinishing(false);
                                        }
                                    }}
                                    disabled={isFinishing}
                                    className={`flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 ${isFinishing ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isFinishing ? <Loader2 className="animate-spin" size={18} /> : 'Finalizar e Salvar'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
