import React, { useMemo, useState, useEffect } from 'react';
import { useShop } from '../../store';
import { Calendar, Clock, LogOut, CheckCircle, XCircle, AlertCircle, Settings, X, Loader2, Trash2, Plus, RefreshCw, Wallet, TrendingUp } from 'lucide-react';
import { useToast } from '../ui/ToastContext';
import { WorkSchedule, DaySchedule, Professional } from '../../types';

export const BarberDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const { appointments, professionals, session, updateAppointmentStatus, settings, updateProfessional, blockedSlots, addBlockedSlot, removeBlockedSlot, refresh } = useShop();
    const { showToast } = useToast();

    // 1. Identificar qual profissional é o usuário logado
    const currentPro = professionals.find(p => p.email === session?.user.email || p.userId === session?.user.id);

    // States para Modal de Configuração
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // State para ações em agendamentos
    const [updatingAptId, setUpdatingAptId] = useState<string | null>(null);
    
    // States para Bloqueios
    const [blockDate, setBlockDate] = useState('');
    const [blockStart, setBlockStart] = useState('08:00');
    const [blockEnd, setBlockEnd] = useState('18:00');
    const [blockReason, setBlockReason] = useState('Folga / Médico');

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

    const handleStatusChange = async (id: string, newStatus: string) => {
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

    // 2. Filtrar agendamentos DESTE barbeiro
    const myAppointments = useMemo(() => {
        if (!currentPro) return [];
        // Ordenar: Hoje primeiro, depois data futura
        return appointments
            .filter(a => a.professionalId === currentPro.id)
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateA.getTime() - dateB.getTime();
            });
    }, [appointments, currentPro]);

    // 3. Calcular ganhos (Baseado na Comissão)
    // FIX: Usar data local para evitar problemas de fuso horário
    const today = new Date();
    // Ajusta o timezone offset para garantir que a string YYYY-MM-DD seja do dia local
    const offset = today.getTimezoneOffset();
    const todayLocal = new Date(today.getTime() - (offset * 60 * 1000));
    const todayStr = todayLocal.toISOString().split('T')[0];

    // Agendamentos de hoje (exclui cancelados e faltas para contagem de volume)
    const todaysWorkload = myAppointments.filter(a => a.date === todayStr && a.status !== 'cancelled' && a.status !== 'noshow');
    
    // Apenas finalizados para comissão realizada
    const todaysCompleted = todaysWorkload.filter(a => a.status === 'completed');
    
    const commissionRate = currentPro?.commissionPercentage ?? 50;

    // Valores
    const realizedGross = todaysCompleted.reduce((acc, curr) => acc + curr.totalValue, 0);
    const realizedEarnings = realizedGross * (commissionRate / 100);

    const projectedGross = todaysWorkload.reduce((acc, curr) => acc + curr.totalValue, 0);
    const projectedEarnings = projectedGross * (commissionRate / 100);

    const STATUS_COLORS: Record<string, string> = {
        scheduled: 'border-blue-500 text-blue-400',
        confirmed: 'border-orange-500 text-orange-400',
        completed: 'border-green-500 text-green-400',
        cancelled: 'border-red-500 text-red-400',
        noshow: 'border-slate-500 text-slate-400',
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
                        <img src={currentPro.photoUrl} alt={currentPro.name} className="w-10 h-10 rounded-full border border-slate-700 object-cover" />
                        <div>
                            <h1 className="font-bold leading-tight">Olá, {currentPro.name.split(' ')[0]}</h1>
                            <p className="text-xs text-slate-400">Painel do Barbeiro</p>
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
                
                {/* Cards de Resumo */}
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
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Minha Comissão</p>
                                <span className="text-[10px] bg-slate-700 px-1.5 rounded text-slate-300">{commissionRate}%</span>
                            </div>
                            <p className="text-3xl font-bold text-green-400">R$ {realizedEarnings.toFixed(2)}</p>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                            <TrendingUp size={12} />
                            Potencial: R$ {projectedEarnings.toFixed(2)}
                        </div>
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
                                
                                // Lógica para bloquear status futuros
                                const apptDateTime = new Date(`${apt.date}T${apt.time}`);
                                const now = new Date();
                                const isFuture = apptDateTime > now;

                                return (
                                    <div key={apt.id} className={`bg-slate-800 p-4 rounded-xl border-l-4 ${STATUS_COLORS[apt.status] || 'border-slate-500'} shadow-sm relative overflow-hidden transition-all`}>
                                        
                                        {isProcessing && (
                                            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                                                <Loader2 size={24} className="text-orange-500 animate-spin" />
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{apt.clientName}</h3>
                                                <p className="text-slate-400 text-sm">{apt.clientPhone}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold text-white">{apt.time}</div>
                                                <div className={`text-xs uppercase font-bold ${isToday ? 'text-green-400' : 'text-slate-500'}`}>
                                                    {isToday ? 'HOJE' : new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="border-t border-slate-700/50 pt-3 flex flex-col sm:flex-row gap-3 justify-between items-center">
                                            <span className="text-sm font-medium" style={{ color: settings.primaryColor }}>
                                                R$ {apt.totalValue.toFixed(2)}
                                            </span>
                                            
                                            {/* Controles de Status Completo (Dropdown) */}
                                            <div className="w-full sm:w-auto">
                                                <select 
                                                    value={apt.status}
                                                    onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                                                    disabled={isProcessing}
                                                    className={`w-full sm:w-auto bg-slate-900 border border-slate-600 text-xs font-bold uppercase rounded-lg p-2 focus:outline-none focus:border-orange-500 cursor-pointer hover:bg-slate-700 transition-colors ${STATUS_COLORS[apt.status].replace('border-', 'text-')}`}
                                                >
                                                    <option value="scheduled">Agendado</option>
                                                    <option value="confirmed">Confirmado</option>
                                                    <option value="completed" disabled={isFuture && apt.status !== 'completed'}>
                                                        Finalizado {isFuture && apt.status !== 'completed' ? '(Aguarde horário)' : ''}
                                                    </option>
                                                    <option value="noshow" disabled={isFuture && apt.status !== 'noshow'}>
                                                        Não veio {isFuture && apt.status !== 'noshow' ? '(Aguarde horário)' : ''}
                                                    </option>
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