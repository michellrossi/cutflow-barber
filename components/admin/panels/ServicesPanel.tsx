import React, { useState } from 'react';
import { useShop } from '../../../store';
import { Service } from '../../../types';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import { Plus, Edit2, Trash2, CalendarCheck, Loader2, X, Clock } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

export const ServicesPanel: React.FC = () => {
    const { services, addService, updateService, removeService, settings } = useShop();
    const { showToast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', price: '', duration: '', category: 'Cortes' });
    const [isSaving, setIsSaving] = useState(false);

    // Categorias disponíveis
    const CATEGORIES = ['Cortes', 'Barba', 'Combos', 'Química', 'Estética', 'Outros'];

    // CATALOGO PRE-DEFINIDO
    const CATALOG = [
        { name: 'Acabamento ("pézinho")', category: 'Cortes' },
        { name: 'Barba Completa', category: 'Barba' },
        { name: 'Coloração/Descoloração', category: 'Química' },
        { name: 'Combo Corte e Barba', category: 'Combos' },
        { name: 'Corte Infantil', category: 'Cortes' },
        { name: 'Corte Masculino', category: 'Cortes' },
        { name: 'Design de Sobrancelha', category: 'Estética' },
        { name: 'Hidratação e Reconstrução', category: 'Química' },
        { name: 'Limpeza de Pele', category: 'Estética' },
        { name: 'Luzes', category: 'Química' },
        { name: 'Nano Botox Capilar', category: 'Química' },
        { name: 'Nano Progressiva', category: 'Química' },
        { name: 'Penteado', category: 'Outros' },
        { name: 'Pigmentação/Camuflagem', category: 'Barba' },
        { name: 'Platinado', category: 'Química' },
        { name: 'Relaxamento/Progressiva', category: 'Química' }
    ];

    // Lógica de Agrupamento
    const groupedServices = services.reduce((acc, service) => {
        const cat = service.category || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(service);
        return acc;
    }, {} as Record<string, Service[]>);

    const handleEdit = (service: Service) => {
        setEditingId(service.id);
        setFormData({
            name: service.name,
            description: service.description,
            price: service.price.toString(),
            duration: service.duration.toString(),
            category: service.category || 'Cortes'
        });
        setIsFormOpen(true);
    };

    const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedName = e.target.value;
        if (!selectedName) return;

        const template = CATALOG.find(item => item.name === selectedName);
        if (template) {
            setFormData(prev => ({
                ...prev,
                name: template.name,
                category: template.category,
                description: prev.description || template.name 
            }));
        }
    };

    const confirmDelete = async () => {
        if (deleteId) {
            const { success, error } = await removeService(deleteId);
            if (success) {
                showToast('Serviço removido com sucesso!');
                setDeleteId(null);
            } else {
                showToast(error || 'Erro ao remover serviço.', 'error');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const serviceData = {
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            duration: Number(formData.duration),
            category: formData.category
        };

        let result;
        if (editingId) {
            result = await updateService(editingId, serviceData);
        } else {
            result = await addService(serviceData);
        }

        setIsSaving(false);

        if (result.success) {
            showToast(editingId ? 'Serviço atualizado!' : 'Serviço criado!');
            setIsFormOpen(false);
            setEditingId(null);
            setFormData({ name: '', description: '', price: '', duration: '', category: 'Cortes' });
        } else {
            showToast(result.error || 'Erro ao salvar.', 'error');
        }
    };

    return (
        <div>
            <ConfirmationModal 
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Remover Serviço"
                message="Tem certeza que deseja remover este serviço? Ele não aparecerá mais para agendamentos."
                confirmText="Remover"
                isDestructive
            />

             <div className="flex justify-between mb-8">
                <p className="text-slate-400">Adicione, edite ou remova serviços oferecidos.</p>
                <button onClick={() => { setIsFormOpen(true); setEditingId(null); setFormData({ name: '', description: '', price: '', duration: '', category: 'Cortes' }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90" style={{ backgroundColor: settings.primaryColor }}>
                    <Plus size={18} /> Adicionar Serviço
                </button>
            </div>

            {isFormOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsFormOpen(false)}>
                 <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-scale-up w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                     <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold">{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                        <button onClick={() => setIsFormOpen(false)}><X size={24} className="text-slate-400 hover:text-white"/></button>
                     </div>
                     
                     {!editingId && (
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-xs text-slate-400 uppercase font-bold">Catálogo Rápido:</span>
                                <select 
                                    onChange={handleTemplateSelect}
                                    className="bg-slate-900 border border-slate-600 text-slate-300 text-sm rounded-lg p-2 focus:outline-none focus:border-orange-500"
                                >
                                    <option value="">-- Selecione --</option>
                                    {CATALOG.map((item, idx) => (
                                        <option key={idx} value={item.name}>{item.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                     <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm text-slate-400 mb-1">Nome do Serviço</label>
                                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" placeholder="Ex: Corte Masculino"/>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Duração (minutos)</label>
                                <input required type="number" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" placeholder="30" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Preço (R$)</label>
                                <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Descrição Curta</label>
                                <input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500" placeholder="Breve detalhe do serviço" />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Categoria</label>
                            <div className="flex gap-2 flex-wrap mb-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setFormData({...formData, category: cat})}
                                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${formData.category === cat ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                             <input 
                                value={formData.category} 
                                onChange={e => setFormData({...formData, category: e.target.value})} 
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none" 
                                placeholder="Ou digite uma nova categoria..."
                            />
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                             <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white" disabled={isSaving}>Cancelar</button>
                             <button type="submit" className="px-6 py-2 rounded-lg text-white flex items-center gap-2" style={{ backgroundColor: settings.primaryColor }} disabled={isSaving}>
                                {isSaving && <Loader2 size={16} className="animate-spin"/>} Salvar
                             </button>
                        </div>
                     </form>
                 </div>
                 </div>
            )}

            <div className="space-y-12">
                {Object.entries(groupedServices).map(([category, items]) => (
                    <div key={category}>
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <span className="w-1.5 h-6 rounded-full bg-orange-500 block"></span>
                            {category}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {(items as Service[]).map(service => (
                                <div key={service.id} className="bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col overflow-hidden group hover:border-slate-600 transition-all w-full max-w-[180px] mx-auto min-h-[240px]">
                                    {/* Top Area: Duration Badge */}
                                    <div className="h-20 w-full bg-slate-900/40 flex items-center justify-center relative">
                                        <div className="absolute top-2 right-2 bg-slate-900/60 text-orange-400 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
            <Clock size={10}/>
                                            {service.duration} min
                                        </div>
                                        <CalendarCheck size={24} className="text-slate-600 group-hover:text-orange-500/50 transition-colors" />
    </div>

                                    {/* Bottom Area: Info */}
                                    <div className="p-4 flex flex-col flex-1 text-center">
        <h3 className="font-bold text-white text-sm leading-tight mb-1 truncate">{service.name}</h3>
        <p className="text-[10px] text-slate-500 line-clamp-2 mb-3 h-8">{service.description}</p>

        <div className="mt-auto">
            <p className="text-lg font-bold text-orange-500 mb-3">
                R$ {service.price.toFixed(2)}
            </p>

            <div className="flex gap-2">
                <button onClick={() => handleEdit(service)} className="flex-1 py-1.5 bg-slate-700 rounded-lg text-slate-300 hover:text-white text-[10px] font-medium transition-colors">
                    Editar
                </button>
                <button onClick={() => setDeleteId(service.id)} className="px-2 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors">
                    <Trash2 size={14}/>
                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};