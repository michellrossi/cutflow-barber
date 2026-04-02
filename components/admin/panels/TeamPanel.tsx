import React, { useState, useRef } from 'react';
import { useShop } from '../../../store';
import { supabase } from '../../../supabaseClient';
import { Professional, WorkSchedule, DaySchedule } from '../../../types';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import { Plus, Trash2, Edit2, Upload, Loader2, Clock, X, UserPlus, CalendarX, Scissors, DollarSign, Award, LayoutGrid, Users } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

const DEFAULT_DAY: DaySchedule = { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true };
const DEFAULT_SCHEDULE: WorkSchedule = {
    monday: {...DEFAULT_DAY}, tuesday: {...DEFAULT_DAY}, wednesday: {...DEFAULT_DAY},
    thursday: {...DEFAULT_DAY}, friday: {...DEFAULT_DAY}, saturday: {...DEFAULT_DAY},
    sunday: {...DEFAULT_DAY, active: false}
};

interface TeamPanelProps {
    initialTab?: 'list' | 'schedules' | 'blocks' | 'report';
    onTabChange?: (tab: 'list' | 'schedules' | 'blocks' | 'report') => void;
}

export const TeamPanel: React.FC<TeamPanelProps> = ({ initialTab = 'list', onTabChange }) => {
    const { professionals, addProfessional, updateProfessional, removeProfessional, blockedSlots, addBlockedSlot, removeBlockedSlot, settings, appointments, services } = useShop();
    const { showToast } = useToast();
    
    const [subTab, setSubTab] = React.useState<'list' | 'schedules' | 'blocks' | 'report'>(initialTab);
    const [selectedProId, setSelectedProId] = useState<string>('');

    React.useEffect(() => {
        setSubTab(initialTab);
    }, [initialTab]);

    const handleSubTabChange = (tab: 'list' | 'schedules' | 'blocks' | 'report') => {
        setSubTab(tab);
        if (onTabChange) onTabChange(tab);
    };
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    
    // Modal de Bloqueios
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [selectedProForBlock, setSelectedProForBlock] = useState<Professional | null>(null);
    const [blockDate, setBlockDate] = useState('');
    const [blockStart, setBlockStart] = useState('08:00');
    const [blockEnd, setBlockEnd] = useState('18:00');
    const [blockReason, setBlockReason] = useState('Folga / Médico');

    // Form States
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [commission, setCommission] = useState('50'); // Default 50%
    const [color, setColor] = useState('#f97316');
    const [photo, setPhoto] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [schedule, setSchedule] = useState<WorkSchedule>({
        monday: {...DEFAULT_DAY}, tuesday: {...DEFAULT_DAY}, wednesday: {...DEFAULT_DAY},
        thursday: {...DEFAULT_DAY}, friday: {...DEFAULT_DAY}, saturday: {...DEFAULT_DAY},
        sunday: {...DEFAULT_DAY, active: false}
    });
    
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `professionals/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('images').getPublicUrl(filePath);
                setPhoto(data.publicUrl);
                showToast('Foto enviada com sucesso!');
            } catch (error) {
                console.error("Erro no upload:", error);
                showToast('Erro ao fazer upload da imagem.', 'error');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleEdit = (pro: Professional) => {
        setEditingId(pro.id);
        setName(pro.name);
        setRole(pro.role);
        setEmail(pro.email || '');
        setPhone(pro.phone || '');
        setCommission(pro.commissionPercentage ? pro.commissionPercentage.toString() : '50');
        setColor(pro.color || '#f97316');
        setPhoto(pro.photoUrl);
        if (pro.workSchedule) setSchedule(pro.workSchedule);
        setIsFormOpen(true);
        setIsScheduleOpen(false);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            const { success, error } = await removeProfessional(deleteId);
            if (success) {
                showToast('Profissional removido com sucesso!');
                setDeleteId(null);
            } else {
                showToast(error || 'Erro ao remover.', 'error');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const proData = { 
            name, 
            role, 
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            photoUrl: photo || 'https://picsum.photos/200', 
            workSchedule: schedule,
            commissionPercentage: Number(commission),
            color
        };
        
        let result;
        if (editingId) {
            result = await updateProfessional(editingId, proData);
        } else {
            result = await addProfessional(proData);
        }
        
        setIsSaving(false);

        if (result.success) {
            showToast(editingId ? 'Profissional atualizado!' : 'Profissional adicionado!');
            setIsFormOpen(false);
            setEditingId(null);
            setName(''); setRole(''); setEmail(''); setPhone(''); setPhoto(null); setCommission('50');
        } else {
            showToast(result.error || 'Ocorreu um erro.', 'error');
        }
    };

    const handleAddBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedProForBlock) {
            const { success, error } = await addBlockedSlot({
                professionalId: selectedProForBlock.id,
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

    const handleSaveSchedule = async () => {
        if (!selectedProId) return;
        setIsSaving(true);
        const result = await updateProfessional(selectedProId, { workSchedule: schedule });
        setIsSaving(false);
        if (result.success) {
            showToast('Horários atualizados com sucesso!');
        } else {
            showToast(result.error || 'Erro ao salvar horários.', 'error');
        }
    };

    const toggleDay = (day: keyof WorkSchedule) => {
        setSchedule(prev => ({ ...prev, [day]: { ...prev[day], active: !prev[day].active } }));
    };

    const updateDayTime = (day: keyof WorkSchedule, field: keyof DaySchedule, value: string) => {
        setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    };

    const daysMap: {[key: string]: string} = {
        monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', thursday: 'Quinta',
        friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo'
    };

    return (
        <div className="space-y-6">
            <ConfirmationModal 
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Remover Profissional"
                message="Tem certeza que deseja remover este profissional? Esta ação não pode ser desfeita."
                confirmText="Remover"
                isDestructive
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Gestão de Equipe</h2>
                    <p className="text-[#6b7d99] text-sm font-medium">Adicione profissionais, administre seus horários e bloqueios e gere relatórios.</p>
                </div>
                {subTab === 'list' && (
                    <button 
                        onClick={() => { 
                            setIsFormOpen(true); 
                            setEditingId(null); 
                            setName(''); setRole(''); setEmail(''); setPhone(''); setPhoto(null); setCommission('50');
                        }}
                        className="bg-orange-600 text-white font-bold px-6 py-3 rounded-[2rem] flex items-center justify-center gap-2 transition-all shadow-[0px_4px_10px_rgba(234,88,12,0.2)] hover:bg-orange-700 whitespace-nowrap"
                    >
                        <Plus size={20} className="stroke-[3px]" />
                        Novo Profissional
                    </button>
                )}
            </div>

            {/* Sub-menus Internos */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit mb-8 overflow-x-auto no-scrollbar max-w-full">
                {[
                    { id: 'list', label: 'Profissionais', icon: <Users size={18} /> },
                    { id: 'schedules', label: 'Horários', icon: <Clock size={18} /> },
                    { id: 'blocks', label: 'Bloqueio', icon: <CalendarX size={18} /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            if (tab.id === 'schedules' || tab.id === 'blocks') {
                                if (professionals.length > 0 && !selectedProId) {
                                    setSelectedProId(professionals[0].id);
                                    if (tab.id === 'schedules') setSchedule(professionals[0].workSchedule || DEFAULT_SCHEDULE);
                                    if (tab.id === 'blocks') setBlockDate(new Date().toISOString().split('T')[0]);
                                }
                            }
                            handleSubTabChange(tab.id as any);
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
                            subTab === tab.id 
                            ? 'bg-white text-orange-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {subTab === 'list' && (
                <>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
                        {professionals.map(pro => {
                            const isMaster = pro.role.toLowerCase().includes('master');
                            return (
                                <div key={pro.id} className="bg-white rounded-md border border-slate-200 flex flex-col overflow-hidden group hover:border-slate-300 transition-all w-full max-w-[210px] shadow-lg">
                                    {/* Top Half: Photo */}
                                    <div className="relative h-64 w-full overflow-hidden">
                                        <img 
                                            src={pro.photoUrl} 
                                            alt={pro.name} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                            referrerPolicy="no-referrer" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                                        
                                        {isMaster && (
                                            <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[9px] font-bold px-2 py-0.5 rounded-md shadow-lg">
                                                MASTER
                                            </div>
                                        )}

                                        <div 
                                            className="absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow-lg" 
                                            style={{ backgroundColor: pro.color }}
                                            title="Cor na agenda"
                                        />
                                    </div>
                                    
                                    {/* Bottom Half: Info */}
                                    <div className="p-3 flex flex-col flex-1">
                                        <div className="mb-3 text-center">
                                            <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">{pro.name}</h3>
                                            <p className="text-[9px] font-bold tracking-wider uppercase text-orange-500 mt-1">
                                                {pro.role}
                                            </p>
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="mt-auto flex gap-1.5 justify-center">
                                            <button 
                                                onClick={() => handleEdit(pro)} 
                                                className="p-2 bg-slate-100 rounded-md text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={14}/>
                                            </button>
                                            <button 
                                                onClick={() => { 
                                                    setSelectedProId(pro.id);
                                                    setSchedule(pro.workSchedule || DEFAULT_SCHEDULE);
                                                    handleSubTabChange('schedules');
                                                }} 
                                                className="p-2 bg-slate-100 rounded-md text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                                                title="Ver Horários"
                                            >
                                                <Clock size={14}/>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setSelectedProId(pro.id);
                                                    setBlockDate(new Date().toISOString().split('T')[0]);
                                                    handleSubTabChange('blocks');
                                                }} 
                                                className="p-2 bg-slate-100 rounded-md text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                                                title="Bloquear Horário"
                                            >
                                                <CalendarX size={14}/>
                                            </button>
                                            <button onClick={() => setDeleteId(pro.id)} className="p-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 transition-colors" title="Remover">
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add New Card */}
                        <button 
                            onClick={() => { setIsFormOpen(true); setEditingId(null); setName(''); setRole(''); setEmail(''); setPhone(''); setCommission('50'); setColor('#f97316'); setPhoto(null); }}
                            className="bg-transparent rounded-md border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-100 transition-all flex flex-col items-center justify-center text-center w-full max-w-[210px] min-h-[350px] group"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center mb-4 transition-colors">
                                <UserPlus size={20} className="text-slate-400 group-hover:text-slate-600" />
                            </div>
                            <h3 className="font-medium text-slate-600 group-hover:text-slate-900 mb-2 transition-colors">Novo Profissional</h3>
                            <p className="text-xs text-slate-500 max-w-[140px]">Adicione mais membros para sua equipe</p>
                        </button>
                    </div>
                </>
            )}

            {subTab === 'schedules' && (
                <div className="max-w-4xl">
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Selecione o Profissional</label>
                        <div className="flex flex-wrap gap-4">
                            {professionals.map(pro => (
                                <button
                                    key={pro.id}
                                    onClick={() => {
                                        setSelectedProId(pro.id);
                                        setSchedule(pro.workSchedule || DEFAULT_SCHEDULE);
                                    }}
                                    className={`flex flex-col items-center gap-2 p-2 rounded-xl transition-all border-2 ${
                                        selectedProId === pro.id 
                                            ? 'border-orange-500 bg-orange-50 shadow-md scale-105' 
                                            : 'border-transparent hover:bg-slate-50 grayscale hover:grayscale-0'
                                    }`}
                                >
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                                        <img src={pro.photoUrl} alt={pro.name} className="w-full h-full object-cover" />
                                    </div>
                                    <span className={`text-xs font-bold truncate max-w-[80px] ${selectedProId === pro.id ? 'text-orange-600' : 'text-slate-600'}`}>
                                        {pro.name.split(' ')[0]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedProId ? (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold flex items-center gap-2 text-slate-900"><Clock size={18} /> Horários de Atendimento</h3>
                                <button 
                                    onClick={handleSaveSchedule}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Salvar Alterações'}
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                {Object.entries(schedule).map(([key, val]) => {
                                    const day = val as DaySchedule;
                                    return (
                                        <div key={key} className="flex flex-col md:flex-row md:items-center gap-4 pb-4 border-b border-slate-100 last:border-0">
                                            <div className="w-32">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={day.active} 
                                                        onChange={() => toggleDay(key as keyof WorkSchedule)} 
                                                        className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500 bg-white" 
                                                    />
                                                    <span className={`font-medium ${day.active ? 'text-slate-900' : 'text-slate-400'}`}>{daysMap[key]}</span>
                                                </label>
                                            </div>
                                            {day.active ? (
                                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <input type="time" value={day.start} onChange={e => updateDayTime(key as keyof WorkSchedule, 'start', e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-orange-500 outline-none" />
                                                        <span className="text-slate-400">até</span>
                                                        <input type="time" value={day.end} onChange={e => updateDayTime(key as keyof WorkSchedule, 'end', e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-orange-500 outline-none" />
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-0 md:ml-4">
                                                        <span className="text-slate-400">Almoço:</span>
                                                        <input type="time" value={day.lunchStart} onChange={e => updateDayTime(key as keyof WorkSchedule, 'lunchStart', e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-orange-500 outline-none" />
                                                        <span className="text-slate-400">-</span>
                                                        <input type="time" value={day.lunchEnd} onChange={e => updateDayTime(key as keyof WorkSchedule, 'lunchEnd', e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:border-orange-500 outline-none" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm italic">Não atende neste dia</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                            <Clock size={48} className="text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">Selecione um profissional para gerenciar seus horários.</p>
                        </div>
                    )}
                </div>
            )}

            {subTab === 'blocks' && (
                <div className="max-w-4xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Form Column */}
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900"><X size={18} className="text-red-500" /> Adicionar Bloqueio</h3>
                                <form onSubmit={handleAddBlock} className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-slate-500 mb-1">Profissional</label>
                                        <select 
                                            required
                                            value={selectedProId} 
                                            onChange={(e) => setSelectedProId(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500"
                                        >
                                            <option value="">Selecione um profissional...</option>
                                            {professionals.map(pro => (
                                                <option key={pro.id} value={pro.id}>{pro.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-500 mb-1">Data</label>
                                        <input required type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-slate-500 mb-1">Início</label>
                                            <input required type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500" />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-500 mb-1">Fim</label>
                                            <input required type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-500 mb-1">Motivo</label>
                                        <input required type="text" value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Ex: Folga, Médico, Almoço estendido" className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500" />
                                    </div>
                                    <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-orange-500/20">
                                        Bloquear Horário
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* List Column */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900"><Trash2 size={18} className="text-slate-400" /> Bloqueios Ativos</h3>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {blockedSlots.length === 0 ? (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                                        <p className="text-slate-400 italic">Nenhum horário bloqueado no momento.</p>
                                    </div>
                                ) : (
                                    blockedSlots
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                        .map(b => {
                                            const pro = professionals.find(p => p.id === b.professionalId);
                                            return (
                                                <div key={b.id} className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center group hover:border-slate-300 transition-all shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                                            {pro?.photoUrl ? <img src={pro.photoUrl} className="w-full h-full object-cover" /> : <Loader2 size={16} className="text-slate-300" />}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900">{pro?.name || 'Profissional Removido'}</div>
                                                            <div className="text-xs text-orange-500 font-medium">
                                                                {new Date(b.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-1">
                                                                {b.startTime} às {b.endTime} • <span className="italic">{b.reason}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveBlock(b.id)} 
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Remover Bloqueio"
                                                    >
                                                        <Trash2 size={18}/>
                                                    </button>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsFormOpen(false)}>
                <div className="bg-white p-6 rounded-xl border border-slate-200 animate-scale-up max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Editar Profissional' : 'Novo Profissional'}</h3>
                        <button onClick={() => setIsFormOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                     </div>
                     <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-500 mb-1">Nome Completo</label>
                                <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500" placeholder="Ex: Carlos Silva" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-500 mb-1">Especialidade/Cargo</label>
                                <input required value={role} onChange={e => setRole(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500" placeholder="Ex: Master Barber" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-500 mb-1">Email de Acesso (Opcional)</label>
                                <input 
                                    type="email"
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500" 
                                    placeholder="barbeiro@exemplo.com" 
                                />
                                <p className="text-xs text-slate-400 mt-1">Se preenchido, o barbeiro poderá fazer login.</p>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-500 mb-1">WhatsApp do Profissional (Opcional)</label>
                                <input 
                                    type="tel"
                                    value={phone} 
                                    onChange={e => setPhone(e.target.value)} 
                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500" 
                                    placeholder="5511999999999" 
                                />
                                <p className="text-xs text-slate-400 mt-1">Para receber notificações de novos agendamentos.</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-500 mb-1">Comissão (%)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    required
                                    value={commission} 
                                    onChange={e => setCommission(e.target.value)} 
                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-900 focus:outline-none focus:border-orange-500" 
                                    placeholder="Ex: 50" 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-500 mb-2">Cor na Agenda</label>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    '#f97316', '#3b82f6', '#10b981', '#8b5cf6', 
                                    '#ec4899', '#06b6d4', '#f59e0b', '#ef4444',
                                    '#84cc16', '#a855f7', '#0ea5e9', '#14b8a6'
                                ].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center color-picker-btn ${color === c ? 'border-slate-900 scale-110 shadow-md' : 'border-slate-200'}`}
                                        style={{ backgroundColor: c }}
                                    >
                                        {color === c && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                                    </button>
                                ))}
                                <div className="relative">
                                    <input 
                                        type="color" 
                                        value={color} 
                                        onChange={e => setColor(e.target.value)}
                                        className="w-10 h-10 rounded-full bg-transparent border-2 border-slate-200 cursor-pointer overflow-hidden p-0"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-500 mb-1">Foto do Perfil</label>
                            <div className="flex items-center gap-4">
                                <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-16 h-16 bg-slate-50 rounded-full border border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-orange-500 overflow-hidden relative ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {isUploading ? <Loader2 size={24} className="text-orange-500 animate-spin" /> : (photo ? <img src={photo} alt="Preview" className="w-full h-full object-cover" /> : <Upload size={20} className="text-slate-400" />)}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" disabled={isUploading} />
                                <span className="text-sm text-slate-500">{isUploading ? 'Enviando...' : 'Clique para carregar uma foto'}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                             <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700" disabled={isUploading || isSaving}>Cancelar</button>
                             <button type="submit" className="px-6 py-2 rounded-lg text-white flex items-center gap-2" style={{ backgroundColor: settings.primaryColor }} disabled={isUploading || isSaving}>
                                {(isUploading || isSaving) && <Loader2 size={16} className="animate-spin"/>} Salvar
                             </button>
                        </div>
                     </form>
                </div>
                </div>
            )}
        </div>
    );
};