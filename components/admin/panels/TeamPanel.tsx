import React, { useState, useRef } from 'react';
import { useShop } from '../../../store';
import { supabase } from '../../../supabaseClient';
import { Professional, WorkSchedule, DaySchedule } from '../../../types';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import { Plus, Trash2, Edit2, Upload, Loader2, Clock, X } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

const DEFAULT_DAY: DaySchedule = { start: '09:00', end: '19:00', lunchStart: '12:00', lunchEnd: '13:00', active: true };

export const TeamPanel: React.FC = () => {
    const { professionals, addProfessional, updateProfessional, removeProfessional, blockedSlots, addBlockedSlot, removeBlockedSlot, settings } = useShop();
    const { showToast } = useToast();
    
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
    const [commission, setCommission] = useState('50'); // Default 50%
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
        setCommission(pro.commissionPercentage ? pro.commissionPercentage.toString() : '50');
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
            photoUrl: photo || 'https://picsum.photos/200', 
            workSchedule: schedule,
            commissionPercentage: Number(commission)
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
            setName(''); setRole(''); setEmail(''); setPhoto(null); setCommission('50');
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
        <div>
            <ConfirmationModal 
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Remover Profissional"
                message="Tem certeza que deseja remover este profissional? Esta ação não pode ser desfeita."
                confirmText="Remover"
                isDestructive
            />

            {/* Modal de Bloqueios */}
            {isBlockModalOpen && selectedProForBlock && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => e.target === e.currentTarget && setIsBlockModalOpen(false)}
                >
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 w-full max-w-md shadow-2xl relative animate-scale-up">
                        <button onClick={() => setIsBlockModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
                        <h3 className="text-lg font-bold text-white mb-4">Gerenciar Bloqueios: {selectedProForBlock.name.split(' ')[0]}</h3>
                        
                        <div className="mb-6 bg-slate-900/50 rounded-lg p-3 max-h-40 overflow-y-auto border border-slate-700">
                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Bloqueios Ativos</h4>
                            {blockedSlots.filter(b => b.professionalId === selectedProForBlock.id).length === 0 ? (
                                <p className="text-sm text-slate-500 italic">Nenhum bloqueio cadastrado.</p>
                            ) : (
                                <div className="space-y-2">
                                    {blockedSlots.filter(b => b.professionalId === selectedProForBlock.id).map(b => (
                                        <div key={b.id} className="flex justify-between items-center bg-slate-800 p-2 rounded border border-slate-700">
                                            <div>
                                                <div className="text-sm text-white font-medium">{new Date(b.date + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                                                <div className="text-xs text-slate-400">{b.startTime} - {b.endTime} • {b.reason}</div>
                                            </div>
                                            <button onClick={() => handleRemoveBlock(b.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleAddBlock} className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Adicionar Novo</h4>
                            <input required type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
                            <div className="flex gap-2">
                                <input required type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
                                <span className="text-slate-400 self-center">-</span>
                                <input required type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
                            </div>
                            <input required type="text" value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Motivo (ex: Médico)" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" />
                            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 rounded-lg text-sm">Adicionar Bloqueio</button>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex justify-between mb-8">
                <p className="text-slate-400">Adicione, edite ou remova profissionais da sua equipe.</p>
                <button onClick={() => { setIsFormOpen(true); setEditingId(null); setName(''); setRole(''); setEmail(''); setCommission('50'); setPhoto(null); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: settings.primaryColor }}>
                    <Plus size={18} /> Adicionar Profissional
                </button>
            </div>

            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsFormOpen(false)}>
                <div className="mb-8 bg-slate-800 p-6 rounded-xl border border-slate-700 animate-scale-up max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">{editingId ? 'Editar Profissional' : 'Novo Profissional'}</h3>
                        <button onClick={() => setIsFormOpen(false)}><X size={24} className="text-slate-400 hover:text-white"/></button>
                     </div>
                     <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Nome Completo</label>
                                <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" placeholder="Ex: Carlos Silva" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Especialidade/Cargo</label>
                                <input required value={role} onChange={e => setRole(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" placeholder="Ex: Master Barber" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Email de Acesso (Opcional)</label>
                                <input 
                                    type="email"
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" 
                                    placeholder="barbeiro@exemplo.com" 
                                />
                                <p className="text-xs text-slate-500 mt-1">Se preenchido, o barbeiro poderá fazer login.</p>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Comissão (%)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    max="100"
                                    required
                                    value={commission} 
                                    onChange={e => setCommission(e.target.value)} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" 
                                    placeholder="Ex: 50" 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Foto do Perfil</label>
                            <div className="flex items-center gap-4">
                                <div onClick={() => !isUploading && fileInputRef.current?.click()} className={`w-16 h-16 bg-slate-900 rounded-full border border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-orange-500 overflow-hidden relative ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {isUploading ? <Loader2 size={24} className="text-orange-500 animate-spin" /> : (photo ? <img src={photo} alt="Preview" className="w-full h-full object-cover" /> : <Upload size={20} className="text-slate-500" />)}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" disabled={isUploading} />
                                <span className="text-sm text-slate-500">{isUploading ? 'Enviando...' : 'Clique para carregar uma foto'}</span>
                            </div>
                        </div>
                        
                        <div className="border border-slate-700 rounded-lg overflow-hidden">
                             <button type="button" onClick={() => setIsScheduleOpen(!isScheduleOpen)} className="w-full bg-slate-800/50 p-3 flex justify-between items-center text-left hover:bg-slate-700 transition-colors">
                                 <span className="font-medium flex items-center gap-2"><Clock size={16} /> Horários de Atendimento</span>
                                 <span className="text-xs text-slate-400">{isScheduleOpen ? 'Recolher' : 'Configurar'}</span>
                             </button>
                             {isScheduleOpen && (
                                 <div className="p-4 bg-slate-900/50 space-y-3">
                                     {Object.entries(schedule).map(([key, val]) => {
                                         const day = val as DaySchedule;
                                         return (
                                             <div key={key} className="flex flex-col md:flex-row md:items-center gap-3 pb-3 border-b border-slate-800 last:border-0">
                                                 <div className="w-24">
                                                     <label className="flex items-center gap-2 cursor-pointer">
                                                         <input type="checkbox" checked={day.active} onChange={() => toggleDay(key as keyof WorkSchedule)} className="rounded border-slate-600 text-orange-500 focus:ring-orange-500 bg-slate-800" />
                                                         <span className={day.active ? 'text-white' : 'text-slate-500'}>{daysMap[key]}</span>
                                                     </label>
                                                 </div>
                                                 {day.active && (
                                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                                        <input type="time" value={day.start} onChange={e => updateDayTime(key as keyof WorkSchedule, 'start', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white" />
                                                        <span className="text-slate-500">até</span>
                                                        <input type="time" value={day.end} onChange={e => updateDayTime(key as keyof WorkSchedule, 'end', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white" />
                                                        <span className="text-slate-500 ml-2">Almoço:</span>
                                                        <input type="time" value={day.lunchStart} onChange={e => updateDayTime(key as keyof WorkSchedule, 'lunchStart', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white" />
                                                        <span className="text-slate-500">-</span>
                                                        <input type="time" value={day.lunchEnd} onChange={e => updateDayTime(key as keyof WorkSchedule, 'lunchEnd', e.target.value)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white" />
                                                    </div>
                                                 )}
                                             </div>
                                         );
                                     })}
                                 </div>
                             )}
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                             <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white" disabled={isUploading || isSaving}>Cancelar</button>
                             <button type="submit" className="px-6 py-2 rounded-lg text-white flex items-center gap-2" style={{ backgroundColor: settings.primaryColor }} disabled={isUploading || isSaving}>
                                {(isUploading || isSaving) && <Loader2 size={16} className="animate-spin"/>} Salvar
                             </button>
                        </div>
                     </form>
                </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {professionals.map(pro => (
                    <div key={pro.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-colors flex flex-col items-center text-center">
                        <img src={pro.photoUrl} alt={pro.name} className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-slate-600" />
                        <h3 className="font-bold text-lg">{pro.name}</h3>
                        <p className="text-slate-400 text-sm">{pro.role}</p>
                        <p className="text-xs text-orange-500 mt-1 font-bold">Comissão: {pro.commissionPercentage ?? 50}%</p>
                        {pro.email && <p className="text-xs text-blue-400 mt-1 mb-2">{pro.email}</p>}
                        
                        <div className="w-full mt-4 space-y-2">
                            <button type="button" onClick={() => { setSelectedProForBlock(pro); setIsBlockModalOpen(true); }} className="w-full py-2 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 flex items-center justify-center gap-2 text-sm">
                                <Clock size={14}/> Bloqueios
                            </button>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => handleEdit(pro)} className="flex-1 py-2 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 flex items-center justify-center gap-2 text-sm"><Edit2 size={14}/> Editar</button>
                                <button type="button" onClick={() => setDeleteId(pro.id)} className="flex-1 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 flex items-center justify-center gap-2 text-sm"><Trash2 size={14}/> Excluir</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};