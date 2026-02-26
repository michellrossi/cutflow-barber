import React, { useState } from 'react';
import { useShop } from '../../../store';
import { Coupon } from '../../../types';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import { Plus, Tag, X, Loader2 } from 'lucide-react';
import { useToast } from '../../ui/ToastContext';

export const CouponsPanel: React.FC = () => {
    const { coupons, addCoupon, updateCoupon, removeCoupon, settings } = useShop();
    const { showToast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState<{
        code: string;
        value: string;
        type: 'percentage' | 'fixed';
        maxUses: string;
    }>({ code: '', value: '', type: 'percentage', maxUses: '' });

    const handleEdit = (coupon: Coupon) => {
        setEditingId(coupon.id);
        setFormData({
            code: coupon.code,
            value: coupon.value.toString(),
            type: coupon.type,
            maxUses: coupon.maxUses ? coupon.maxUses.toString() : ''
        });
        setIsFormOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            const { success, error } = await removeCoupon(deleteId);
            if (success) {
                showToast('Cupom removido com sucesso!');
                setDeleteId(null);
            } else {
                showToast(error || 'Erro ao remover cupom.', 'error');
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const couponData = {
            code: formData.code.toUpperCase(),
            value: Number(formData.value),
            type: formData.type,
            active: true,
            maxUses: formData.maxUses ? parseInt(formData.maxUses) : null
        };

        let result;
        if (editingId) {
            result = await updateCoupon(editingId, couponData);
        } else {
            result = await addCoupon(couponData);
        }

        setIsSaving(false);

        if (result.success) {
            showToast(editingId ? 'Cupom atualizado!' : 'Cupom criado!');
            setIsFormOpen(false);
            setEditingId(null);
            setFormData({ code: '', value: '', type: 'percentage', maxUses: '' });
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
                title="Remover Cupom"
                message="Tem certeza que deseja remover este cupom? Ele não poderá mais ser utilizado."
                confirmText="Remover"
                isDestructive
            />

            <div className="flex justify-between mb-8">
                <p className="text-slate-400">Gerencie cupons de desconto.</p>
                <button onClick={() => { setIsFormOpen(true); setEditingId(null); setFormData({ code: '', value: '', type: 'percentage', maxUses: '' }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90" style={{ backgroundColor: settings.primaryColor }}>
                    <Plus size={18} /> Criar Cupom
                </button>
            </div>

            {isFormOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsFormOpen(false)}>
                 <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-scale-up relative w-full max-w-2xl">
                     <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                     <h3 className="text-lg font-bold mb-4">{editingId ? 'Editar Cupom' : 'Novo Cupom'}</h3>
                     <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm text-slate-400 mb-1">Código</label>
                            <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none uppercase" placeholder="Ex: VERAO10" />
                        </div>
                        <div className="w-full md:w-32">
                             <label className="block text-sm text-slate-400 mb-1">Tipo</label>
                             <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none">
                                <option value="percentage">Porcentagem (%)</option>
                                <option value="fixed">Fixo (R$)</option>
                             </select>
                        </div>
                        <div className="w-full md:w-24">
                            <label className="block text-sm text-slate-400 mb-1">Valor</label>
                            <input required type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none" />
                        </div>
                         <div className="w-full md:w-32">
                            <label className="block text-sm text-slate-400 mb-1">Limite de Uso</label>
                            <input 
                                type="number" 
                                min="0"
                                value={formData.maxUses} 
                                onChange={e => setFormData({...formData, maxUses: e.target.value})} 
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none" 
                                placeholder="Ilimitado"
                            />
                        </div>
                        <button type="submit" className="w-full md:w-auto px-6 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2" style={{ backgroundColor: settings.primaryColor }} disabled={isSaving}>
                            {isSaving && <Loader2 size={16} className="animate-spin" />}
                            {editingId ? 'Salvar' : 'Criar'}
                        </button>
                     </form>
                 </div>
                 </div>
            )}

            {/* Grid com espaçamento reduzido e mais colunas */}
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
    {coupons.map(coupon => (
        <div 
            key={coupon.id} 
            className="bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col overflow-hidden group hover:border-slate-600 transition-all w-full max-w-[190px] shadow-lg"
        >
            {/* Cabeçalho do Card: Ícone e Badge de Status */}
            <div className="relative h-32 w-full bg-slate-900/40 flex items-center justify-center overflow-hidden">
                <div className="absolute top-2 right-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg ${coupon.active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                        {coupon.active ? 'ATIVO' : 'INATIVO'}
                    </span>
                </div>
                
                <div className="flex flex-col items-center">
                    <div className="p-3 bg-orange-500/10 rounded-full mb-2">
                        <Tag size={24} className="text-orange-500" />
                    </div>
                    <span className="text-xs font-mono font-bold text-white tracking-wider bg-slate-900 px-2 py-1 rounded border border-slate-700">
                        {coupon.code}
                    </span>
                </div>
                
                {/* Efeito decorativo de cupom */}
                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-slate-900 rounded-full" />
                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-slate-900 rounded-full" />
            </div>

            {/* Conteúdo do Card */}
            <div className="p-3 flex flex-col flex-1 text-center">
                <div className="mb-3">
                    <h3 className="text-xl font-black text-white leading-tight">
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `R$ ${coupon.discountValue}`}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                        de desconto
                    </p>
                </div>

                <div className="space-y-1 mb-4">
                    <p className="text-[10px] text-slate-500 line-clamp-1">
                        Uso: {coupon.usageCount} / {coupon.usageLimit || '∞'}
                    </p>
                </div>
                
                {/* Ações Compactas no rodapé */}
                <div className="mt-auto flex gap-1.5 justify-center">
                    <button 
                        onClick={() => handleEdit(coupon)} 
                        className="p-2 bg-slate-700/50 rounded-lg text-slate-300 hover:text-white hover:bg-slate-600 transition-colors"
                        title="Editar"
                    >
                        <Edit2 size={14}/>
                    </button>
                    <button 
                        onClick={() => toggleCouponStatus(coupon.id, coupon.active)} 
                        className={`p-2 rounded-lg transition-colors ${coupon.active ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20' : 'bg-slate-700/50 text-slate-400'}`}
                        title={coupon.active ? "Desativar" : "Ativar"}
                    >
                        <Power size={14}/>
                    </button>
                    <button 
                        onClick={() => setDeleteId(coupon.id)} 
                        className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                        title="Excluir"
                    >
                        <Trash2 size={14}/>
                    </button>
                </div>
            </div>
        </div>
    ))}

    {/* Card de Adicionar Novo (seguindo o mesmo padrão) */}
    <button 
        onClick={() => { setIsFormOpen(true); setEditingId(null); /* reset form */ }}
        className="bg-transparent rounded-2xl border-2 border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800/30 transition-all flex flex-col items-center justify-center text-center w-full max-w-[190px] min-h-[280px] group"
    >
        <div className="w-10 h-10 rounded-full bg-slate-800 group-hover:bg-slate-700 flex items-center justify-center mb-3 transition-colors">
            <Plus size={20} className="text-slate-400 group-hover:text-white" />
        </div>
        <h3 className="font-medium text-sm text-slate-300 group-hover:text-white transition-colors">Novo Cupom</h3>
    </button>
</div>