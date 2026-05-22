import React, { useMemo, useState, useEffect } from 'react';
import { useShop } from '../../store';
import { Calendar, Clock, LogOut, CheckCircle, XCircle, AlertCircle, AlertTriangle, Settings, X, Loader2, Trash2, Plus, RefreshCw, Wallet, TrendingUp, BarChart3, ChevronLeft, ChevronRight, Filter, Sun, Moon } from 'lucide-react';
import { useToast } from '../ui/ToastContext';
import { WorkSchedule, DaySchedule, Professional } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from 'recharts';

// Tooltip customizado para o gráfico
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs z-50">
                <p className="text-slate-400 font-bold mb-2 text-center border-b border-slate-700 pb-1">{label}</p>
                
                {data.completed > 0 && (
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-slate-300">Finalizados:</span>
                        <span className="text-white font-bold">{data.completed}</span>
                    </div>
                )}
                
                {data.scheduled > 0 && (
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-slate-300">Agendados:</span>
                        <span className="text-white font-bold">{data.scheduled}</span>
                    </div>
                )}

                {(data.commission > 0 || data.potentialCommission > 0) && (
                    <div className="mt-2 pt-2 border-t border-slate-700">
                        {data.commission > 0 && (
                            <div className="flex justify-between gap-4 text-green-400">
                                <span>Ganho:</span>
                                <span className="font-bold">R$ {data.commission.toFixed(2)}</span>
                            </div>
                        )}
                        {data.potentialCommission > 0 && (
                            <div className="flex justify-between gap-4 text-orange-400">
                                <span>Previsto:</span>
                                <span className="font-bold">R$ {data.potentialCommission.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
    return null;
};

export const BarberDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const { appointments, professionals, session, updateAppointmentStatus, updateAppointmentPaymentMethod, updateAppointmentTotalValue, settings, updateProfessional, blockedSlots, addBlockedSlot, removeBlockedSlot, refresh, products, addAppointmentProducts, cashSessions, addCashMovement, clientSubscriptions, subscriptionPlans, processLoyalty, clients } = useShop();
    const { showToast } = useToast();

    // 1. Identificar qual profissional é o usuário logado
    const currentPro = useMemo(() => {
        const pro = professionals.find(p => p.email === session?.user.email || p.userId === session?.user.id);
        if (pro) {
            console.log(`BarberDashboard: Profissional identificado: ${pro.name} (ID: ${pro.id})`);
        } else {
            console.warn(`BarberDashboard: Profissional não encontrado para o email: ${session?.user.email} ou ID: ${session?.user.id}`);
        }
        return pro;
    }, [professionals, session]);

    // States para Modal de Configuração
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // State para ações em agendamentos
    const [updatingAptId, setUpdatingAptId] = useState<string | null>(null);

    // States para o Modal de Conclusão (igual ao AppointmentsPanel)
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [completionTarget, setCompletionTarget] = useState<any>(null);
    const [selectedProductsForCompletion, setSelectedProductsForCompletion] = useState<{ productId: string, quantity: number, unitPrice: number }[]>([]);
    const [completionPaymentMethod, setCompletionPaymentMethod] = useState('pix');
    const [isFinishing, setIsFinishing] = useState(false);
    
    // States para Bloqueios
    const [blockDate, setBlockDate] = useState('');
    const [blockStart, setBlockStart] = useState('08:00');
    const [blockEnd, setBlockEnd] = useState('18:00');
    const [blockReason, setBlockReason] = useState('Folga / Médico');

    // States do Gráfico (Filtro de Data)
    // Default: Hoje - 3 dias até Hoje + 10 dias (Duas semanas de visão)
    const [chartStart, setChartStart] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 3);
        return d.toISOString().split('T')[0];
    });
    const [chartEnd, setChartEnd] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 10);
        return d.toISOString().split('T')[0];
    });

    // Inicializar schedule quando abrir o modal
    const openConfig = () => {
        if (currentPro?.workSchedule) {
            setSchedule(JSON.parse(JSON.stringify(currentPro.workSchedule)));
        }
        setIsConfigOpen(true);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refresh();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const handleSaveSchedule = async () => {
        if (!currentPro || !schedule) return;
        setIsSaving(true);
        const { success, error } = await updateProfessional(currentPro.id, { workSchedule: schedule });
        setIsSaving(false);
        if (success) {
            showToast('Horários atualizados com sucesso!');
            setIsConfigOpen(false);
        } else {
            showToast(error || 'Erro ao salvar.', 'error');
        }
    };

    const handleAddBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (currentPro) {
            const { success, error } = await addBlockedSlot({
                professionalId: currentPro.id,
                date: blockDate,
                startTime: blockStart,
                endTime: blockEnd,
                reason: blockReason
            });

            if (success) {
                showToast('Bloqueio adicionado!');
                setBlockReason('Folga / Médico');
            } else {
                showToast(error || 'Erro ao bloquear.', 'error');
            }
        }
    };

    const handleRemoveBlock = async (id: string) => {
        const { success, error } = await removeBlockedSlot(id);
        if (success) {
            showToast('Bloqueio removido.');
        } else {
            showToast(error || 'Erro ao remover.', 'error');
        }
    }

    const handleStatusChange = async (id: string, newStatus: string, apt?: any) => {
        // Se está finalizando, abrir o modal de conclusão
        if (newStatus === 'completed' && apt) {
            setCompletionTarget(apt);
            setSelectedProductsForCompletion([]);
            setCompletionPaymentMethod('pix');
            setIsCompletionModalOpen(true);
            return;
        }
        setUpdatingAptId(id);
        try {
            const { success, error } = await updateAppointmentStatus(id, newStatus);
            if (success) {
                const mapLabels: Record<string, string> = {
                    'confirmed': 'Atendimento confirmado!',
                    'completed': 'Atendimento finalizado com sucesso!',
                    'noshow': 'Agendamento marcado como falta.',
                    'cancelled': 'Agendamento cancelado.',
                    'scheduled': 'Status revertido para agendado.'
                }
                showToast(mapLabels[newStatus] || 'Status atualizado.');
            } else {
                showToast(error || 'Erro ao atualizar status.', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão.', 'error');
        } finally {
            setUpdatingAptId(null);
        }
    };

    const getClientActiveSubscription = (phone: string, name: string) => {
        return clientSubscriptions.find(sub => {
            if (sub.status !== 'active') return false;
            const plan = subscriptionPlans.find(p => p.id === sub.planId);
            return plan !== undefined;
        });
    };

    const handleFinishAppointment = async () => {
        if (!completionTarget) return;
        setIsFinishing(true);
        try {
            const method = completionPaymentMethod;
            let subId = undefined;
            if (method === 'subscription') {
                const sub = getClientActiveSubscription(completionTarget.clientPhone, completionTarget.clientName);
                subId = sub?.id;
            }

            const alreadyCompleted = completionTarget.status === 'completed';
            if (selectedProductsForCompletion.length > 0 && !alreadyCompleted) {
                await addAppointmentProducts(completionTarget.id, selectedProductsForCompletion);
            }

            // Atualizar o totalValue para incluir produtos
            const productsTotal = selectedProductsForCompletion.reduce((acc: number, sp: any) => acc + (sp.quantity * sp.unitPrice), 0);
            const finalTotal = completionTarget.totalValue + productsTotal;
            if (productsTotal > 0) {
                await updateAppointmentTotalValue(completionTarget.id, finalTotal);
            }

            await updateAppointmentStatus(completionTarget.id, 'completed');
            await processLoyalty(completionTarget, settings);
            await updateAppointmentPaymentMethod(completionTarget.id, method, subId);

            if (method === 'cash') {
                const openSession = cashSessions.find(s => s.status === 'open');
                if (openSession) {
                    await addCashMovement({ type: 'input', category: 'Venda / Serviço', amount: finalTotal, description: `Cliente: ${completionTarget.clientName}` });
                }
            }

            showToast('Atendimento finalizado com sucesso! ✅');
            setIsCompletionModalOpen(false);
            setCompletionTarget(null);
        } catch (err) {
            showToast('Erro ao finalizar atendimento.', 'error');
        } finally {
            setIsFinishing(false);
        }
    };

    const toggleDay = (day: keyof WorkSchedule) => {
        if (schedule) {
            setSchedule(prev => prev ? ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }) : null);
        }
    };

    const updateDayTime = (day: keyof WorkSchedule, field: keyof DaySchedule, value: string) => {
        if (schedule) {
            setSchedule(prev => prev ? ({ ...prev, [day]: { ...prev[day], [field]: value } }) : null);
        }
    };

    // Helper para atalhos de data do gráfico
    const setChartPreset = (type: 'thisWeek' | 'nextWeek' | 'month') => {
        const today = new Date();
        let start = new Date(today);
        let end = new Date(today);

        if (type === 'thisWeek') {
            const day = today.getDay(); // 0 (Sun) - 6 (Sat)
            const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1); 
            start.setDate(diffToMonday);
            end.setDate(start.getDate() + 6);
        } else if (type === 'nextWeek') {
             const day = today.getDay();
             const diffToNextMonday = today.getDate() - day + (day === 0 ? 1 : 8);
             start.setDate(diffToNextMonday);
             end.setDate(start.getDate() + 6);
        } else if (type === 'month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        setChartStart(start.toISOString().split('T')[0]);
        setChartEnd(end.toISOString().split('T')[0]);
    };

    // 2. Filtrar agendamentos DESTE barbeiro
    const myAppointments = useMemo(() => {
        if (!currentPro) return [];
        const filtered = appointments.filter(a => a.professionalId === currentPro.id);
        console.log(`BarberDashboard: Total de agendamentos para ${currentPro.name}: ${filtered.length}`);
        // Ordenar: Hoje primeiro, depois data futura
        return filtered
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateA.getTime() - dateB.getTime();
            });
    }, [appointments, currentPro]);

    // 3. Calcular ganhos (Baseado na Comissão)
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const todayLocal = new Date(today.getTime() - (offset * 60 * 1000));
    const todayStr = todayLocal.toISOString().split('T')[0];

    // Agendamentos de hoje (exclui cancelados e faltas para contagem de volume)
    const todaysWorkload = myAppointments.filter(a => a.date === todayStr && a.status !== 'cancelled' && a.status !== 'noshow');
    
    // Apenas finalizados para comissão realizada
    const todaysCompleted = todaysWorkload.filter(a => a.status === 'completed');
    
    const commissionRate = currentPro?.commissionPercentage ?? 50;

    // Valores Cards
    const realizedGross = todaysCompleted.reduce((acc, curr) => acc + curr.totalValue, 0);
    const realizedEarnings = realizedGross * (commissionRate / 100);

    const projectedGross = todaysWorkload.reduce((acc, curr) => acc + curr.totalValue, 0);
    const projectedEarnings = projectedGross * (commissionRate / 100);

    // 4. Preparar dados para o Gráfico (Intervalo Dinâmico)
    const chartData = useMemo(() => {
        if (!currentPro) return [];
        
        const data = [];
        const start = new Date(chartStart + 'T00:00:00');
        const end = new Date(chartEnd + 'T23:59:59');
        const loop = new Date(start);

        // Segurança para evitar loop infinito se datas forem inválidas
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

        // Limite de 60 dias para não quebrar a UI
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if(diffDays > 60) {
            end.setDate(start.getDate() + 60);
        }

        while (loop <= end) {
            const dateStr = loop.toISOString().split('T')[0];
            const displayDate = loop.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); // DD/MM
            const isToday = dateStr === todayStr;

            const dayAppts = myAppointments.filter(a => a.date === dateStr);
            const completed = dayAppts.filter(a => a.status === 'completed');
            // Agendados considera 'scheduled' e 'confirmed'
            const scheduled = dayAppts.filter(a => ['scheduled', 'confirmed'].includes(a.status));
            
            const dailyRevenue = completed.reduce((acc, curr) => acc + curr.totalValue, 0);
            const potentialRevenue = scheduled.reduce((acc, curr) => acc + curr.totalValue, 0);
            
            const dailyCommission = dailyRevenue * (commissionRate / 100);
            const potentialCommission = potentialRevenue * (commissionRate / 100);

            data.push({
                name: displayDate,
                date: dateStr,
                isToday: isToday,
                completed: completed.length,
                scheduled: scheduled.length,
                commission: dailyCommission,
                potentialCommission: potentialCommission
            });

            loop.setDate(loop.getDate() + 1);
        }
        return data;
    }, [myAppointments, currentPro, commissionRate, chartStart, chartEnd, todayStr]);

    const STATUS_COLORS: Record<string, string> = {
        scheduled: 'border-blue-500',
        confirmed: 'border-orange-500',
        completed: 'border-green-500',
        cancelled: 'border-red-500',
        noshow: 'border-slate-500',
    };
    const STATUS_TEXT: Record<string, string> = {
        scheduled: 'text-blue-700',
        confirmed: 'text-orange-700',
        completed: 'text-green-700',
        cancelled: 'text-red-700',
        noshow: 'text-slate-500',
    };

    const daysMap: {[key: string]: string} = {
        monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', thursday: 'Quinta',
        friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo'
    };

    if (!currentPro) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white p-4 text-center">
                <div>
                    <AlertCircle size={48} className="mx-auto mb-4 text-orange-500"/>
                    <h2 className="text-xl font-bold">Perfil não vinculado</h2>
                    <p className="text-slate-400 mb-6">Seu usuário não está associado a nenhum barbeiro desta loja.<br/>Peça ao dono para cadastrar seu email: {session?.user.email}</p>
                    <button onClick={onLogout} className="px-6 py-2 bg-slate-800 rounded-lg">Sair</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
            {/* Modal de Conclusão */}
            {isCompletionModalOpen && completionTarget && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setIsCompletionModalOpen(false)} />
                    <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-emerald-50">
                            <h3 className="text-lg font-bold text-emerald-900">Finalizar Atendimento</h3>
                            <p className="text-emerald-700 text-sm">{completionTarget.clientName} • R$ {completionTarget.totalValue.toFixed(2)}</p>
                        </div>
                        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                            {/* Produtos */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block">Produtos Adicionais (Opcional)</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {products.length === 0 && <p className="text-slate-400 text-sm italic">Nenhum produto no estoque.</p>}
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
                                                            <button onClick={() => { if (selected.quantity > 1) setSelectedProductsForCompletion(prev => prev.map(sp => sp.productId === p.id ? { ...sp, quantity: sp.quantity - 1 } : sp)); else setSelectedProductsForCompletion(prev => prev.filter(sp => sp.productId !== p.id)); }} className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 text-sm font-bold">-</button>
                                                            <span className="font-bold text-slate-900 w-4 text-center">{selected.quantity}</span>
                                                            <button onClick={() => setSelectedProductsForCompletion(prev => prev.map(sp => sp.productId === p.id ? { ...sp, quantity: sp.quantity + 1 } : sp))} className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 text-sm font-bold">+</button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setSelectedProductsForCompletion(prev => [...prev, { productId: p.id, quantity: 1, unitPrice: p.salePrice }])} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">Adicionar</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="h-px bg-slate-100" />
                            {/* Total */}
                            <div className="space-y-6">
                                {completionTarget.status === 'completed' && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-pulse">
                                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                                        <p className="text-xs font-bold text-amber-700 leading-relaxed">
                                            Este atendimento já foi finalizado anteriormente. O estoque não será alterado novamente para evitar duplicidade.
                                        </p>
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Serviços</span><span className="font-bold text-slate-900">R$ {completionTarget.totalValue.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Produtos</span><span className="font-bold text-emerald-600">+ R$ {selectedProductsForCompletion.reduce((acc, sp) => acc + sp.quantity * sp.unitPrice, 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-black text-slate-900 pt-2 border-t border-slate-100">
                                    <span>Total Final</span>
                                    <span className="text-orange-600">R$ {(completionTarget.totalValue + selectedProductsForCompletion.reduce((acc, sp) => acc + sp.quantity * sp.unitPrice, 0)).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                            {/* Forma de Pagamento */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Forma de Pagamento</label>
                                <select value={completionPaymentMethod} onChange={e => setCompletionPaymentMethod(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-orange-500 outline-none font-bold text-slate-900">
                                    <option value="pix">PIX</option>
                                    <option value="credit">Cartão de Crédito</option>
                                    <option value="debit">Cartão de Débito</option>
                                    <option value="cash">Dinheiro</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-5 bg-slate-50 flex gap-3">
                            <button onClick={() => setIsCompletionModalOpen(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all">Cancelar</button>
                            <button onClick={handleFinishAppointment} disabled={isFinishing}
                                className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2">
                                {isFinishing ? <Loader2 className="animate-spin" size={18}/> : 'Finalizar e Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Configuração */}
            {isConfigOpen && schedule && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => e.target === e.currentTarget && setIsConfigOpen(false)}
                >
                    <div className="bg-slate-800 w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl relative animate-scale-up max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-slate-800 p-6 border-b border-slate-700 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold">Minha Agenda</h2>
                            <button onClick={() => setIsConfigOpen(false)}><X size={24} className="text-slate-400 hover:text-white"/></button>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            {/* Horários de Trabalho */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-orange-500 flex items-center gap-2"><Clock size={18}/> Horários de Trabalho</h3>
                                <div className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                     {Object.entries(schedule).map(([key, val]) => {
                                         const day = val as DaySchedule;
                                         return (
                                             <div key={key} className="flex flex-col md:flex-row md:items-center gap-3 pb-3 border-b border-slate-700/50 last:border-0">
                                                 <div className="w-24">
                                                     <label className="flex items-center gap-2 cursor-pointer">
                                                         <input type="checkbox" checked={day.active} onChange={() => toggleDay(key as keyof WorkSchedule)} className="rounded border-slate-600 text-orange-500 focus:ring-orange-500 bg-slate-800" />
                                                         <span className={day.active ? 'text-white' : 'text-slate-500'}>{daysMap[key]}</span>
                                                     </label>
                                                 </div>
                                                 {day.active && (
                                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                                        <input type="time" value={day.start} onChange={e => updateDayTime(key as keyof WorkSchedule, 'start', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white" />
                                                        <span className="text-slate-500">até</span>
                                                        <input type="time" value={day.end} onChange={e => updateDayTime(key as keyof WorkSchedule, 'end', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white" />
                                                        <span className="text-slate-500 ml-2 hidden sm:inline">Almoço:</span>
                                                        <input type="time" value={day.lunchStart} onChange={e => updateDayTime(key as keyof WorkSchedule, 'lunchStart', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white" />
                                                        <span className="text-slate-500">-</span>
                                                        <input type="time" value={day.lunchEnd} onChange={e => updateDayTime(key as keyof WorkSchedule, 'lunchEnd', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white" />
                                                    </div>
                                                 )}
                                             </div>
                                         );
                                     })}
                                </div>
                            </div>

                            {/* Gerenciar Bloqueios */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-orange-500 flex items-center gap-2"><Calendar size={18}/> Bloqueios e Folgas</h3>
                                
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">Novo Bloqueio</h4>
                                    <form onSubmit={handleAddBlock} className="space-y-3">
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input required type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                                            <div className="flex gap-2 flex-1">
                                                <input required type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                                                <span className="self-center text-slate-500">-</span>
                                                <input required type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <input required type="text" value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Motivo" className="flex-1 bg-slate-800 border border-slate-600 rounded p-2 text-white text-sm" />
                                            <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                                                <Plus size={16}/> Adicionar
                                            </button>
                                        </div>
                                    </form>

                                    <div className="mt-6">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase mb-3">Bloqueios Futuros</h4>
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                            {blockedSlots.filter(b => b.professionalId === currentPro.id).length === 0 ? (
                                                <p className="text-sm text-slate-500 italic">Nenhum bloqueio cadastrado.</p>
                                            ) : (
                                                blockedSlots
                                                    .filter(b => b.professionalId === currentPro.id)
                                                    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                                    .map(b => (
                                                    <div key={b.id} className="flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-600">
                                                        <div>
                                                            <div className="text-sm text-white font-medium">{new Date(b.date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                                                            <div className="text-xs text-slate-400">{b.startTime} - {b.endTime} • {b.reason}</div>
                                                        </div>
                                                        <button onClick={() => handleRemoveBlock(b.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-700 bg-slate-800 sticky bottom-0 z-10">
                            <button 
                                onClick={handleSaveSchedule}
                                disabled={isSaving}
                                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin"/> : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-slate-950 border-b border-slate-800 p-4 sticky top-0 z-10">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-orange-500 flex items-center justify-center text-white font-bold overflow-hidden">
                            <img src="https://i.freeimage.host/qD9Rddv.png" alt="Insight Barber Logo" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h1 className="font-bold leading-tight">INSIGHT BARBER</h1>
                            <p className="text-xs text-slate-400">Olá, {currentPro.name.split(' ')[0]}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">

                        <button onClick={handleRefresh} className={`p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white border border-slate-700 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`} title="Atualizar dados">
                            <RefreshCw size={18}/>
                        </button>
                         <button onClick={openConfig} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white border border-slate-700" title="Configurações">
                            <Settings size={18}/>
                        </button>
                        <button onClick={onLogout} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white border border-slate-700" title="Sair">
                            <LogOut size={18}/>
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto p-4 space-y-6">
                
                {/* Cards de Resumo Hoje */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Calendar size={48} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs mb-1 font-bold uppercase tracking-wider">Agenda Hoje</p>
                            <p className="text-3xl font-bold text-white">{todaysWorkload.length}</p>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500">
                            {todaysCompleted.length} finalizados
                        </div>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                            <Wallet size={48} />
                        </div>
                        <div>
                            <div className="flex items-center gap-1 mb-1">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Comissão Hoje</p>
                                <span className="text-[10px] bg-slate-700 px-1.5 rounded text-slate-300">{commissionRate}%</span>
                            </div>
                            <p className="text-3xl font-bold text-green-400">R$ {realizedEarnings.toFixed(2)}</p>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                            <TrendingUp size={12} />
                            Potencial do dia: R$ {projectedEarnings.toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* GRÁFICO DE DESEMPENHO E AGENDA FUTURA */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                        <h2 className="font-bold text-lg flex items-center gap-2 text-white">
                            <BarChart3 size={18} className="text-orange-500"/> Volume & Previsão
                        </h2>
                        
                        {/* Controles de Filtro */}
                        <div className="flex flex-col sm:flex-row gap-2">
                             <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700">
                                <button onClick={() => setChartPreset('thisWeek')} className="px-3 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white hover:shadow-sm rounded transition-all">Semana</button>
                                <button onClick={() => setChartPreset('nextWeek')} className="px-3 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white hover:shadow-sm rounded transition-all">Próxima</button>
                                <button onClick={() => setChartPreset('month')} className="px-3 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white hover:shadow-sm rounded transition-all">Mês</button>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-900/50 rounded-lg p-1 border border-slate-700">
                                <input type="date" value={chartStart} onChange={e => setChartStart(e.target.value)} className="bg-transparent border-none text-xs text-slate-300 w-24 focus:outline-none [color-scheme:dark]"/>
                                <span className="text-slate-500">-</span>
                                <input type="date" value={chartEnd} onChange={e => setChartEnd(e.target.value)} className="bg-transparent border-none text-xs text-slate-300 w-24 focus:outline-none [color-scheme:dark]"/>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-64 w-full">
                        {chartData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-slate-400 border border-dashed border-slate-700/50 rounded-xl bg-slate-900/50">
                                <p>Sem dados disponíveis</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#94a3b8" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis 
                                        stroke="#94a3b8" 
                                        fontSize={10} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        allowDecimals={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#334155', opacity: 0.2}} />
                                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                    {/* Linha de Referência para HOJE */}
                                    <ReferenceLine x={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} stroke="rgba(249, 115, 22, 0.5)" strokeDasharray="3 3" label={{ position: 'top', value: 'Hoje', fill: '#f97316', fontSize: 10 }} />
                                    
                                    <Bar name="Finalizados" dataKey="completed" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                                    <Bar name="Agendados" dataKey="scheduled" stackId="a" fill={settings.primaryColor || "#f97316"} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Lista de Agenda */}
                <div>
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Calendar size={18} className="text-orange-500"/> Minha Agenda
                    </h2>
                    
                    {myAppointments.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-slate-800/50 rounded-xl border border-slate-800 flex flex-col items-center">
                            <Calendar size={32} className="mb-2 opacity-50"/>
                            <p>Nenhum agendamento encontrado.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myAppointments.map(apt => {
                                const isToday = apt.date === todayStr;
                                const isProcessing = updatingAptId === apt.id;
                                const apptDateTime = new Date(`${apt.date}T${apt.time}`);
                                const now = new Date();
                                const isFuture = apptDateTime > now;

                                const prodsTotal = 0;

                                return (
                                    <div key={apt.id} className={`bg-white rounded-xl border-l-4 ${STATUS_COLORS[apt.status] || 'border-slate-300'} shadow-sm relative overflow-hidden transition-all`}>
                                        {isProcessing && (
                                            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                                                <Loader2 size={24} className="text-orange-500 animate-spin" />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-lg">{apt.clientName}</h3>
                                                    <p className="text-slate-500 text-sm">{apt.clientPhone}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xl font-bold text-slate-900">{apt.time}</div>
                                                    <div className={`text-xs uppercase font-bold ${isToday ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {isToday ? 'HOJE' : new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row gap-3 justify-between items-center">
                                                <span className="text-sm font-bold text-orange-600">R$ {apt.totalValue.toFixed(2)}</span>
                                                <select
                                                    value={apt.status}
                                                    onChange={(e) => handleStatusChange(apt.id, e.target.value, apt)}
                                                    disabled={isProcessing}
                                                    className={`w-full sm:w-auto bg-slate-50 border border-slate-200 text-xs font-bold uppercase rounded-lg p-2 focus:outline-none focus:border-orange-500 cursor-pointer ${STATUS_TEXT[apt.status] || 'text-slate-700'}`}
                                                >
                                                    <option value="scheduled">Agendado</option>
                                                    <option value="confirmed">Confirmado</option>
                                                    <option value="completed" disabled={isFuture && apt.status !== 'completed'}>Finalizado {isFuture && apt.status !== 'completed' ? '(Aguarde)' : ''}</option>
                                                    <option value="noshow" disabled={isFuture && apt.status !== 'noshow'}>Não veio {isFuture && apt.status !== 'noshow' ? '(Aguarde)' : ''}</option>
                                                    <option value="cancelled">Cancelado</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
