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
        type: 'percentage' | 'fixed'
    }>({ code: '', value: '', type: 'percentage' });

    const handleEdit = (coupon: Coupon) => {
        setEditingId(coupon.id);
        setFormData({
            code: coupon.code,
            value: coupon.value.toString(),
            type: coupon.type
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
            active: true
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
            setFormData({ code: '', value: '', type: 'percentage' });
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
                <button onClick={() => { setIsFormOpen(true); setEditingId(null); setFormData({ code: '', value: '', type: 'percentage' }); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90" style={{ backgroundColor: settings.primaryColor }}>
                    <Plus size={18} /> Criar Cupom
                </button>
            </div>

            {isFormOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsFormOpen(false)}>
                 <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-scale-up relative w-full max-w-2xl">
                     <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                     <h3 className="text-lg font-bold mb-4">{editingId ? 'Editar Cupom' : 'Novo Cupom'}</h3>
                     <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm text-slate-400 mb-1">Código</label>
                            <input required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none uppercase" placeholder="Ex: VERAO10" />
                        </div>
                        <div className="w-full md:w-40">
                             <label className="block text-sm text-slate-400 mb-1">Tipo</label>
                             <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none">
                                <option value="percentage">Porcentagem (%)</option>
                                <option value="fixed">Fixo (R$)</option>
                             </select>
                        </div>
                        <div className="w-full md:w-32">
                            <label className="block text-sm text-slate-400 mb-1">Valor</label>
                            <input required type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none" />
                        </div>
                        <button type="submit" className="w-full md:w-auto px-6 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2" style={{ backgroundColor: settings.primaryColor }} disabled={isSaving}>
                            {isSaving && <Loader2 size={16} className="animate-spin" />}
                            {editingId ? 'Salvar' : 'Criar'}
                        </button>
                     </form>
                 </div>
                 </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coupons.map(coupon => (
                    <div key={coupon.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Tag size={64} />
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                             <Tag size={16} className="text-slate-400" />
                             <span className="font-bold text-lg tracking-wider">{coupon.code}</span>
                        </div>
                        <div className="text-3xl font-bold mb-4" style={{ color: settings.primaryColor }}>
                            {coupon.type === 'percentage' ? `${coupon.value}%` : `R$ ${coupon.value.toFixed(2)}`}
                            <span className="text-sm text-slate-400 font-normal ml-2">de desconto</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-slate-400 mb-6">
                            <span>Usado {coupon.usageCount}x</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs border ${coupon.active ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-red-500/30 text-red-500'}`}>
                                {coupon.active ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                        <div className="flex gap-2">
                             <button type="button" onClick={() => handleEdit(coupon)} className="flex-1 py-2 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600">Editar</button>
                             <button type="button" onClick={() => setDeleteId(coupon.id)} className="flex-1 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20">Remover</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};