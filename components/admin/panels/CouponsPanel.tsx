import React, { useState } from 'react';
import { useShop } from '../../../store';
import { Coupon } from '../../../types';
import { ConfirmationModal } from '../../ui/ConfirmationModal';
import { Plus, Tag, X, Loader2, Edit2, Trash2, Ticket } from 'lucide-react';
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
                        <div className="w-full md:w-48">
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

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                {coupons.map(coupon => (
                    <div key={coupon.id} className="bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col overflow-hidden group hover:border-slate-600 transition-all w-full max-w-[160px] min-h-[240px]">
                        {/* Top Area: Discount Badge */}
                        <div className="h-20 w-full bg-slate-900/40 flex items-center justify-center relative">
                            <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-[9px] font-bold border ${coupon.active ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-red-500/30 text-red-500 bg-red-500/10'}`}>
                                {coupon.active ? 'ATIVO' : 'INATIVO'}
                            </div>
                            <Ticket size={24} className="text-slate-600 group-hover:text-orange-500/50 transition-colors" />
                        </div>

                        {/* Bottom Area: Info */}
                        <div className="p-4 flex flex-col flex-1 text-center">
                            <h3 className="font-bold text-white text-sm leading-tight mb-1 truncate tracking-wider uppercase">{coupon.code}</h3>
                            <p className="text-[10px] text-slate-500 mb-3 h-8">
                                Usado {coupon.usageCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''}
                            </p>

                            <div className="mt-auto">
                                <p className="text-lg font-bold text-orange-500 mb-3">
                                    {coupon.type === 'percentage' ? `${coupon.value}%` : `R$ ${coupon.value.toFixed(0)}`}
                                </p>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleEdit(coupon)} 
                                        className="flex-1 py-1.5 bg-slate-700 rounded-lg text-slate-300 hover:text-white text-[10px] font-medium transition-colors flex items-center justify-center"
                                    >
                                        <Edit2 size={12} className="mr-1" /> Editar
                                    </button>
                                    <button 
                                        onClick={() => setDeleteId(coupon.id)} 
                                        className="px-2 py-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};