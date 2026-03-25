import React, { useState, useRef } from 'react';
import { useShop } from '../../../store';
import { supabase } from '../../../supabaseClient';
import { Service } from '../../../types';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import { Plus, Edit2, Trash2, CalendarCheck, Loader2, X, Clock, Image as ImageIcon, Sparkles, Upload } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

export const ServicesPanel: React.FC = () => {
    const { services, addService, updateService, removeService, settings } = useShop();
    const { showToast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ 
        name: '', 
        description: '', 
        price: '', 
        duration: '', 
        category: 'Cortes',
        imageUrl: '' 
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Categorias disponíveis
    const CATEGORIES = ['Cortes', 'Barba', 'Combos', 'Química', 'Estética', 'Outros'];

    const generateAIImage = async () => {
        if (!formData.name) {
            showToast('Digite o nome do serviço primeiro!', 'error');
            return;
        }

        setIsGeneratingImage(true);
        try {
            const response = await fetch('/api/ai/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceName: formData.name })
            });

            const data = await response.json();
            if (data.success) {
                // A imagem vem em base64. Vamos converter para Blob manualmente para evitar erro de CSP com fetch
                const base64Data = data.image.split(',')[1];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'image/png' });
                
                const fileName = `ai_${Date.now()}.png`;
                const filePath = `services/${fileName}`;
                
                const { error: uploadError } = await supabase.storage.from('images').upload(filePath, blob, {
                    contentType: 'image/png'
                });

                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('images').getPublicUrl(filePath);
                setFormData(prev => ({ ...prev, imageUrl: urlData.publicUrl }));
                showToast('Imagem gerada com IA e salva com sucesso!');
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            console.error("Erro ao gerar imagem:", error);
            showToast('Erro ao gerar imagem com IA.', 'error');
        } finally {
            setIsGeneratingImage(false);
        }
    };

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `services/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data } = supabase.storage.from('images').getPublicUrl(filePath);
                setFormData(prev => ({ ...prev, imageUrl: data.publicUrl }));
                showToast('Foto do serviço enviada com sucesso!');
            } catch (error) {
                console.error("Erro no upload:", error);
                showToast('Erro ao fazer upload da imagem.', 'error');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleEdit = (service: Service) => {
        setEditingId(service.id);
        setFormData({
            name: service.name,
            description: service.description,
            price: service.price.toString(),
            duration: service.duration.toString(),
            category: service.category || 'Cortes',
            imageUrl: service.imageUrl || ''
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
            category: formData.category,
            imageUrl: formData.imageUrl || undefined
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
            setFormData({ name: '', description: '', price: '', duration: '', category: 'Cortes', imageUrl: '' });
        } else {
            showToast(result.error || 'Erro ao salvar.', 'error');
        }
    };

    return (
        <div className="animate-fade-in">
            <ConfirmationModal 
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Remover Serviço"
                message="Tem certeza que deseja remover este serviço? Ele não aparecerá mais para agendamentos."
                confirmText="Remover"
                isDestructive
            />

             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">Gestão de Serviços</h2>
                    <p className="text-slate-400">Adicione, edite ou remova serviços oferecidos.</p>
                </div>
                <button 
                    onClick={() => { 
                        setIsFormOpen(true); 
                        setEditingId(null); 
                        setFormData({ name: '', description: '', price: '', duration: '', category: 'Cortes', imageUrl: '' }); 
                    }} 
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold shadow-lg hover:brightness-110 transition-all" 
                    style={{ backgroundColor: settings.primaryColor }}
                >
                    <Plus size={20} /> Adicionar Serviço
                </button>
            </div>

            {isFormOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsFormOpen(false)}>
                 <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 animate-scale-up w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                     <div className="flex justify-between items-start mb-6">
                        <h3 className="text-xl font-bold text-white">{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                        <button onClick={() => setIsFormOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                     </div>
                     
                     {!editingId && (
                            <div className="flex items-center gap-3 mb-8 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                                <Sparkles size={18} className="text-orange-500" />
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Catálogo Rápido</p>
                                    <select 
                                        onChange={handleTemplateSelect}
                                        className="w-full bg-transparent text-slate-300 text-sm font-medium focus:outline-none cursor-pointer"
                                    >
                                        <option value="" className="bg-slate-800">Selecione um serviço pré-definido...</option>
                                        {CATALOG.map((item, idx) => (
                                            <option key={idx} value={item.name} className="bg-slate-800">{item.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                     <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nome do Serviço</label>
                                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500 font-bold" placeholder="Ex: Corte Masculino"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Duração (minutos)</label>
                                <div className="relative">
                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input required type="number" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-12 text-white focus:outline-none focus:border-orange-500 font-bold" placeholder="30" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Preço (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
                                    <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-12 text-white focus:outline-none focus:border-orange-500 font-bold" placeholder="0.00" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Foto do Serviço</label>
                                <div className="flex items-center gap-4">
                                    <div 
                                        onClick={() => !isUploading && !isGeneratingImage && fileInputRef.current?.click()} 
                                        className={`w-16 h-16 bg-slate-900 rounded-xl border border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-orange-500 overflow-hidden relative ${(isUploading || isGeneratingImage) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {(isUploading || isGeneratingImage) ? (
                                            <Loader2 size={24} className="text-orange-500 animate-spin" />
                                        ) : (
                                            formData.imageUrl ? (
                                                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Upload size={20} className="text-slate-500" />
                                            )
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" disabled={isUploading || isGeneratingImage} />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-slate-500">{isUploading ? 'Enviando...' : isGeneratingImage ? 'Gerando com IA...' : 'Carregar foto'}</p>
                                            {!isUploading && !isGeneratingImage && (
                                                <button 
                                                    type="button"
                                                    onClick={generateAIImage}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-500 text-[10px] font-bold hover:bg-orange-500/20 transition-all"
                                                >
                                                    <Sparkles size={12} /> Gerar com IA
                                                </button>
                                            )}
                                        </div>
                                        {formData.imageUrl && !isGeneratingImage && (
                                            <button 
                                                type="button" 
                                                onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                                className="text-[10px] text-red-500 hover:underline mt-1"
                                            >
                                                Remover foto
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Descrição do Serviço</label>
                            <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500 min-h-[100px] resize-none" placeholder="Descreva os detalhes do serviço..." />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Categoria</label>
                            <div className="flex gap-2 flex-wrap mb-3">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setFormData({...formData, category: cat})}
                                        className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${formData.category === cat ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                             <input 
                                value={formData.category} 
                                onChange={e => setFormData({...formData, category: e.target.value})} 
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500" 
                                placeholder="Ou digite uma nova categoria..."
                            />
                        </div>

                        <div className="flex gap-4 justify-end pt-4">
                             <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 text-slate-400 font-bold hover:text-white transition-colors" disabled={isUploading || isSaving}>Cancelar</button>
                             <button type="submit" className="px-10 py-3 rounded-xl text-white font-bold flex items-center gap-2 shadow-lg hover:brightness-110 transition-all" style={{ backgroundColor: settings.primaryColor }} disabled={isUploading || isSaving}>
                                {(isUploading || isSaving) ? <Loader2 size={20} className="animate-spin"/> : 'Salvar Serviço'}
                             </button>
                        </div>
                     </form>
                 </div>
                 </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {services.map(service => (
                    <div key={service.id} className="bg-slate-800/40 rounded-[2rem] border border-slate-700 flex flex-col overflow-hidden group hover:border-slate-600 transition-all shadow-xl">
                        {/* Imagem do Serviço */}
                        <div className="h-48 w-full relative overflow-hidden">
                            {service.imageUrl ? (
                                <img 
                                    src={service.imageUrl} 
                                    alt={service.name} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                                    <CalendarCheck size={48} className="text-slate-700" />
                                </div>
                            )}
                            {/* Badge de Duração */}
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-orange-400 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10">
                                <Clock size={12}/>
                                {service.duration} min
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="p-6 flex flex-col flex-1">
                            <h3 className="font-bold text-white text-lg leading-tight mb-2">{service.name}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2 mb-6 min-h-[2rem] leading-relaxed">{service.description}</p>

                            <div className="mt-auto">
                                <p className="text-2xl font-bold text-orange-500 mb-6">
                                    R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleEdit(service)} 
                                        className="flex-1 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-all font-bold text-sm flex items-center justify-center gap-2"
                                    >
                                        <Edit2 size={14} /> Editar
                                    </button>
                                    <button 
                                        onClick={() => setDeleteId(service.id)} 
                                        className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Card de Adicionar Mais Serviços */}
                <button 
                    onClick={() => { 
                        setIsFormOpen(true); 
                        setEditingId(null); 
                        setFormData({ name: '', description: '', price: '', duration: '', category: 'Cortes', imageUrl: '' }); 
                    }}
                    className="bg-slate-800/20 rounded-[2rem] border-2 border-dashed border-slate-700 p-8 flex flex-col items-center justify-center gap-6 hover:border-slate-500 hover:bg-slate-800/30 transition-all min-h-[400px] group"
                >
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-orange-500 group-hover:scale-110 transition-all shadow-xl">
                        <Plus size={32} />
                    </div>
                    <div className="text-center max-w-[200px]">
                        <p className="text-xl font-bold text-white mb-2">Adicionar mais serviços?</p>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Expanda seu faturamento adicionando serviços como Pigmentação, Limpeza de Pele ou Relaxamento.
                        </p>
                    </div>
                    <span className="text-orange-500 text-xs font-bold uppercase tracking-widest hover:underline">
                        Ver sugestões de serviços lucrativos
                    </span>
                </button>
            </div>
        </div>
    );
};
